# Аудит донора parser-traidagent (только по docs)

**Источник:** только папка `C:\OSPanel\domains\parser-traidagent\docs\` и приложенные к ней файлы (`endpoint-responses`, `network-requests`). Код (модели, парсеры, миграции) не анализировался.

---

## ШАГ 1 — Архитектура проекта (по docs)

### 1.1 Структура docs

По **docs/INDEX.md** и **docs/network-requests/README.md**:

- **auth/** — авторизация (login, token-storage, cURL).
- **blocks/** — ЖК: list, map, table, detail, search/id, list-response, detail-response.
- **apartments/** — квартиры: table, plan, table/plan-response, сравнение table vs plan.
- **checkerboard/** — шахматка: request params, buildings-response, response (ячейки), data-structure.txt.
- **references/** — справочники: directories-urls, statuses.
- **parkings/** — паркинги: list, table, map, place-page, object-page, endpoints, PARKINGS_TO_BLOCK_LINK.
- **houses/** — дома: list, table, plan, map, detail, flat.
- **villages/** — участки: list, plots, map, plot-detail, village, endpoints.
- **commerce/** — коммерция: list, table, plan, map, premise, object, endpoints.
- **houseprojects/** — проекты домов: list, detail, endpoints.

**endpoint-responses/** — сохранённые JSON ответов 36+ эндпоинтов (README перечисляет все файлы и ключи ответа).

### 1.2 Сущности (из документации)

По **PARSER_ENTITY_HIERARCHY_PLAN.md**, **ARCHITECTURE_UPDATE.md**, **NEW_SECTIONS.md**, **API_REQUESTS_AND_BELONGS_TO.md**:

| Сущность | Описание | Связь с родителем |
|----------|----------|-------------------|
| **ЖК (Block)** | Жилой комплекс, api.trendagent.ru blocks | — |
| **Блок (корпус)** | Корпус/здание внутри ЖК | checkerboard buildings → block_id |
| **Квартира** | Квартира в ЖК | block_id в ответе и в запросе |
| **Планировка** | Тот же endpoint что таблица квартир, count=30 | данные квартиры + plan (path/file_name) |
| **Галерея** | Массив изображений | в детали ЖК: `gallery[]` с `src`, `isPrimary`; в квартире — plan, view_places |
| **Инфраструктура** | В описании ЖК (location, region, subways, point_distance) | часть data блока |
| **Документы** | В docs не выделены отдельной сущностью | — |
| **Генплан** | Не описан отдельно в docs | возможно в blocks map или unified |
| **Метро** | subways[] в блоке и квартире | id, name, distance_timing, distance_type, color, line |
| **Девелопер (builder)** | В блоке и квартире: builder._id, name, guid | отдельная сущность «подрядчик» для houseprojects |
| **Паркинги (блоки и места)** | parkings-api | residential_block по полям object_id, object._id, residential_block_id, building_id, block_id |
| **Коммерция (объекты и помещения)** | api + commerce-api | block_id у объектов; помещения по block_id в path |
| **Посёлки / участки** | house-api | village_id, village в элементе → посёлок или участок |
| **Проекты домов** | house-api | builder/contractor/developer → contractors |
| **Справочники (references)** | directories, statuses, enums | source + type + city |

### 1.3 Связи между сущностями (по docs)

- **ЖК** → квартиры (block_id), шахматка (корпуса → ячейки), паркинги (residential_block_external_id), коммерция (block_external_id), корпуса (complex_buildings из checkerboard buildings).
- **Квартира** → блок (block_id), фото/планировки (plan.path + file_name), статус, отделка, цены.
- **Шахматка:** блок → buildings (корпуса) → apartments (ячейки по building_id); у ячейки: floor, section, sub_section, _id квартиры, status, price, area_given, room.
- **Паркинги:** блок паркинга и места привязываются к ЖК по полям из ответа (PARKINGS_TO_BLOCK_LINK.md).
- **Коммерция:** объект привязан к ЖК (block_id); помещения — через запрос по block_id или object_external_id.
- **Посёлки:** элемент с village_id → участок (village_plots), иначе → посёлок (villages).
- **Проекты домов:** у проекта в ответе builder/contractor → создаётся contractor, project.contractor_id.

### 1.4 Обязательные параметры (по docs)

- **Все запросы к API:** `city`, `lang` (в т.ч. city=58c665588b6aa52311afa01b для СПб).
- **api.trendagent.ru:** `auth_token=<JWT>` в query string (не в header).
- **Refresh токена:** `GET sso-api.trend.tech/v1/auth_token/` с header `Authorization: Bearer <token>`, query city, lang.

---

## ШАГ 2 — Структура шаблонов (по docs)

### 2.1 Страница каталога / objects/list (OBJECTS_LIST_PAGE_SPEC.md)

- **Блоки:** фильтры (поиск, тип квартиры, «Все фильтры»), счётчик «N квартир» (data.apartmentsCount).
- **Заголовок:** «{apartmentsCount} квартира · {prelaunchesCount} анонсов», переключатель: Комплексы | Квартиры | Планировки | На карте, чекбоксы анонсов, сортировка «По цене».
- **Анонсы:** блок objects-prelaunch, карточки prelaunch-card (изображение, бейдж, название, адрес, застройщик, цена).
- **Список ЖК:** house-card_horizontal — ссылка на /object/{guid}/, изображение (image.path + file_name), адрес, район (region.name), застройщик (builder.name), преимущества (отделка, ипотека, тип договора), **min_prices** по типам комнат («Студии» → «от N ₽»), счётчики «Квартир N · Видовых M» (apart_count, view_apart_count).
- **Данные из API (blocks/search):** results[]._id, name, guid, city, location, builder, region, subways, address, status, deadline, min_price, max_price, image.path/file_name, min_prices[], apart_count, view_apart_count, finishing, advantages, сontractTypes, payment. Мета: blocksCount, apartmentsCount, prelaunchesCount.

**Обязательные для карточки:** name, guid, image, address, region, builder, min_prices (или min_price), apart_count. **Вычисляемые/агрегаты:** apartmentsCount, blocksCount, prelaunchesCount — с сервера.

### 2.2 Страница ЖК /object/{slug}/ (по API_ANALYSIS, blocks detail)

По **06_blocks_detail.json** и описанию в docs:

- **Блоки:** описание (description), адрес (address), координаты (latitude, longitude), метро (subways[]: name, distance_timing, distance_type, color), регион (region), галерея (gallery[]: src, isPrimary), сроки сдачи (deadlines[], corp), застройщик (builder: id, name), отделка, тип здания, фасад, тип договора, apatCount, комнаты (roomsType), location.
- **Таблица/планировки квартир:** те же endpoints apartments/search с block_id и type=table или type=plan.
- **Шахматка:** отдельная страница checkerboard — корпуса, затем ячейки по этажам/секциям.

**Обязательные:** id, name, guid, address, city, coordinates. **Вложенные:** gallery, subways, deadlines, builder, region, location. **Агрегаты:** minPrice, apatCount (в детали).

### 2.3 Страница блока (дома)

По **NEW_SECTIONS.md** и **SECTIONS_ANALYSIS.md**: дома используют те же URL что и ЖК — `/object/{slug}`, `/object/{slug}/flat/{id}`. Сохранённые HTML: list, table, plan, map, detail, flat. Структура страницы блока по сути совпадает со страницей ЖК (detail-page.html).

### 2.4 Страница квартиры /object/{slug}/flat/{id}

По **API_ANALYSIS.md**, **PARSER_DATA_OVERVIEW.md**: URL фиксирован. Endpoint детали квартиры в docs помечен как «нужно определить» (возможно `/v4_29/apartments/{id}/` или аналог). Что должно отображаться: характеристики, цены, статусы, этаж/секция/подъезд, ЖК/застройщик, акции, ипотека, фото, планировки.

По **09_apartments_search.json** в элементе есть: status, district, location, city, builder, finishing, plan (path, file_name), _id, number, block_name, block_guid, block_id, deadline, building_name, room (name_short, name), area_given, area_kitchen, floor, floors, price, subway, reward, view_places.

**Обязательные для строки/карточки:** _id, block_id, number, room, floor, price, status, area_given. **Вложенные:** plan, finishing_main, room, district, builder, subway.

### 2.5 Каталог (разделы)

По **NEW_SECTIONS.md** и **SECTIONS_SUMMARY.md**:

- Паркинги: list, table, map, place-page, object-page.
- Дома: list, table, plan, map, detail, flat.
- Участки: list, plots, map, plot-detail, village.
- Коммерция: list, table, plan, map, premise, object.
- Подрядчики: list, detail.

Данные по разделам — агрегаты (blocksCount, placesCount и т.д.) и списки из соответствующих API; фильтры из references/enums/directories.

---

## ШАГ 3 — Анализ feed (только по docs)

### 3.1 Откуда берётся feed

Не «feed» в смысле одного файла: данные приходят по **HTTP API** с нескольких доменов (PARSER_DATA_OVERVIEW.md, ENDPOINTS_FULL_LIST.md):

- **api.trendagent.ru** — блоки, квартиры, шахматка, коммерция, справочники (v4_29).
- **apartment-api.trendagent.ru** — справочники (v1/directories).
- **parkings-api.trendagent.ru** — паркинги (search/blocks, search/places, unified, enums, directories).
- **commerce-api.trendagent.ru** — карта коммерции, помещения по блоку, фильтры, деталь помещения, слайдер.
- **house-api.trendagent.ru** — участки (autocomplete, filter/plots, map/pins), проекты домов (search, filter, escrow-banks, autocomplete).
- **sso-api.trend.tech** — логин, auth_token (refresh).

### 3.2 Структура JSON по эндпоинтам (endpoint-responses/README + примеры)

- **Blocks list:** `data.results[]`, `data.apartmentsCount`, `data.blocksCount`, `data.prelaunchesCount`. Элемент: _id, name, guid, city, location, builder, region, subways, address, status, deadline, image (path, file_name), min_prices[], apart_count, view_apart_count, finishing, advantages и др.
- **Blocks detail:** `data` — один объект с id, name, guid, description, address, latitude, longitude, subways[], region, gallery[], builder, deadlines[], corp, roomsType, minPrice, finishing, building_type, facade_type, contract_type, apatCount, city, location и др.
- **Apartments search:** `data.list[]`, `data.apartmentsCount`, `data.blocksCount`, `data.bookedApartmentsCount`. Элемент: _id, block_id, block_name, block_guid, status, district, builder, finishing, plan, number, room, area_given, area_kitchen, floor, floors, price, subway, deadline, building_name и др.
- **Checkerboard buildings:** `data.results[]` с building_id и apartments[] (id квартир).
- **Checkerboard apartments:** `data.results[]` с _id, floor, section, sub_section, number, status, room, price, area_given, finishing и др.
- **Commerce/Parkings/Villages/Projects:** структуры в README endpoint-responses (results/list, мета-счётчики, фильтры).

### 3.3 Какие поля приходят, преобразуются, нормализуются

По **PARSING_FLOW.md** и **API_REQUESTS_AND_BELONGS_TO.md**:

- Ответы API сохраняются целиком в JSON/JSONB (`data`/`raw_data`); **нормализация не выполняется** (документация явно это фиксирует).
- **Преобразования:** только связывание по внешним ключам: block_id по external_id, residential_block для паркингов из полей object_id/object._id/residential_block_id/building_id/block_id, contractor_id из builder/contractor в проектах, village_id для участков. Остальное не преобразуется.
- **Теряются:** в docs не описано явно; подразумевается, что всё сохраняется. Детальный endpoint квартиры не определён — часть полей детальной страницы может быть только в UI.

### 3.4 Структура feed (сводка по docs)

- Нет единого feed-файла; есть набор эндпоинтов с пагинацией (count, offset) и обязательными city, lang, auth_token (где нужно).
- Порядок загрузки (PARSING_FLOW): references → blocks → apartments → checkerboard (по блокам: buildings → apartments) → parkings → commerce → villages → houseprojects. Связи заполняются по полям в ответах (block_id, builder, village_id и т.д.).

---

## ШАГ 4 — Карта данных (по docs)

```
ЖК (Block)
 ├─ блоки/корпуса (complex_buildings из checkerboard buildings)
 │   └─ ячейки шахматки (checkerboard_data: floor, entrance, section, apartment_id, status, data)
 ├─ квартиры (apartments: block_id)
 │   ├─ планировки (plan.path + file_name в data)
 │   ├─ цены (price в data; при необходимости price_history)
 │   ├─ изображения (plan, view_places; деталь — «нужно определить»)
 │   └─ статус, отделка, комната, этаж, метро
 ├─ галерея (gallery[] в data блока: src, isPrimary)
 ├─ инфраструктура (location, region, subways, point_distance в data)
 ├─ документы — в docs не выделены
 ├─ девелопер (builder: id, name в data блока и квартиры)
 ├─ метро (subways[]: id, name, distance_timing, distance_type, color)
 ├─ координаты (latitude, longitude в data блока)
 ├─ паркинги (блоки и места по residential_block_external_id)
 └─ коммерция (объекты по block_external_id; помещения по object/block)

