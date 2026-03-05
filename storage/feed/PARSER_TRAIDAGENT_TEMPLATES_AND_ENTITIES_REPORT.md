# Отчёт по шаблонам и сущностям (docs/network-requests)

Источник: **C:\OSPanel\domains\parser-traidagent\docs\network-requests** и связанные docs.  
Для каждого шаблона: URL, сохранённый HTML/файлы, API, блоки страницы, сущности и поля.

---

## Сводка по разделам и шаблонам

| Раздел | Шаблоны (страницы) | Файлы HTML | API (домен) |
|--------|--------------------|------------|-------------|
| Комплексы (blocks) | list, map, table, detail, detail_map | list-page, (map), (table), detail-page | api.trendagent.ru |
| Квартиры (apartments) | table, plan, detail (flat) | table-page, plan-page, detail-page | api.trendagent.ru |
| Шахматка (checkerboard) | structure | structure.html | api.trendagent.ru |
| Паркинги (parkings) | list, table, map, place, object | list, table, map, place-page, object-page | parkings-api.trendagent.ru |
| Дома (houses) | list, table, plan, map, detail, flat | list, table, plan, map, detail-page, flat-page | api.trendagent.ru (blocks) |
| Участки (villages) | list, plots, map, plot-detail, village | list, plots-page, map, plot-detail, village-page | house-api.trendagent.ru |
| Коммерция (commerce) | list, table, plan, map, premise, object | list, table, plan, map, premise-page, object-page | api + commerce-api.trendagent.ru |
| Подрядчики (houseprojects) | list, detail | list-page, detail-page | house-api.trendagent.ru |
| Справочники (references) | — | directories-urls, statuses | api + apartment-api |

---

# 1. КОМПЛЕКСЫ (blocks/)

## 1.1 Список комплексов — `/objects/list/`

**Файлы:** `list-request-params.json`, `list-request-curl.txt`, `list-response.json`, `list-page.html`

**API:** `GET /v4_29/blocks/search/`  
Параметры: `show_type=list`, `sort=price`, `sort_order=asc`, `count`, `offset`, `city`, `lang`, `auth_token`

**Блоки шаблона (по OBJECTS_LIST_PAGE_SPEC):**

| Блок | Класс / описание | Данные |
|------|-------------------|--------|
| Фильтры | `apartments-filter apartments-filter_search` | Поиск (метро, район, ЖК, улица, застройщик, банк), селект «Тип квартиры», «Все фильтры», счётчик квартир |
| Счётчик | — | `data.apartmentsCount` → «56 181 квартира» |
| Заголовок | `objects-header` | `data.apartmentsCount`, `data.prelaunchesCount` → «N квартира · M анонсов» |
| Переключатель | — | Комплексы \| Квартиры \| Планировки \| На карте (`/objects/list/`, `/table/`, `/plans/`, `/map/`) |
| Чекбоксы | `prelaunch-filters` | Анонсы (pre_launch) |
| Сортировка | `objects-header__sort_asc` / `_desc` | По цене (sort_order) |
| Анонсы | `objects-prelaunch`, `prelaunch-card prelaunch-card_horizontal` | Изображение, бейдж «Анонс», название, адрес, застройщик, цена |
| Список ЖК | `objects-list`, `house-card house-card_horizontal` | Карточки с ссылкой на `/object/{guid}/` |
| Карточка ЖК | `house-card__figure`, `apartment-horizontal-caption` | См. ниже |

**Поля одной карточки ЖК (сущность Block):**
- `_id`, `name`, `guid`, `city` (object), `location` (object), `builder` (object: _id, name, guid), `region` (object: name, guid), `subways[]` (name, distance_timing, distance_type), `address[]`, `status`, `deadline`, `min_price`, `max_price`, `image` (path, file_name), `min_prices[]` (room, price, rooms), `apart_count`, `view_apart_count`, `finishing`, `advantages[]`, `сontractTypes[]`, `payment[]`

**Сущности:** **Block** (ЖК), **City**, **Location**, **Builder** (девелопер), **Region**, **Subway** (метро). Агрегаты: apartmentsCount, blocksCount, prelaunchesCount, bookedApartmentsCount, viewApartmentsCount. Справочники: типы комнат (для фильтра).

---

## 1.2 Карта комплексов — `/objects/map/`

**Файлы:** `map-request-params.json`, `map-request-curl.txt`, `map-response.json`

**API:** `GET /v4_29/blocks/search/` с `show_type=map`

**Блоки шаблона:** Карта с пинами ЖК (координаты, краткая подпись при клике).

