# Полный аудит: Feed Parser и структура БД — Live Grid

**Версия документа:** 1.0  
**Дата:** 2026-03-03  
**Область:** backend — приём фидов, маппинг, БД, pipeline.

---

## 1. Архитектура системы

### 1.1 Обзор

Система импорта данных недвижимости состоит из двух контуров:

| Контур | Назначение | Запись в БД |
|--------|------------|-------------|
| **Discovery / Analysis** | Скачивание сырых JSON, анализ схемы, отчёты | Опционально: `feed_raw_snapshots`, `feed_schema_analysis` |
| **Production Sync** | Загрузка справочников + потоковая загрузка квартир, upsert в рабочие таблицы | Да: regions, subways, builders, finishings, building_types, rooms, blocks, block_subway, buildings, apartments |

**Форматы:** только **JSON**. XML, CSV, REST API по другим контрактам не поддерживаются.

**Точки входа:** только **CLI** (Artisan). HTTP endpoints для приёма фидов в коде не предусмотрены.

---

### 1.2 Точки входа фидов

#### CLI-команды

| Команда | Файл | Назначение |
|---------|------|------------|
| `php artisan feed:sync [--dry-run]` | `App\Console\Commands\FeedSyncCommand` | **Основной production-импорт:** скачивание всех JSON-эндпоинтов, upsert справочников и квартир, soft-delete устаревших квартир, обновление агрегатов по блокам. |
| `php artisan feed:collect [--url=] [--force] [--dry-run] [--list]` | `FeedCollectCommand` | Скачивание сырых фидов в `storage/feed/raw/{md5(url)}/` без разбора и без записи в БД. |
| `php artisan feed:inspect [--url=] [--file=] [--no-relationships] [--dump-*]` | `FeedInspectCommand` | Анализ уже скачанных JSON: схема полей, граф связей, сохранение отчётов в `storage/feed/analysis/`. БД не используется. |
| `php artisan feed:discover [--url=] [--max-pages=] [--sample-size=] [--no-probe] [--no-region] [--no-relationships] [--dry-run]` | `FeedDiscoverCommand` | Полный цикл: обнаружение эндпоинтов, пагинация, верификация полноты, глубокая инспекция схемы, анализ связей, формирование `report.json`. БД не используется. |
| `php artisan feed:analyze [--url=] [--no-schema] [--no-save] [--dry-run] [--dump-schema] [--reset-schema]` | `FeedAnalyzeCommand` | Скачивание одного или всех эндпоинтов из конфига, сохранение снимка в `feed_raw_snapshots`, инспекция схемы в `feed_schema_analysis`. |

#### Очереди (Queue)

Очереди Laravel в обработке фидов **не участвуют**. Всё выполняется синхронно в процессе команды (в т.ч. `feed:sync`).

#### Где начинается обработка

- **Production-данные:** единственная точка входа — `FeedSyncCommand::handle()` → `FeedSyncService::sync()`.
- **Анализ/дискавери:** `FeedCollectCommand` / `FeedInspectCommand` / `FeedDiscoverCommand` / `FeedAnalyzeCommand` — каждая запускает свой pipeline (файлы и при необходимости таблицы `feed_*`).

---

### 1.3 Сервисы и зависимости