Посёлок (Village)
 └─ участки (village_plots по village_id в ответе)

Подрядчик (Contractor)
 └─ проекты домов (houseprojects по builder/contractor в ответе)

Справочники (references/directories/enums)
 └─ по source+type+city или по разделам (parkings enums, apartment directories)
```

---

## ШАГ 5 — Требования к БД livegrid (вывод из docs)

1. **Таблицы, которые по документации донора по сути нужны:**  
   blocks (ЖК), apartments (квартиры), корпуса/здания (complex_buildings), ячейки шахматки (checkerboard_data), изображения квартир (отдельная таблица или вложенные URL), паркинги (блоки и места), коммерция (объекты и помещения), посёлки (villages), участки (village_plots), подрядчики (contractors), проекты домов (houseprojects), справочники (references), при необходимости price_history.

2. **Обязательные поля (минимум по docs):**  
   У блока: external_id, city, name, slug (guid), address, coordinates (или latitude/longitude). У квартиры: external_id, block_id, номер, этаж, статус, цена, площадь. У корпуса: block_id, external_id (building_id). У ячейки: block_id, complex_building_id (опц.), floor, section, apartment_id (опц.), status, data. Связи паркингов/коммерции с ЖК по external_id ЖК.

3. **Связи:**  
   Block hasMany apartments, complex_buildings, checkerboard_data; apartment belongsTo block; checkerboard_data belongsTo block, complex_building, apartment; паркинги/коммерция → block по residential_block_external_id / block_external_id; village hasMany plots; contractor hasMany houseprojects.

4. **Агрегаты, которые стоит хранить или считать:**  
   blocksCount, apartmentsCount, prelaunchesCount, bookedApartmentsCount, viewApartmentsCount; по паркингам — blocksCount, placesCount, bookedPlacesCount; по коммерции — premises_count, blocks_count; по проектам — total_count, result_count.

5. **Индексы (по типичным запросам из docs):**  
   block: city, guid (slug), external_id. apartment: block_id, external_id, status. checkerboard: block_id, complex_building_id, floor. Паркинги/коммерция: residential_block_external_id / block_external_id, city. villages/village_plots: external_id, village_id. houseprojects: contractor_id, city.

6. **Изображения:**  
   Галерея ЖК — массив URL в data или отдельная таблица (src, order, is_primary). Квартиры — plan (path+file_name → URL), при необходимости отдельная таблица фото по типам (main|plan|gallery).

---

## ШАГ 6 — Сравнение с livegrid (по OBJECTS_LIST_PAGE_SPEC)

Предполагается, что у livegrid есть: projects, blocks, apartments, images, developers.

- **Не хватает сущностей:** корпуса (complex_buildings), ячейки шахматки (checkerboard_data), паркинги (блоки и места), коммерция (объекты и помещения), посёлки и участки, подрядчики (contractors), проекты домов (houseprojects), справочники (references). Отдельно не выделены: галерея ЖК, метро, сроки сдачи (deadlines).

- **Не хватает полей (по расхождениям в OBJECTS_LIST_PAGE_SPEC):** у блока — region, address (массив), subways, min_prices по типам комнат, apart_count, view_apart_count, finishing, advantages, contract_types, payment. У ответа списка — blocks_count, apartments_count, prelaunches_count в meta.

- **Упрощённые связи:** квартиры привязаны к блоку (block_id) — ок. Нет связи «блок → корпуса → шахматка», «блок → паркинги/коммерция», «подрядчик → проекты», «посёлок → участки».

- **Что не отобразить при текущей структуре livegrid:** шахматка по корпусам/этажам; цены по типам комнат (min_prices) на карточке ЖК; блоки анонсов (prelaunch); полные преимущества и типы договоров; паркинги и коммерция привязанные к ЖК; участки и проекты домов с привязкой к посёлкам и подрядчикам; единые справочники (statuses, rooms, subways и т.д.).

---

**Итог:** отчёт построен только по документации в `docs`: INDEX, ARCHITECTURE_UPDATE, PARSER_ENTITY_HIERARCHY_PLAN, ENDPOINTS, ENDPOINTS_FULL_LIST, PARSER_DATA_OVERVIEW, OBJECTS_LIST_PAGE_SPEC, NEW_SECTIONS, SECTIONS_ANALYSIS, SECTIONS_ENDPOINTS, SECTIONS_SUMMARY, API_ANALYSIS, API_REQUESTS_AND_BELONGS_TO, PARSING_FLOW, UI_DEPENDENCIES, AUTH_FLOW, REVERSE_ENGINEERING_REPORT, network-requests/README, PARKINGS_TO_BLOCK_LINK, checkerboard/data-structure, endpoint-responses (README и примеры 01, 06, 09, 10, 11). Код донора не использовался.