**Сущности:** **Block** (координаты, name, guid, возможно min_price, deadline). Данные из того же ответа blocks/search, что и list.

---

## 1.3 Таблица комплексов — `/objects/table/`

**API:** `GET /v4_29/blocks/search/` с `show_type=table`, `count`, `offset`, `sort`, `sort_order`

**Блоки шаблона:** Таблица строк (ЖК в виде строк с колонками).

**Сущности:** **Block** — те же поля, что и для list, в табличном виде.

---

## 1.4 Детальная страница ЖК — `/object/{slug}/`

**Файлы:** `detail-request-curl.txt`, `detail-response.json` (в blocks/), по slug сначала вызывается `search/id/`

**API:**
1. `GET /v4_29/blocks/search/id/?guid={slug}` → block_id  
2. `GET /v4_29/blocks/{id}/?ch=false&formating=true` → деталь  
3. При необходимости: квартиры `GET /v4_29/apartments/search/?block_id={id}&type=table|plan`

**Блоки шаблона (по 06_blocks_detail и docs):**
- Описание (description), адрес (address), координаты (latitude, longitude)
- Метро: subways[] (name, distance_timing, distance_type, color)
- Регион (region), локация (location)
- Галерея: gallery[] (src, isPrimary)
- Сроки сдачи: deadlines[], corp
- Застройщик: builder (id, name)
- Характеристики: finishing, building_type, facade_type, contract_type, apatCount, roomsType
- Вкладки/секции: таблица квартир, планировки, шахматка, паркинги, коммерция и т.д.

**Сущности:** **Block** (полная деталь), **Builder**, **Region**, **Location**, **Subway**, **Gallery** (изображения ЖК), **Deadline** (сроки), косвенно **Apartment** (список по block_id), **Checkerboard**, **Parking**, **Commerce**.

---

## 1.5 Карта блока (деталь) — `/object/{slug}/` (карта на странице)

**API:** `GET /v4_29/blocks/{id}/map/?formating=true`

**Сущности:** **Block** (координаты, геоданные для карты).

---

# 2. КВАРТИРЫ (apartments/)

## 2.1 Таблица квартир — `/objects/table/`

**Файлы:** `table-request-params.json`, `table-request-curl.txt`, `table-response.json`, `table-page.html`

**API:** `GET /v4_29/apartments/search/`  
Параметры: `sort=price`, `sort_order=asc`, `count=50`, `offset`, `city`, `lang`, `auth_token`. Опционально `block_id` для фильтра по ЖК.

**Блоки шаблона:** Фильтры (тип квартиры, цена, срок сдачи и т.д.), таблица строк — одна строка = одна квартира.

**Поля строки (сущность Apartment):**  
`_id`, `block_id`, `block_name`, `block_guid`, `number`, `room` (name_short, name, crm_id), `status` (object: name, name_short, bkgrd_color…), `district`, `location`, `city`, `builder`, `finishing`, `plan` (path, file_name), `area_given`, `area_kitchen`, `floor`, `floors`, `price`, `deadline`, `building_name`, `subway`, `reward`, `view_places`, `finishing_main`, `finishing_additional`

**Сущности:** **Apartment**, **Block** (block_id, block_name, block_guid), **Builder**, **Region** (district), **Location**, **City**, **Subway**, **Reference** (status, room types, finishing). Агрегаты: apartmentsCount, blocksCount, bookedApartmentsCount.

---

## 2.2 Планировки — `/objects/plans/`

**Файлы:** `plan-request-params.json`, `plan-response.json`, `plan-page.html`

**API:** тот же `GET /v4_29/apartments/search/`, отличие только `count=30` (table-vs-plan-comparison.txt). Параметра type=plan в URL нет — вид задаётся маршрутом.

**Блоки шаблона:** Сетка карточек планировок (изображение планировки + краткие данные).

**Поля:** Те же, что у квартиры в таблице; ключевое для отображения — `plan.path` + `plan.file_name` (URL планировки).

**Сущности:** **Apartment**, **Block**, **Builder**, **Room** (тип), **Plan** (изображение), **Status**, **Finishing**.

---

## 2.3 Детальная страница квартиры — `/object/{slug}/flat/{apartment_id}`

**Файлы:** `detail-page.html` (apartments/ или houses/flat-page.html)

**API:** В docs указано «ожидается GET /v4_29/apartments/{id}/ или аналог» — точный endpoint не зафиксирован.

**Блоки шаблона:** Полное описание квартиры: характеристики, цены, статус, этаж/секция/подъезд, ЖК/застройщик, акции, ипотека, фото, планировки.