| Сервис | Файл | Роль |
|--------|------|------|
| `FeedSyncService` | `App\Services\Feed\FeedSyncService` | Оркестрация sync: загрузка reference-эндпоинтов, транзакционный upsert справочников и блоков/зданий, потоковая загрузка `apartments.json`, chunked upsert квартир, soft-delete, обновление агрегатов блоков, сброс кэша фильтров. |
| `FeedClient` | `App\Services\Feed\FeedClient` | HTTP GET к URL фида; повтор при сбоях (exponential backoff); опционально stream-download в файл (для apartments.json). |
| `FeedFileStorage` | `App\Services\Feed\FeedFileStorage` | Работа с `storage/feed/raw/` и `storage/feed/analysis/` (сохранение/чтение сырых JSON и артефактов анализа). |
| `FeedStorageService` | `App\Services\Feed\FeedStorageService` | Сохранение снимка в `feed_raw_snapshots`, подсчёт объектов, определение «изменился ли фид» по checksum. |
| `FeedAnalyzer` | `App\Services\Feed\FeedAnalyzer` | Оркестрация анализа одного URL: скачивание → сохранение снимка → инспекция схемы → возврат `FeedAnalysisResult`. |
| `FeedSchemaInspector` | (используется в FeedAnalyzer) | Рекурсивный обход JSON, заполнение карты полей для `feed_schema_analysis`. |
| `FeedSchemaMapper` | `App\Services\Feed\FeedSchemaMapper` | Анализ схемы (в контексте discover/inspect) — рекурсивный обход, сущности, типы. |
| `FeedRelationshipAnalyzer` | `App\Services\Feed\FeedRelationshipAnalyzer` | Построение графа сущностей и связей по результатам схемы. |
| `FeedReportBuilder` | `App\Services\Feed\FeedReportBuilder` | Сбор итогового отчёта discover (report.json). |
| `FeedDiscoveryService` | `App\Services\Feed\FeedDiscoveryService` | Обнаружение эндпоинтов, пагинация, проверка полноты. |

---

## 2. Форматы фидов

### 2.1 Протокол и формат

- **Транспорт:** HTTP(S) GET.
- **Формат тела ответа:** JSON (один объект или один массив на файл).
- **Версия формата:** в коде не версионируется; ожидаются имена полей и структура, заложенные в `FeedSyncService` и миграциях.

Конфигурация: `config/feed.php`. Эндпоинты задаются через `.env`:

- `FEED_ENDPOINT_PRIMARY` (обязательный)
- `FEED_ENDPOINT_SECONDARY`, `FEED_ENDPOINT_TERTIARY` (опционально)

Базовый URL для всех файлов выводится из primary (обрезается путь до последнего `/`). Пример: если primary = `https://example.com/feed/data.json`, то базовый URL = `https://example.com/feed/`.

### 2.2 Список эндпоинтов (production sync)

Фактические URL формируются как `{base_url}/{filename}`. Используются следующие имена файлов:

| Файл | Назначение | Загрузка в sync |
|------|------------|-----------------|
| `regions.json` | Справочник регионов | В память, затем upsert в `regions` |
| `subways.json` | Справочник станций метро | В память → `subways` |
| `builders.json` | Застройщики | В память → `builders` |
| `finishings.json` | Виды отделки | В память → `finishings` |
| `buildingtypes.json` | Типы зданий | В память → `building_types` |
| `rooms.json` | Типы комнат (студия, 1-комн, …) | В память → `rooms` |
| `blocks.json` | ЖК (блоки) | В память → `blocks` + `block_subway` |
| `buildings.json` | Корпуса/здания | В память → `buildings` |
| `apartments.json` | Квартиры | **Stream** в tmp-файл, затем потоковый парсинг (json-machine) и chunked upsert в `apartments` |

Все reference-файлы считаются «небольшими» (загружаются целиком в память). `apartments.json` может быть большим (порядка сотен МБ), поэтому пишется в файл и читается потоково.

### 2.3 Примеры структур (ожидаемые фидом)

**Элемент справочника (regions / subways / builders / finishings / building_types):**
```json
{ "_id": "507f1f77bcf86cd799439011", "crm_id": 12345, "name": "Название" }
```

**Элемент blocks.json (сокращённо):**
```json
{
  "_id": "507f...",
  "crm_id": 1,
  "name": "ЖК Пример",
  "description": "...",
  "address": "ул. Примерная, 1",
  "district": "507f...",
  "builder": "507f...",
  "geometry": { "type": "Point", "coordinates": [37.62, 55.75] },
  "deadline": "2025-12-31",
  "renderer": [],
  "subway": [
    { "subway_id": "507f...", "distance_time": 10, "distance_type": 1 }
  ]
}
```
В pivot `block_subway`: `distance_time` → travel_time (мин), `distance_type` → travel_type (1=пешком, 2=транспорт).

