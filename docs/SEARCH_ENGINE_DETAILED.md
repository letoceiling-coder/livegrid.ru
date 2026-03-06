# Как работает поиск LiveGrid — подробная документация

**Проект:** https://github.com/letoceiling-coder/livegrid.ru  
**Сайт:** https://livegrid.ru  
**Обновлено:** 2026-02-27  

---

## Содержание

1. [Обзор системы](#1-обзор-системы)
2. [Точки входа и API](#2-точки-входа-и-api)
3. [Цепочка обработки запроса](#3-цепочка-обработки-запроса)
4. [SearchQueryParser — разбор запроса](#4-searchqueryparser--разбор-запроса)
5. [SearchService — логика поиска](#5-searchservice--логика-поиска)
6. [Поиск по ЖК (блокам)](#6-поиск-по-жк-блокам)
7. [Поиск по квартирам](#7-поиск-по-квартирам)
8. [База данных и индексы](#8-база-данных-и-индексы)
9. [Примеры запросов и ответов](#9-примеры-запросов-и-ответов)
10. [Ограничения и особенности](#10-ограничения-и-особенности)

---

## 1. Обзор системы

Поиск LiveGrid — единый поисковый движок, через который проходят все поисковые сценарии:

| Сценарий | Где используется | Метод SearchService |
|----------|------------------|---------------------|
| Live search | Шапка сайта, главная страница | `search()` |
| Каталог ЖК | Страница каталога новостроек | `searchBlocksQuery()` |
| Карта ЖК | Страница карты | `searchBlocksQuery()` |
| Каталог квартир | Страница каталога квартир | `applyApartmentSearch()` |

**Принцип:** один и тот же текст запроса обрабатывается одинаково во всех местах. Пользователь может искать «студия сокольники» — и в выпадающем поиске, и в каталоге, и на карте.

---

## 2. Точки входа и API

### HTTP-эндпоинты

| Эндпоинт | Параметр | Контроллер | Описание |
|----------|----------|------------|----------|
| `GET /api/v1/search` | `q` (обязательный) | SearchController | Live search — ЖК и квартиры в выпадающем списке |
| `GET /api/v1/blocks` | `search` (опционально) | BlockController | Список ЖК с фильтрами и поиском |
| `GET /api/v1/blocks/map` | `search` (опционально) | BlockController | ЖК на карте |
| `GET /api/v1/apartments` | `search` (опционально) | ApartmentController | Список квартир с фильтрами и поиском |

### Объединение поиска и фильтров

Поисковая строка и URL-фильтры (district, builder, price_max и т.д.) объединяются: сначала применяются все обычные фильтры, затем поиск. Фильтры, извлечённые из текста парсером (например, «до 10 млн»), добавляются к фильтрам из URL.

---

## 3. Цепочка обработки запроса

```
Пользователь вводит: "1 комнатная сокольники до 10 млн"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SearchQueryParser::parse($query)                                            │
│  • Извлекает: rooms=[1], price_max=10000000                                  │
│  • Остаток текста: "сокольники"                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SearchService (один из методов)                                             │
│  • search()           — blocks + apartments для live search                  │
│  • searchBlocksQuery()— только ЖК (каталог, карта)                           │
│  • applyApartmentSearch() — условия для квартир (модифицирует query builder) │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              Результаты: блоки и/или квартиры
```

---

## 4. SearchQueryParser — разбор запроса

**Файл:** `app/Services/Search/SearchQueryParser.php`

Парсер разбирает текст запроса и превращает его в структурированные данные. Используются регулярные выражения (regex) для распознавания русских паттернов.

### 4.1 Количество комнат (rooms)

| Паттерн в запросе | Значение | Примеры |
|-------------------|----------|---------|
| студия, студии, студию, студий | 0 | «студия сокольники» |
| 1 комнатная, 1-комнатная, 1к, 1-к, однокомнатная | 1 | «1к до 10 млн» |
| 2 комнатная, 2к, двухкомнатная | 2 | «2 комнатная арбат» |
| 3 комнатная, 3к, трехкомнатная, трёхкомнатная | 3 | «3к ленинский» |
| 4 комнатная, 4к | 4 | «4к» |
| 5 комнатная, 5к | 5 | «5к» |

Если в одном запросе несколько паттернов, в `rooms` попадают все найденные номера (например, «1к или 2к» → `[1, 2]`).

### 4.2 Цена (price_min, price_max)

**Максимальная цена (price_max):**

| Паттерн | Результат | Примеры |
|---------|-----------|---------|
| до N млн / миллионов / м | N × 1 000 000 | «до 10 млн» → 10 000 000 |
| до N (если N > 1000) | N | «до 5000000» → 5 000 000 |

**Минимальная цена (price_min):**

| Паттерн | Результат | Примеры |
|---------|-----------|---------|
| от N млн / миллионов / м | N × 1 000 000 | «от 5 млн» → 5 000 000 |

### 4.3 Площадь (area_min, area_max)

| Паттерн | Результат | Примеры |
|---------|-----------|---------|
| N м / метров / кв.м / м² / м2 | area_min или area_max | «40м» → area_min=40 |
| до N м / метров | area_max | «до 60 м» → area_max=60 |
| от N (с единицами) | area_min | «от 40 кв.м» → area_min=40 |

### 4.4 Выход парсера

Парсер возвращает массив:

```php
[
    'text'      => 'сокольники',      // Текст для FULLTEXT (район, название ЖК и т.д.)
    'rooms'     => [1],               // Числа комнат
    'price_min' => null,              // Минимальная цена (руб.)
    'price_max' => 10000000,          // Максимальная цена (руб.)
    'area_min'  => null,              // Минимальная площадь (м²)
    'area_max'  => null,              // Максимальная площадь (м²)
    'district'  => null,              // Район (пока в text)
    'raw'       => '1 комнатная сокольники до 10 млн',
]
```

После извлечения фильтров «остаток» текста идёт в `text` и используется для полнотекстового поиска.

---

## 5. SearchService — логика поиска

**Файл:** `app/Services/Search/SearchService.php`

### 5.1 Публичные методы

| Метод | Назначение | Возвращает |
|-------|------------|------------|
| `search($query, $filters, $options)` | Полный поиск для live search | `['blocks', 'apartments', 'parsed_query']` |
| `searchBlocksQuery($query, $filters)` | Построение запроса по ЖК | Eloquent `Builder` |
| `applyApartmentSearch($query, $searchTerm)` | Добавление условий поиска к квартирам | `void` (модифицирует `$query`) |
| `parse($query)` | Только разбор запроса | массив parsed |

### 5.2 Внутренняя структура

- `SearchService` использует `SearchQueryParser` через dependency injection.
- Блоки ищутся по FULLTEXT + subway + фильтры.
- Квартиры — по FULLTEXT + LIKE + фильтры из parsed.

---

## 6. Поиск по ЖК (блокам)

### 6.1 Текстовый поиск (applyBlockSearch)

Используются:

1. **FULLTEXT** по полям: `name`, `description`, `address`, `district_name`, `builder_name`:
   ```sql
   MATCH(blocks.name, blocks.description, blocks.address, blocks.district_name, blocks.builder_name)
   AGAINST('сокольники' IN BOOLEAN MODE)
   ```
2. **Поиск по метро** через связь `subways`:
   ```php
   whereHas('subways', fn ($sq) => $sq->where('subways.name', 'LIKE', '%сокольники%'))
   ```

Условия объединяются по **OR**: подойдёт либо совпадение в FULLTEXT, либо в названии станции метро.

### 6.2 Фильтры (applyBlockFilters)

| Фильтр | SQL-условие |
|--------|-------------|
| district | `district_id IN (...)` |
| builder | `builder_id IN (...)` |
| subway | `EXISTS` по `block_subway` + `subways.id IN (...)` |
| deadline_from | `nearest_deadline_at >= ?` или `IS NULL` |
| deadline_to | `nearest_deadline_at <= ?` или `IS NULL` |
| price_max | `price_from <= ?` |
| is_city | `is_city = ?` |

Из parsed в блоки переносится только `price_max`.

### 6.3 Порядок применения

1. `units_count > 0` (исключаем ЖК без квартир).
2. Текстовый поиск (если `text` не пустой).
3. Фильтры из запроса + из parsed.

---

## 7. Поиск по квартирам

### 7.1 Текстовый поиск

Условия (через OR):

1. FULLTEXT по `block_name`, `block_builder_name`, `block_district_name`:
   ```sql
   MATCH(block_name, block_builder_name, block_district_name) AGAINST('сокольники' IN BOOLEAN MODE)
   ```
2. LIKE по `block_name`, `block_builder_name`, `block_district_name`, `number`.

### 7.2 Фильтры из parsed

| Поле parsed | Условие для apartments |
|-------------|------------------------|
| rooms | `room IN (...)` |
| price_min | `price >= ?` |
| price_max | `price <= ?` |
| area_min | `area_total >= ?` |
| area_max | `area_total <= ?` |

### 7.3 Особенности

- `applyApartmentSearch` ожидает `Illuminate\Database\Query\Builder` (DB::table), не Eloquent.
- ApartmentController строит запрос по `apartments`, затем вызывает `applyApartmentSearch`.
- Если после парсинга `text` пустой, `applyApartmentSearch` ничего не делает (квартиры не фильтруются по тексту, но фильтры из parsed по-прежнему применяются, если заданы).

---

## 8. База данных и индексы

### 8.1 FULLTEXT-индексы

| Таблица | Индекс | Колонки |
|---------|--------|---------|
| blocks | blocks_search | name, description, address, district_name, builder_name |
| apartments | apartments_search_fulltext | block_name, block_builder_name, block_district_name |

### 8.2 BTREE-индекс

| Таблица | Индекс | Колонка | Назначение |
|---------|--------|---------|------------|
| subways | subways_name_idx | name | Поиск по названию метро |

### 8.3 Миграция

`database/migrations/2026_03_07_100000_expand_search_indexes.php`:

- Удаляет старый `blocks_fulltext` (name, description).
- Добавляет `blocks_search` с расширенным набором колонок.
- Добавляет `subways_name_idx` на `subways.name`.

---

## 9. Примеры запросов и ответов

### Пример 1: Live search

**Запрос:**
```
GET /api/v1/search?q=сокольники
```

**Внутри:**
- Parsed: `text = "сокольники"`, `rooms = []`, `price_max = null`.
- Вызов `search()` с limit 5 для blocks и apartments.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "residential_complexes": [
      {
        "id": "...",
        "slug": "...",
        "name": "ЖК Сокольники",
        "district": "Сокольники",
        "metro": "Сокольники",
        "subtitle": "Сокольники · Сокольники"
      }
    ],
    "apartments": [
      {
        "id": "...",
        "slug": "...",
        "title": "Кв. 42, ЖК Сокольники",
        "block_name": "ЖК Сокольники",
        "price": 8500000
      }
    ]
  }
}
```

### Пример 2: «1 комнатная до 10 млн»

**Вход:** `"1 комнатная до 10 млн"`

**Parsed:**
- `text = "1 комнатная"` (или пустой, если паттерны «1 комнатная» и «до 10 млн» вырезаны — зависит от порядка и логики парсера).
- `rooms = [1]`
- `price_max = 10000000`

**Для ЖК:** blocks, у которых `price_from <= 10000000` и text match по оставшемуся тексту.  
**Для квартир:** `room = 1`, `price <= 10000000` и text match.

### Пример 3: Каталог квартир с поиском

**Запрос:**
```
GET /api/v1/apartments?search=студия%20авангард&room[]=0&price_max=12000000
```

**Внутри:**
- Parsed: `text = "авангард"`, `rooms = [0]`.
- Фильтры из URL: `room IN (0)`, `price <= 12000000`.
- `applyApartmentSearch` добавляет FULLTEXT/LIKE по «авангард» и `room IN (0)` из parsed (объединяя с `room[]` из URL).
- Итог: квартиры-студии, в названии ЖК/застройщика/района есть «авангард», цена до 12 млн.

---

## 10. Ограничения и особенности

### 10.1 MySQL FULLTEXT

- Режим `BOOLEAN MODE` — без морфологии, без стемминга.
- Минимальная длина слова задаётся в MySQL (`ft_min_word_len` и др.).
- Нет исправления опечаток: «сокольник» не найдёт «Сокольники».

### 10.2 Объединение фильтров

- URL-фильтры и parsed-фильтры объединяются по AND.
- Если в parsed и в URL заданы одни и те же параметры (например, rooms), могут применяться оба набора условий.

### 10.3 Пустой text

- Если парсер оставляет `text` пустым, поиск по тексту (FULLTEXT/LIKE) не выполняется.
- Фильтры из parsed (rooms, price, area) всё равно применяются.

### 10.4 Backward compatibility

- Эндпоинты и структура ответа сохранены. Меняется только внутренняя реализация (LIKE → SearchService с FULLTEXT и парсером).

---

## Схема файлов

```
app/Services/Search/
├── SearchService.php       # Основной сервис
└── SearchQueryParser.php   # Парсер запроса

app/Http/Controllers/Api/V1/
├── SearchController.php    # GET /api/v1/search
├── BlockController.php     # GET /api/v1/blocks, /api/v1/blocks/map
└── ApartmentController.php # GET /api/v1/apartments

database/migrations/
└── 2026_03_07_100000_expand_search_indexes.php
```