**Сущности:** **Apartment** (полная деталь), **Block**, **Builder**, **ApartmentPhoto** / **Plan**, **PriceHistory** (если есть), **Status**, **Subway**, **Reference** (отделка, типы комнат и т.д.).

---

# 3. ШАХМАТКА (checkerboard/)

## 3.1 Страница шахматки — `/object/{slug}/checkerboard?apartments-onrequest=true`

**Файлы:** `request-params.json`, `request-curl.txt`, `buildings-response.json`, `response.json` (ячейки), `data-structure.txt`, `structure.html`

**API (цепочка):**
1. `GET /v4_29/blocks/search/id/?guid={slug}` → block_id  
2. `GET /v4_29/checkerboards/{block_id}/apartments/buildings/?onrequest=true` → список корпусов (building_id, apartments[])  
3. `GET /v4_29/checkerboards/{block_id}/apartments/?building_id={id}` → сетка по корпусу (floors, ячейки)

**Блоки шаблона (по structure.html):**
- **checkerboard-filter** (apartments-filter_chess): фильтры «Тип квартиры», «Цена от-до», «Срок сдачи», «Все фильтры», чипы «Показать квартиры под запрос», «Сбросить всё»
- **checkerboard-toppanel**: переключатель корпусов (`checkerboard-toppanel__nav-list`), напр. «Корп. 1» с бейджем количества квартир
- **cb-hider**: чекбоксы «Скрыть не попавшие в фильтр», «Скрыть проданные», «Скрыть забронированные»
- **checkerboard-container**: секции (например «секция 1 - Сдан»), подсекции (ССВ, ЮЮЗ…), этажи (5,4,3,2,1), сетка ячеек
- **Ячейка** (`checkerboard__item`): тип квартиры (room), номер (№ N), цена, статус (Под запрос / Продано), отделка, площадь; пустые ячейки (`checkerboard__item--empty`, `checkerboard__item_loading`)

**Поля ячейки (из checkerboard apartments API):**  
`_id` (apartment), `floor`, `section`, `sub_section`, `number`, `status`, `room`, `price_base`, `price`, `finishing`, `area_given`, `exclusive`, `finishing_main`, `finishing_additional`, `view`

**Сущности:** **Block**, **ComplexBuilding** (корпус/здание — building_id из buildings API), **CheckerboardData** (ячейка: этаж, секция, подсекция, квартира, статус, цена, площадь), **Apartment** (связь по _id), **Reference** (статусы, типы комнат, отделка, сроки сдачи).

---

# 4. ПАРКИНГИ (parkings/)

**Endpoints:** `docs/network-requests/parkings/endpoints.json`  
Base: `https://parkings-api.trendagent.ru`

## 4.1 Список паркингов — `/parkings/list`

**Файл:** `list-page.html`  
**API:** `GET /search/blocks` (count, offset, sort, sort_order, city, lang)

**Сущности:** **ParkingBlock** (блок паркинга). Связь с ЖК по полям из ответа (object_id, residential_block_id и т.д. — см. PARKINGS_TO_BLOCK_LINK.md). Агрегаты: blocksCount, placesCount, bookedPlacesCount.

---

## 4.2 Таблица мест — `/parkings/table/`

**Файл:** `table-page.html`  
**API:** `GET /search/places` (count, number, offset, sort, sort_order, city, lang)

**Сущности:** **ParkingPlace** (место паркинга), привязка к ЖК (residential_block). Справочники: contract_types, parking_types, payment_types, place_types, deadlines, sales_start (directories).

---

## 4.3 Карта паркингов — `/parkings/map/`

**Файл:** `map-page.html`  
**Сущности:** **ParkingBlock** / **ParkingPlace** на карте (координаты из raw_data).

---

## 4.4 Деталь места — `/parkingplace/{id}/`

**Файл:** `place-page.html`  
**API:** `GET /parkings/places/{id}/unified/` (city, lang)

**Сущности:** **ParkingPlace** (полная деталь), при необходимости **ParkingBlock**, **Block** (ЖК).

---

## 4.5 Деталь объекта паркинга — `/object/{slug}/` (вкладка паркинги)

**Файл:** `object-page.html`  
**API:** комбинация blocks/search/id, blocks/{id}/ и parkings-api (список мест/блоков по объекту, если есть такой endpoint).

**Сущности:** **Block** (ЖК), **ParkingBlock**, **ParkingPlace**.

---

# 5. ДОМА (houses/)