**Элемент apartments.json (сокращённо):**
```json
{
  "_id": "507f...",
  "building_id": "507f...",
  "block_id": "507f...",
  "room": 1,
  "floor": 5,
  "floors": 10,
  "number": "42",
  "area_total": 45.5,
  "area_kitchen": 12,
  "area_given": 43.2,
  "area_rooms_total": 35,
  "price": 12000000,
  "finishing": "507f...",
  "building_type": "507f...",
  "plan": "https://...",
  "block_name": "ЖК Пример",
  "block_district": "507f...",
  "block_district_name": "Район",
  "block_builder": "507f...",
  "block_builder_name": "Застройщик",
  "block_geometry": { "type": "Point", "coordinates": [37.62, 55.75] },
  "block_iscity": "true",
  "building_deadline": "2025-12-31"
}
```

### 2.4 Аутентификация

В `config/feed.php` секция `auth`:

- `mode`: `none` | `bearer` | `basic` | `query`
- `bearer` → заголовок `Authorization: Bearer {token}`
- `basic` → `FEED_AUTH_USER` / `FEED_AUTH_PASS`
- `query` → к URL дописывается параметр (имя из `param`, значение `token`)

---

## 3. Поля фидов и маппинг

### 3.1 Справочники (общая форма)

Во всех справочниках ожидается массив объектов. Используемые поля:

| Поле фида | Тип | Обязательное | Пример | Куда сохраняется |
|-----------|-----|--------------|--------|-------------------|
| `_id` | string | Да (для PK) | `"507f1f77bcf86cd799439011"` | `id` (char 24) |
| `crm_id` | int | Нет | `12345` | `crm_id` (nullable) |
| `name` | string | Да | `"1-комнатная"` | `name` |

**Исключение — rooms:** уникальный ключ в БД — `rooms.crm_id` (число 0, 1, 2, …). В фиде может быть `_id` (сохраняется в `rooms.feed_id`) и `crm_id` (PK таблицы).

### 3.2 blocks.json

| Поле фида | Тип | Обязательное | Пример | Куда сохраняется |
|-----------|-----|--------------|--------|-------------------|
| `_id` | string | Да | 24-симв. hex | `blocks.id` (PK) |
| `crm_id` | int | Нет | — | `blocks.crm_id` |
| `name` | string | Да | — | `blocks.name` (trim) |
| `description` | string | Нет | — | `blocks.description` |
| `address` | string \| array | Нет | строка или массив строк | `blocks.address` (строка: из массива через запятую или `address.housing`) |
| `district` | string | Нет | id региона/района | `blocks.district_id` (FK к regions снят в миграции) |
| `builder` | string | Нет | id застройщика | `blocks.builder_id` |
| `geometry` | object/array | Нет | GeoJSON Point/Polygon | `blocks.lat`, `blocks.lng` (из coordinates); сырой JSON → `blocks.geometry_json` |
| `deadline` | string (date) | Нет | ISO date | `blocks.deadline_at` (date) |
| `renderer` | array | Нет | массив (изображения) | `blocks.images` (JSON) |
| `subway` | array | Нет | `[{subway_id, distance_time, distance_type}]` | pivot `block_subway`: block_id, subway_id, travel_time, travel_type |

Нормализация:

- Координаты: из `geometry.coordinates` (Point → [lng, lat], Polygon → первая точка).
- Адрес: `extractAddress()` — строка как есть; массив строк → `implode(', ')`; объект с `housing` → `housing`.

### 3.3 buildings.json

| Поле фида | Тип | Обязательное | Пример | Куда сохраняется |
|-----------|-----|--------------|--------|-------------------|
| `_id` | string | Да | 24 симв. | `buildings.id` (PK) |
| `crm_id` | int | Нет | — | `buildings.crm_id` |
| `block_id` | string | Нет | — | `buildings.block_id` |
| `name` | string | Нет | — | `buildings.name` |
| `building_type` | string | Нет | id | `buildings.building_type_id` |
| `floors` | int | Нет | — | `buildings.floors_total` |
| `deadline` | string | Нет | — | `buildings.deadline_at` (date) |
| `queue` | int | Нет | — | `buildings.queue` |
| `height` | float | Нет | — | `buildings.height` |
| `building_bank` | array | Нет | — | `buildings.banks` (JSON) |

### 3.4 apartments.json (полный маппинг)