Используются те же API, что и для комплексов (blocks): **houses/endpoints.json** ссылается на api.trendagent.ru `/v4_29/blocks/search/` с show_type list/map/table, search/id, detail, detail_map.

## 5.1 Список домов — `/houses/list`

**Файл:** `list-page.html`  
**Сущности:** **Block** (как «дом» в контексте раздела).

---

## 5.2 Таблица квартир в домах — `/houses/table/`

**Файл:** `table-page.html`  
**Сущности:** **Apartment**, **Block** (дом).

---

## 5.3 Планировки — `/houses/plans/`

**Файл:** `plan-page.html`  
**Сущности:** **Apartment**, **Plan**, **Block**.

---

## 5.4 Карта домов — `/houses/map/`

**Файл:** `map-page.html`  
**Сущности:** **Block** (на карте).

---

## 5.5 Деталь дома — `/object/{slug}` (контекст «дома»)

**Файл:** `detail-page.html`  
**Сущности:** **Block** (деталь), те же что у детали ЖК.

---

## 5.6 Деталь квартиры в доме — `/object/{slug}/flat/{id}`

**Файл:** `flat-page.html`  
**Сущности:** **Apartment**, **Block**, **Builder**, фото/планировки.

---

# 6. УЧАСТКИ (villages/)

**Endpoints:** house-api.trendagent.ru — autocomplete, filter/plots, map/pins.

## 6.1 Список посёлков/участков — `/villages/list`

**Файл:** `list-page.html`  
**API:** по контексту — данные из filter/plots или map/pins (в endpoints нет отдельного «list villages»).

**Сущности:** **Village** (посёлок), **VillagePlot** (участок) — различие по полю village_id в элементе (API_REQUESTS_AND_BELONGS_TO).

---

## 6.2 Список участков — `/villages/plots`

**Файл:** `plots-page.html`  
**API:** `GET /v1/filter/plots` (city, lang)

**Сущности:** **VillagePlot**, **Village** (если в элементе есть village_id). Фильтры из ответа (price, plot_square, contract и т.д. — см. endpoint-responses 31).

---

## 6.3 Карта участков — `/villages/map/`

**Файл:** `map-page.html`  
**API:** `GET /v1/search/map/villages/pins` (city, lang)

**Сущности:** **Village**, **VillagePlot** (пины на карте). Агрегаты: total_count, result_count, plots_count.

---

## 6.4 Деталь участка — `/village/{slug}/plot/{id}`

**Файл:** `plot-detail-page.html`  
**Сущности:** **VillagePlot**, **Village**.

---

## 6.5 Деталь посёлка — `/village/{slug}`

**Файл:** `village-page.html`  
**Сущности:** **Village** (полная деталь), список **VillagePlot**.

---

# 7. КОММЕРЦИЯ (commerce/)

**Endpoints:** api.trendagent.ru (commerce/search, commerce_premises/search, blocks/search/id, blocks/{id}/unified) + commerce-api.trendagent.ru (map/buildings, premises by block, filters, premise unified, sliderUnified).

## 7.1 Список объектов коммерции — `/commerce/list`

**Файл:** `list-page.html`  
**API:** `GET /v4_29/commerce/search/` (show_type, count, offset, city, lang, auth_token)

**Сущности:** **CommerceObject**, связь с **Block** (block_id в ответе).

---

## 7.2 Таблица помещений — `/commerce/table`

**Файл:** `table-page.html`  
**API:** `GET /v4_29/commerce_premises/search/` или commerce-api `GET /search/premises`

**Сущности:** **CommercePremise**, **CommerceObject** (object_external_id). Агрегаты: premises_count, blocks_count, booked_premises_count.

---

## 7.3 Планировки коммерции — `/commerce/plan`

**Файл:** `plan-page.html`  
**Сущности:** **CommercePremise**, **CommerceObject**, **Block**.

---

## 7.4 Карта коммерции — `/commerce/map/`

**Файл:** `map-page.html`  
**API:** commerce-api `GET /search/map/buildings` (blocks=…, city, lang)

**Сущности:** **CommerceObject** (здания на карте), **Block**.

---

## 7.5 Деталь помещения — `/commerce-premise/{id}`

**Файл:** `premise-page.html`  
**API:** commerce-api `GET /commerce/{id}/unified/` (city, lang), при необходимости sliderUnified (current_id)

**Сущности:** **CommercePremise**, **CommerceObject**, **Block**.

---

## 7.6 Деталь объекта коммерции — `/object/{slug}/#commerce`

**Файл:** `object-page.html`  
**API:** blocks/search/id (guid=slug) → block_id; blocks/{id}/unified; commerce-api search/{block_id}/premises, search/map/buildings, filters

**Сущности:** **Block** (unified), **CommerceObject**, **CommercePremise[]**.

---

# 8. ПОДРЯДЧИКИ / ПРОЕКТЫ ДОМОВ (houseprojects/)

**Endpoints:** house-api.trendagent.ru — projects/search, filter, escrow-banks, autocomplete.

## 8.1 Список проектов — `/houseprojects`

**Файл:** `list-page.html`  
**API:** `GET /v1/projects/search` (count, offset, sort_type, sort_order, city, lang)

**Сущности:** **Houseproject** (проект дома), в ответе — **Contractor** (builder/contractor/developer: _id, name). Агрегаты: total_count, result_count.

---

## 8.2 Деталь проекта — `/houseproject/{slug}`

**Файл:** `detail-page.html`  
**API:** в endpoints не указан явно (предположительно projects/{id} или по slug).

**Сущности:** **Houseproject** (полная деталь), **Contractor** (застройщик/подрядчик). Фильтры: v1/filter, v1/filter/escrow-banks (Reference).

---

# 9. СПРАВОЧНИКИ (references/)

**Файлы:** `directories-urls.txt`, `statuses.json`

**API:**
- api.trendagent.ru: `/v4_29/directories/apartment/status/`, `/v4_29/unit_measurements`
- apartment-api.trendagent.ru: `/v1/directories?types=...` (subway_distances, rooms, balcony_types, building_types, deadlines, finishings, locations, mortgage_types, payment_types, regions, subways, contracts и др.), `/v1/directories/blocks/{block_id}/checkerboards?types=rooms&...`

**Сущности:** **Reference** (тип по source+type+city): статусы квартир, единицы измерения, типы комнат, метро, отделки, сроки сдачи, типы договоров и т.д. Используются в фильтрах и подписях на всех шаблонах (комплексы, квартиры, шахматка, паркинги, коммерция, проекты).

---

# Сводная таблица: шаблон → сущности

| Шаблон | Основные сущности | Вспомогательные сущности | Справочники |
|--------|-------------------|---------------------------|-------------|
| objects/list | Block, Builder, Region, Subway, City, Location | — | rooms, statuses |
| objects/map (blocks) | Block | — | — |
| objects/table (blocks) | Block | — | — |
| object/{slug} (detail ЖК) | Block, Builder, Region, Subway, Gallery, Deadline | Apartment, Checkerboard, Parking, Commerce | rooms, deadlines, statuses |
| objects/table (apartments) | Apartment, Block, Builder | District, Location, Subway | status, room, finishing |
| objects/plans | Apartment, Block, Plan | Builder, Room, Status | room, finishing |
| object/…/flat/{id} | Apartment, Block, Builder | Plan, Photo, Price | status, room, finishing |
| object/…/checkerboard | Block, ComplexBuilding, CheckerboardData, Apartment | — | room, status, deadline, finishing |
| parkings/list | ParkingBlock | Block (residential) | contract_types, place_types, deadlines |
| parkings/table | ParkingPlace | ParkingBlock, Block | place_types, payment_types, deadlines |
| parkings/map | ParkingBlock, ParkingPlace | Block | — |
| parkings/place/{id} | ParkingPlace | ParkingBlock, Block | — |
| parkings/object (object#parkings) | Block, ParkingBlock, ParkingPlace | — | — |
| houses/* (list, table, plan, map, detail, flat) | Block, Apartment | Builder, Plan | те же что blocks/apartments |
| villages/list, plots, map | Village, VillagePlot | — | filter-поля из API |
| village/{slug}, plot/{id} | Village, VillagePlot | — | — |
| commerce/list | CommerceObject | Block | — |
| commerce/table, plan, map | CommercePremise, CommerceObject | Block | filters API |
| commerce-premise/{id} | CommercePremise | CommerceObject, Block | — |
| object/{slug}#commerce | Block, CommerceObject, CommercePremise | — | filters |
| houseprojects (list) | Houseproject, Contractor | — | filter, escrow-banks |
| houseproject/{slug} | Houseproject, Contractor | — | filter |

---

*Отчёт составлен по содержимому `docs/network-requests`, `docs/OBJECTS_LIST_PAGE_SPEC.md`, `docs/PARSER_DATA_OVERVIEW.md`, `docs/API_REQUESTS_AND_BELONGS_TO.md`, `docs/endpoint-responses/README.md` и сохранённым HTML/params/endpoints.*