| Поле фида | Тип | Обязательное | Пример | Куда сохраняется |
|-----------|-----|--------------|--------|-------------------|
| `_id` | string | Да | 24 симв. | `apartments.id` (PK) |
| `crm_id` | int | Нет | — | `apartments.crm_id` |
| `building_id` | string | Нет | — | `apartments.building_id` |
| `block_id` | string | Нет | — | `apartments.block_id` |
| `room` | int | Нет | 0,1,2,… | `apartments.room`, `rooms_crm_id` (если 0..10) |
| `floor` | int | Нет | — | `apartments.floor` |
| `floors` | int | Нет | — | `apartments.floors_total` |
| `number` | string | Нет | — | `apartments.number` |
| `wc_count` | int | Нет | — | `apartments.wc_count` |
| `area_total` | number | Нет | — | `apartments.area_total` (decimal) |
| `area_rooms_total` | number | Нет | — | `apartments.area_living`, `area_rooms_total` |
| `area_kitchen` | number | Нет | — | `apartments.area_kitchen` |
| `area_given` | number | Нет | — | `apartments.area_given` |
| `area_balconies_total` | number | Нет | — | `apartments.area_balconies` |
| `area_rooms` | string | Нет | — | `apartments.area_rooms` (текст) |
| `price` | int | Нет | — | `apartments.price` (int в фиде → decimal в БД) |
| `finishing` | string | Нет | id | `apartments.finishing_id` |
| `building_type` | string | Нет | id | `apartments.building_type_id` |
| `plan` | string \| array | Нет | URL или [url] | `apartments.plan_url` (первый элемент массива или строка) |
| `block_name` | string | Нет | — | `apartments.block_name` (денорм.) |
| `block_district` | string | Нет | — | `apartments.block_district_id` |
| `block_district_name` | string | Нет | — | `apartments.block_district_name` |
| `block_builder` | string | Нет | — | `apartments.block_builder_id` |
| `block_builder_name` | string | Нет | — | `apartments.block_builder_name` |
| `block_geometry` | object | Нет | GeoJSON | `block_lat`, `block_lng` (из coordinates) |
| `block_iscity` | string | Нет | "true"/"false" | `apartments.block_is_city` (boolean) |
| `building_deadline` | string | Нет | date | `apartments.building_deadline_at` (date) |

Вычисляемые/служебные в БД:

- `price_per_meter` — в sync не заполняется (null).
- `is_deleted` — при sync ставится false для текущей порции; позже помечаются записи, не попавшие в последний прогон.
- `last_seen_at` — время текущего sync.
- `created_at` / `updated_at` — now() при upsert.

Преобразования:

- Числа с плавающей точкой площадей/цен: `parseDecimal()` → строка с двумя знаками или null.
- Даты: `Carbon::parse()` → `Y-m-d` или null.
- Координаты: `extractCoordinates(block_geometry)` — поддержка GeoJSON Point и Polygon (первая точка).

---

## 4. Трансформация данных

### 4.1 Где происходит маппинг

- **Справочники:** в методах `FeedSyncService::upsertRegions()`, `upsertSubways()`, … — каждый вызывает общий `upsertChunked($table, $rows, $transform, $uniqueKey)`. Преобразование одной строки фида в строку таблицы задаётся замыканием в команде.
- **Блоки:** в `FeedSyncService::upsertBlocks()` — в цикле по элементам формируются записи для `blocks` и для pivot `block_subway` (из `row['subway']`).
- **Квартиры:** в `FeedSyncService::buildApartmentRecord($row, $syncAt)` — одна запись фида → один массив для `apartments`. Вызов — из `streamUpsertApartments()` и из `upsertApartments()` (тесты/ручной вызов).

### 4.2 Фильтрация

- Строки без ключа (пустой `_id` для blocks/apartments) пропускаются.
- Для rooms допускается `crm_id = 0` (студия); пустая строка в качестве PK отфильтровывается в `upsertChunked`.

### 4.3 Валидация

Явной схемы валидации (например, Request/Validator) для полей фида нет. Используются приведение типов (int, float, string) и безопасные парсеры (`parseDecimal`, `parseDate`, `extractCoordinates`, `extractAddress`, `extractPlanUrl`). Некорректные значения превращаются в null или в значение по умолчанию.

### 4.4 Дедупликация и обновление

- **Уникальность:**  
  - Справочники: по `id` (char 24), кроме `rooms` — по `crm_id`.  
  - `blocks`, `buildings`, `apartments`: по `id` (char 24).  
  - `block_subway`: составной первичный ключ `(block_id, subway_id)`.
- **Стратегия:** везде **upsert** (INSERT ... ON DUPLICATE KEY UPDATE). При повторном появлении той же записи обновляются перечисленные в `upsert()` столбцы; первичный ключ не меняется.
- **Квартиры:** после полного прохода `apartments.json` все записи, у которых `last_seen_at` старше порога (sync time − 5 минут), помечаются `is_deleted = true` (soft-delete). Агрегаты по блокам пересчитываются после этого шага.

---

## 5. Сущности системы

| Сущность | Таблица | Назначение | Источник |
|----------|---------|------------|----------|
| Region | regions | Регион/территория (для фильтров) | regions.json |
| Subway | subways | Станция метро | subways.json |
| Builder | builders | Застройщик | builders.json |
| Finishing | finishings | Вид отделки | finishings.json |
| BuildingType | building_types | Тип здания | buildingtypes.json |
| Room | rooms | Тип комнат (студия, 1-комн, …) | rooms.json |
| Block | blocks | ЖК (жилой комплекс) | blocks.json |
| Building | buildings | Корпус/здание в составе ЖК | buildings.json |
| Apartment | apartments | Квартира (с денормализованными полями блока/корпуса) | apartments.json |
| Block–Subway | block_subway | Связь ЖК ↔ метро (время/тип) | blocks.json (поле subway) |
| FeedSnapshot | feed_raw_snapshots | Снимок сырого ответа эндпоинта | feed:analyze |
| FeedSchemaPath | feed_schema_analysis | Путь поля в JSON (схема) | feed:analyze (FeedSchemaInspector) |

Агрегаты (материализованные):

- В **blocks**: `price_from`, `units_count`, `min_area`, `nearest_deadline_at` — пересчитываются одним запросом после sync из `apartments` (только не удалённые).

---

## 6. Полная структура БД

### 6.1 regions

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | char(24) | NO | — | PK |
| crm_id | unsignedBigInteger | YES | — | unique |
| name | varchar(255) | NO | — | — |
| created_at, updated_at | timestamp | YES | — | — |

### 6.2 subways

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | char(24) | NO | — | PK |
| crm_id | unsignedBigInteger | YES | — | unique |
| name | varchar(255) | NO | — | — |
| line_name | varchar(100) | YES | — | — |
| line_color | varchar(20) | YES | — | — |
| created_at, updated_at | timestamp | YES | — | — |

### 6.3 builders

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | char(24) | NO | — | PK |
| crm_id | unsignedBigInteger | YES | — | unique |
| name | varchar(255) | NO | — | — |
| logo_url | varchar(512) | YES | — | — |
| created_at, updated_at | timestamp | YES | — | — |

### 6.4 finishings

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | char(24) | NO | — | PK |
| crm_id | unsignedBigInteger | YES | — | unique |
| name | varchar(100) | NO | — | — |
| created_at, updated_at | timestamp | YES | — | — |

### 6.5 building_types

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | char(24) | NO | — | PK |
| crm_id | unsignedBigInteger | YES | — | unique |
| name | varchar(100) | NO | — | — |
| created_at, updated_at | timestamp | YES | — | — |

### 6.6 rooms

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| crm_id | unsignedSmallInteger | NO | — | PK |
| feed_id | char(24) | YES | — | unique |
| name | varchar(50) | NO | — | — |
| created_at, updated_at | timestamp | YES | — | — |

### 6.7 blocks

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | char(24) | NO | — | PK |
| crm_id | unsignedBigInteger | YES | — | unique |
| name | varchar(255) | NO | — | FULLTEXT(name, description) |
| description | text | YES | — | — |
| address | varchar(512) | YES | — | — |
| district_id | char(24) | YES | — | index (FK к regions снят) |
| district_name | varchar(255) | YES | — | — |
| builder_id | char(24) | YES | — | index, FK → builders |
| builder_name | varchar(255) | YES | — | — |
| lat, lng | decimal(10,7) | YES | — | — |
| location | point | NO | SRID 4326 | SPATIAL |
| geometry_json | json | YES | — | — |
| is_city | boolean | NO | true | index |
| status | unsignedTinyInteger | NO | 1 | — |
| deadline_at | date | YES | — | index |
| min_price, max_price, min_area, max_area | decimal | YES | — | — |
| price_from | decimal(15,2) | YES | — | index |
| units_count | integer | YES | — | index |
| nearest_deadline_at | date | YES | — | index |
| images | json | YES | — | — |
| created_at, updated_at | timestamp | YES | — | — |

### 6.8 block_subway (pivot)

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| block_id | char(24) | NO | — | PK, FK → blocks CASCADE |
| subway_id | char(24) | NO | — | PK, index, FK → subways CASCADE |
| travel_time | unsignedSmallInteger | YES | — | — |
| travel_type | unsignedTinyInteger | YES | — | — (1=walk, 2=transport) |

### 6.9 buildings

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | char(24) | NO | — | PK |
| crm_id | unsignedBigInteger | YES | — | unique |
| block_id | char(24) | YES | — | index, FK → blocks NULL ON DELETE |
| name | varchar(100) | YES | — | — |
| building_type_id | char(24) | YES | — | index, FK → building_types NULL ON DELETE |
| floors_total | unsignedSmallInteger | YES | — | — |
| deadline_at | date | YES | — | index |
| queue | unsignedTinyInteger | YES | — | — |
| height | decimal(6,2) | YES | — | — |
| status | unsignedTinyInteger | NO | 1 | — |
| lat, lng | decimal(10,7) | YES | — | — |
| banks | json | YES | — | — |
| created_at, updated_at | timestamp | YES | — | — |

### 6.10 apartments

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | char(24) | NO | — | PK |
| crm_id | unsignedBigInteger | YES | — | unique |
| building_id | char(24) | NO | — | index, FK → buildings |
| block_id | char(24) | NO | — | index, FK → blocks |
| room | smallInteger | YES | — | — |
| rooms_crm_id | unsignedSmallInteger | YES | — | index, FK → rooms NULL ON DELETE |
| floor | smallInteger | YES | — | index |
| floors_total | unsignedSmallInteger | YES | — | — |
| number | varchar(30) | YES | — | — |
| wc_count | unsignedTinyInteger | YES | — | — |
| area_total … area_rooms_total | decimal(8,2) / string | YES | — | area_total index |
| price, price_per_meter | decimal(15,2), (10,2) | YES | — | price index |
| finishing_id | char(24) | YES | — | index, FK → finishings NULL ON DELETE |
| building_type_id | char(24) | YES | — | — (FK в миграции не создан) |
| plan_url | varchar(512) | YES | — | — |
| block_name, block_district_id, block_district_name | varchar/char | YES | — | block_district_id index |
| block_builder_id, block_builder_name | char/varchar | YES | — | block_builder_id index |
| block_lat, block_lng | decimal(10,7) | YES | — | idx_geo |
| block_is_city | boolean | NO | true | index |
| building_deadline_at | date | YES | — | index |
| is_deleted | boolean | NO | false | index |
| is_hot, is_start_sales | boolean | NO | false | index |
| last_seen_at | timestamp | YES | — | index |
| created_at, updated_at | timestamp | YES | — | — |
| Composite | — | — | — | idx_price_area, idx_district_room, idx_city_room_price, idx_geo |
| FULLTEXT | — | — | — | apartments_search_fulltext(block_name, block_builder_name, block_district_name) |

### 6.11 feed_raw_snapshots

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | bigint | NO | auto | PK |
| source_url | text | NO | — | — |
| source_hash | char(32) | NO | — | index, (source_hash, created_at) |
| source_label | varchar(255) | YES | — | — |
| payload | longText | YES | — | — |
| checksum | char(40) | NO | — | index |
| payload_bytes | unsignedBigInteger | NO | 0 | — |
| objects_count, projects_count, buildings_count, apartments_count | unsignedInteger | NO | 0 | — |
| http_status | unsignedSmallInteger | YES | — | — |
| download_seconds | float | YES | — | — |
| is_changed | boolean | NO | true | — |
| created_at | timestamp | NO | current | index |

### 6.12 feed_schema_analysis

| Колонка | Тип | Nullable | Default | Индексы |
|---------|-----|----------|---------|---------|
| id | bigint | NO | auto | PK |
| source_url | text | NO | — | — |
| source_hash | char(32) | NO | — | index |
| path | text | NO | — | — |
| path_hash | char(32) | NO | — | unique(source_hash, path_hash) |
| type | varchar(20) | NO | — | index |
| occurrences | unsignedBigInteger | NO | 0 | — |
| null_count | unsignedBigInteger | NO | 0 | — |
| example_value | varchar(255) | YES | — | — |
| depth | unsignedTinyInteger | NO | 0 | index |
| is_always_present | boolean | NO | false | — |
| created_at, updated_at | timestamp | NO | — | — |

---

## 7. Связи

### 7.1 One-to-Many

- `regions` ← blocks.district_id (без FK, только индекс)
- `builders` ← blocks.builder_id (FK nullOnDelete)
- `blocks` ← buildings.block_id (FK nullOnDelete)
- `blocks` ← apartments.block_id (FK)
- `buildings` ← apartments.building_id (FK)
- `finishings` ← apartments.finishing_id (FK nullOnDelete)
- `building_types` ← buildings.building_type_id (FK nullOnDelete)
- `rooms` ← apartments.rooms_crm_id (FK nullOnDelete)

### 7.2 Many-to-Many

- **blocks ↔ subways:** pivot `block_subway` (block_id, subway_id, travel_time, travel_type). FK с CASCADE DELETE.

### 7.3 Каскады

- `block_subway`: при удалении block или subway — каскадное удаление связи.
- Остальные FK — без каскада удаления (либо nullOnDelete для опциональных ссылок).

---

## 8. Pipeline обработки (feed:sync)

1. **Блокировка:** попытка взять Cache::lock('feed-sync-lock', 7200). При неудаче — выход, в лог «sync skipped — lock_held».
2. **Загрузка reference:** последовательный GET всех URL (regions, subways, builders, finishings, buildingtypes, rooms, blocks, buildings). Ответ декодируется в массив, сохраняется в памяти.
3. **Dry-run:** если `--dry-run`, логируются подсчёты по каждому типу, возврат без записи в БД.
4. **Транзакция справочников:** в одной DB::transaction() выполняются upsert: regions, subways, builders, finishings, building_types, rooms, blocks (и block_subway), buildings.
5. **Загрузка apartments:** GET `apartments.json` со stream в файл (Guzzle sink) → `storage/feed/tmp/apartments.json`.
6. **Потоковый парсинг:** JsonMachine читает массив из файла, для каждого элемента вызывается `buildApartmentRecord()`, накапливаются чанки по CHUNK_SIZE (1000). Каждый чанк — один `apartments` upsert (без оборачивания в общую транзакцию).
7. **Очистка:** удаление tmp-файла.
8. **Soft-delete:** UPDATE apartments SET is_deleted=1 WHERE last_seen_at < (sync_time − 5 min) OR last_seen_at IS NULL.
9. **Агрегаты блоков:** один UPDATE blocks с LEFT JOIN по подзапросу из apartments (WHERE is_deleted=0) — заполнение price_from, units_count, min_area, nearest_deadline_at.
10. **Кэш:** Cache::forget('filters:v1').
11. **Лог:** запись статистики (количество upserted, soft_deleted, duration_seconds, peak_memory_mb).
12. **Разблокировка:** lock->release() в finally.

Ошибки на любом шаге логируются в канал `feed`, исключение пробрасывается вверх (команда завершается с кодом FAILURE).

---

## 9. Логирование

### 9.1 Канал

- Имя: `feed`.
- Конфигурация в `config/logging.php`: driver `daily`, path `storage/logs/feed.log`, level из `LOG_LEVEL`, days `30`.
- Использование: `Log::channel('feed')->info(...)` / `warning` / `error` / `debug`.

### 9.2 Где пишутся логи

- FeedClient: каждый запрос, повтор, ошибка, размер/время загрузки.
- FeedSyncService: старт/завершение sync, сухие прогоны, загрузка каждого reference, поток apartments, flush чанков, soft-delete, обновление агрегатов, сброс кэша, ошибки.
- FeedFileStorage: сохранение сырого JSON и артефактов анализа.
- FeedStorageService: сохранение снимка, усечение старых снимков.
- FeedAnalyzer: начало/конец анализа, сохранение снимка, инспекция схемы.
- Команды: при ошибках (catch) и через вызовы сервисов.

### 9.3 Дополнительные логи команд по расписанию

В `App\Console\Kernel` для команд вывод в файлы:

- `feed:collect` → `storage/logs/feed-collect.log`
- `feed:inspect` → `storage/logs/feed-inspect.log`
- `feed:analyze` → `storage/logs/feed-analyze.log`
- `feed:sync` → `storage/logs/feed-sync.log`

При падении запланированной команды в канал `feed` пишется error (например, «feed:sync scheduled run failed»).

### 9.4 Статусы и прогресс

- Отдельной таблицы «статус импорта» нет. Прогресс виден по логам (по сообщениям о чанках и итоговой статистике).
- В БД история снимков — в `feed_raw_snapshots` (по ним можно судить, когда и какой эндпоинт обновлялся и изменился ли payload по checksum).

---

## 10. Проблемные зоны и рекомендации

### 10.1 Возможные дубли

- **apartments:** уникальность по `id` (фидовый _id). Дубли по смыслу (например, одна и та же квартира с разными _id) системой не детектируются.
- **blocks.district_id:** FK к regions отключён; значения могут не совпадать с regions.id — возможна «мусорная» связь по смыслу. Рекомендация: либо восстановить согласованность (только id из regions), либо явно считать district_id внешним идентификатором другой системы и не делать FK.

### 10.2 Индексы

- Составные индексы и FULLTEXT на apartments/blocks уже используются под фильтры и поиск.
- При росте объёма можно оценить покрытие запросов (EXPLAIN) и при необходимости добавить покрывающие индексы под тяжёлые выборки (например, только по is_deleted + block_id для агрегатов).

### 10.3 N+1

- В sync N+1 по сути нет: справочники и блоки грузятся массивами и пишутся чанками; квартиры обрабатываются потоково без подзапросов по связям.
- На стороне API (контроллеры) при отдаче блоков/квартир со связями (builder, subways, district и т.д.) стоит использовать eager loading (with()), чтобы не было N+1 при сериализации.

### 10.4 Узкие места

- **Память:** reference-эндпоинты целиком в памяти — при очень большом размере blocks/buildings может потребоваться потоковая или чанковая загрузка.
- **Один большой транзакционный шаг:** справочники + blocks + block_subway + buildings пишутся в одной транзакции — при огромном числе блоков длительность и размер undo-лога могут вырасти; при необходимости можно разбить на несколько транзакций по сущностям.
- **Квартиры:** специально вынесены из одной транзакции (chunked upsert без общей транзакции), чтобы избежать переполнения undo-лога — это ожидаемое решение.

### 10.5 Рекомендации

1. Явно документировать контракт фида (имена полей, типы, обязательность) и при изменении формата — версионирование или отдельные мапперы.
2. Рассмотреть валидацию входящих полей (хотя бы по типу/длине) перед записью, с логированием отброшенных записей.
3. Периодически проверять логи и метрики времени выполнения sync; при росте данных — мониторинг памяти и времени шага агрегатов.
4. Для отладки и аудита сохранять в feed_raw_snapshots или в файлы сырой ответ хотя бы по одному эндпоинту (уже поддерживается через feed:analyze и конфиг save_payload).
5. Расписание: в Kernel заложены ежедневные запуски (collect 03:00, inspect 03:30, analyze 04:00, sync 04:30); при изменении частоты обновления фида можно перейти на weekly и т.п.

---

*Документ составлен по коду backend (миграции, модели, FeedSyncService, FeedClient, команды, конфиги) и существующим отчётам в storage/feed/.*
