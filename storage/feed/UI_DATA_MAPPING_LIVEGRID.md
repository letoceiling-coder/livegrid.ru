# UI → DATA маппинг для livegrid

**Источники:** шаблоны из PARSER_TRAIDAGENT_TEMPLATES_AND_ENTITIES_REPORT.md, PARSER_TRAIDAGENT_AUDIT_DOCS_ONLY.md.  
**Данные livegrid:** только `backend/app/Models`, `backend/database/migrations`. API донора, feed, парсер не учитываются.

---

# ШАГ 1 — Разбор шаблонов по страницам

## СТРАНИЦА: Каталог ЖК (`/objects/list`)

| Блок страницы | Что выводится | Формат (шаблон) | Тип данных |
|---------------|---------------|-----------------|------------|
| Фото ЖК | image.path + file_name | URL | string (сборка из path + file_name) |
| Название | name | string | string |
| Ссылка на деталь | guid | URL path `/object/{guid}/` | string |
| Адрес | address[] | строка (массив адресов) | array → string |
| Регион | region.name | string | string |
| Застройщик | builder.name | string | string |
| Метро | subways[] (name, distance_timing, distance_type) | список объектов | array |
| Цена мин/макс | min_price, max_price | число | number |
| Цена по типам комнат | min_prices[] (room, price, rooms) | массив | array |
| Кол-во квартир | apart_count | integer | integer |
| Кол-во видовых | view_apart_count | integer | integer |
| Срок сдачи | deadline | строка (например «Сдан») | string |
| Преимущества | advantages[] | массив строк | array |
| Отделка | finishing | строка | string |
| Типы договоров | сontractTypes[] | массив | array |
| Ипотека/оплата | payment[] | массив | array |
| Мета: всего квартир | apartmentsCount | integer | integer |
| Мета: всего ЖК | blocksCount | integer | integer |
| Мета: анонсы | prelaunchesCount | integer | integer |

---

## СТРАНИЦА: Детальная ЖК (`/object/{slug}/`)

| Блок страницы | Что выводится | Формат | Тип данных |
|---------------|---------------|--------|------------|
| Hero / название | name, address | string | string |
| Описание | description | HTML/text | text |
| Координаты | latitude, longitude | число | float |
| Метро | subways[] (name, distance_timing, distance_type, color) | список | array |
| Регион | region (name, guid) | object | object |
| Локация | location (name и т.д.) | object | object |
| Галерея | gallery[] (src, isPrimary) | массив изображений | array |
| Сроки сдачи | deadlines[] (line, deadline, buildings) | массив | array |
| Корпуса/сроки | corp | объект | object |
| Застройщик | builder (id, name) | object | object |
| Отделка | finishing | string | string |
| Тип здания | building_type | string | string |
| Тип фасада | facade_type | string | string |
| Тип договора | contract_type | string | string |
| Кол-во квартир | apatCount | integer | integer |
| Типы комнат | roomsType[] | массив | array |
| Минимальная цена | minPrice | number | number |
| Вкладка: таблица квартир | apartments по block_id | список | list |
| Вкладка: планировки | apartments + plan | список | list |
| Вкладка: шахматка | корпуса → этажи → ячейки | grid | сложная структура |
| Карта | координаты блока | lat, lng | float |

---

## СТРАНИЦА: Квартира (`/object/{slug}/flat/{id}`)

| Блок страницы | Что выводится | Формат | Тип данных |
|---------------|---------------|--------|------------|
| Планировка | plan (path, file_name) | URL изображения | string/object |
| Номер | number | string | string |
| Тип комнат | room (name_short, name) | object | object |
| Этаж | floor | integer | integer |
| Этажей в доме | floors | integer | integer |
| Секция/корпус | building_name, section | string | string |
| Площадь общая | area_given | number | number |
| Площадь кухни | area_kitchen | number | number |
| Цена | price | number | number |
| Статус | status (name, name_short, bkgrd_color) | object | object |
| Отделка | finishing (или finishing_main[]) | string/array | string/array |
| Срок сдачи | deadline | string/date | string |
| ЖК | block_name, block_guid, block_id | object | object |
| Застройщик | builder | object | object |
| Метро | subway (name, line.color) | object | object |
| Акции/вознаграждение | reward | object | string |
| Видовые | view_places[] | массив | array |
| Ипотека | — | — | — |

---

## СТРАНИЦА: Таблица квартир (`/objects/table`)

Те же поля, что и карточка квартиры в списке: block_id, block_name, block_guid, number, room, status, district, builder, finishing, plan, area_given, area_kitchen, floor, floors, price, deadline, building_name, subway, reward, view_places.

## СТРАНИЦА: Планировки (`/objects/plans`)

Те же данные квартиры; ключевое для отображения — plan (path + file_name) и краткие характеристики.

## СТРАНИЦА: Шахматка (`/object/{slug}/checkerboard`)

Корпуса (building_id, apartments[]), ячейки: floor, section, sub_section, number, status, room, price, area_given, finishing. Сущности: Block, ComplexBuilding (корпус), CheckerboardData (ячейка), Apartment, Reference (статусы, комнаты, отделка).

---

# ШАГ 2 — Сопоставление с БД livegrid

Источник: миграции и модели `backend/`.

## 2.1 Таблица `blocks`

**Миграции:** `2026_02_26_200007_create_blocks_table`, `2026_02_26_210000_add_aggregates_to_blocks_table`, `2026_02_26_173052_drop_district_fk_from_blocks`.

| Поле шаблона | Есть в БД? | Где | Формат в БД | Вывести без доработки? |
|--------------|------------|-----|-------------|-------------------------|
| image.path + file_name | Частично | `blocks.images` | JSON (array), структура не задана миграцией | Зависит от формата в images: если [{path, file_name}] — да, иначе нет |
| name | Да | `blocks.name` | string 255 | ✔ |
| guid/slug | Нет | — | — | ❌ Нет колонки slug/guid; есть только id (char 24) |
| address | Да | `blocks.address` | string 512, один адрес | ✔ Один адрес; шаблон — массив |
| region.name | Частично | `blocks.district_name` | string 255; district_id без FK (FK снят) | ✔ district_name вывести можно; связи с regions нет |
| builder.name | Да | `blocks.builder_name`, relation builder() | string 255 | ✔ |
| subways | Да | pivot `block_subway` + Subway | subway_id, travel_time (SMALLINT мин), travel_type (TINYINT 1=walk, 2=transport) | ⚠ Да: имя, время; тип — число, нужен маппинг в «пешком»/«транспорт» |
| min_price / max_price | Да | `blocks.min_price`, `max_price` | decimal(15,2) | ✔ |
| min_prices[] | Нет | — | — | ❌ Нет потиповых цен по комнатам |
| apart_count | Частично | `blocks.units_count` | integer (агрегат) | ✔ Совпадает по смыслу с apart_count |
| view_apart_count | Нет | — | — | ❌ |
| deadline | Частично | `blocks.deadline_at`, `nearest_deadline_at` | date | ⚠ Одна дата; шаблон — строка «Сдан» или массив deadlines |
| advantages[] | Нет | — | — | ❌ |
| finishing | Нет (у блока) | — | — | ❌ На блоке нет отделки |
| сontractTypes / payment | Нет | — | — | ❌ |
| apartmentsCount (мета) | Нет в blocks | — | — | Считать: SUM(units_count) или отдельный подсчёт |
| blocksCount (мета) | Нет в blocks | — | — | COUNT(*) по выборке |
| prelaunchesCount | Нет | — | — | ❌ Нет признака prelaunch |
| description | Да | `blocks.description` | text | ✔ |
| latitude / longitude | Да | `blocks.lat`, `blocks.lng` | decimal(10,7) | ✔ |
| gallery[] | Частично | `blocks.images` | json | ⚠ Если в images массив URL/объектов — можно как галерея; isPrimary не задан |
| deadlines[] / corp | Нет | — | — | ❌ Нет массива сроков по корпусам |
| building_type / facade_type / contract_type | Нет на блоке | — | — | ❌ |
| apatCount | Есть как units_count | `blocks.units_count` | integer | ✔ |
| roomsType[] | Нет на блоке | — | — | ❌ |
| price_from (для сортировки) | Да | `blocks.price_from` | decimal(15,2) | ✔ |

---

## 2.2 Таблица `apartments`

**Миграция:** `2026_02_26_200010_create_apartments_table`.

| Поле шаблона | Есть в БД? | Где | Формат в БД | Вывести без доработки? |
|--------------|------------|-----|-------------|-------------------------|
| _id | Да | `apartments.id` | char 24 | ✔ |
| block_id | Да | `apartments.block_id` | char 24 | ✔ |
| block_name | Да | `apartments.block_name` | string 255 (денорм) | ✔ |
| block_guid | Нет | — | — | ❌ Нет slug у блока |
| number | Да | `apartments.number` | string 30 | ✔ |
| room (тип комнат) | Да | `apartments.room` (int), `rooms_crm_id` → Room | Room.name | ✔ relation Room |
| status | Нет | — | — | ❌ Нет колонки status у квартиры |
| district | Частично | `block_district_id`, `block_district_name` | string | ✔ |
| builder | Да | `block_builder_id`, `block_builder_name` | string | ✔ |
| finishing | Да | `finishing_id` → Finishing, Finishing.name | string | ✔ relation |
| plan (path + file_name) | Частично | `apartments.plan_url` | string 512, один URL | ✔ Один URL планировки |
| area_given | Да | `apartments.area_given` | decimal(8,2) | ✔ |
| area_kitchen | Да | `apartments.area_kitchen` | decimal(8,2) | ✔ |
| floor | Да | `apartments.floor` | smallint | ✔ |
| floors (всего в доме) | Да | `apartments.floors_total` | unsignedSmallInteger | ✔ |
| price | Да | `apartments.price` | decimal(15,2) | ✔ |
| deadline | Частично | `apartments.building_deadline_at` | date | ✔ Срок корпуса |
| building_name (корпус) | Через Building | building_id → Building.name | string | ✔ relation Building |
| subway | Нет у квартиры | — | — | ❌ Метро только у блока |
| reward / view_places | Нет | — | — | ❌ |
| section | Нет | — | — | ❌ Нет секции/подсекции у квартиры |
| entrance (подъезд) | Нет | — | — | ❌ |

---

## 2.3 Таблица `buildings`

**Миграция:** `2026_02_26_200009_create_buildings_table`.

| Поле шаблона | Есть в БД? | Где | Формат | Вывести без доработки? |
|--------------|------------|-----|--------|-------------------------|
| building_id / корпус | Да | `buildings.id`, `buildings.name` | char 24, string 100 | ✔ |
| block_id | Да | `buildings.block_id` | char 24 | ✔ |
| floors_total | Да | `buildings.floors_total` | unsignedSmallInteger | ✔ |
| deadline_at | Да | `buildings.deadline_at` | date | ✔ |

Корпуса для шахматки есть (Building). Отдельной таблицы ячеек шахматки (checkerboard_data) и complex_buildings в livegrid нет — только buildings.

---

## 2.4 Справочники и связи

| Сущность | Таблица | Поля | Связь с шаблоном |
|----------|--------|------|-------------------|
| Region | regions | id, crm_id, name | Блок: district_id не FK; district_name есть на блоке. Отдельно список регионов для фильтров есть. |
| Builder | builders | id, crm_id, name, logo_url | ✔ |
| Subway | subways | id, crm_id, name, line_name, line_color | ✔; pivot: travel_time, travel_type (int) |
| Room | rooms | crm_id, feed_id, name | ✔ Тип комнат квартиры |
| Finishing | finishings | id, crm_id, name | ✔ |
| BuildingType | building_types | id, crm_id, name | Есть у Building, не у Block |

---

## 2.5 Модель Media

**Миграция:** `2026_02_26_112648_create_media_table`: id, path, alt, type (string, default 'image').  
**Модель:** path, alt, type; accessor url = asset('storage/' . path).

- Нет полиморфной связи (mediaable_id, mediaable_type) — медиа не привязаны к Block или Apartment.
- Фото ЖК: только `blocks.images` (JSON).
- Фото планировок: только `apartments.plan_url` (один URL).
- Отдельной таблицы «фото квартиры» с типами main/gallery/plan/3D в livegrid нет.

---

# ШАГ 3 — Фото

## 3.1 Фото ЖК

| Вопрос | Ответ по БД |
|--------|-------------|
| primary_image? | Отдельного поля нет. В блоке только `blocks.images` (JSON array). Первый элемент можно считать главным, если конвенция не задана. |
| gallery? | Тот же `blocks.images` — можно отдать как галерею. Структура в миграции не задана (просто json). |
| path + file_name или URL? | В миграции только `json('images')` — может быть массив объектов с path/file_name или готовые URL; без feed/кода не определено. |

## 3.2 Фото планировок

| Вопрос | Ответ по БД |
|--------|-------------|
| Отдельная таблица? | Нет. Есть только `apartments.plan_url` (string 512). |
| type = plan? | В таблице media нет привязки к квартирам. У квартиры один plan_url. |

## 3.3 Фото квартиры (main, gallery, 3D, видовые)

| Тип | В БД livegrid |
|-----|----------------|
| main | Нет отдельного поля/таблицы |
| gallery | Нет |
| 3D | Нет |
| видовые (view_places) | Нет |

Итог: для квартиры есть только один `plan_url`. Модель Media не связана с Block и Apartment.

---

# ШАГ 4 — Форматы данных

| Поле / структура | В БД livegrid | Формат | Комментарий |
|------------------|---------------|--------|-------------|
| price | decimal(15,2) | number | integer/float в JSON — да |
| min_prices | Нет | — | Нет массива цен по типам комнат |
| subways | relation Block ↔ Subway + pivot | pivot: travel_time (int), travel_type (1/2) | Имя/цвет из Subway; distance_timing = travel_time; distance_type нужно маппировать из travel_type |
| region | district_id (без FK), district_name на блоке | string | relation district() есть, но FK снят — district_id может быть не из regions |
| deadlines | deadline_at (одна дата), nearest_deadline_at | date | Нет JSON deadlines[], нет corp |
| finishing | relation Finishing | таблица finishings, name | Текст через relation |
| room type | relation Room (rooms_crm_id) | таблица rooms, name | relation, не строка в квартире |
| status (квартиры) | Нет | — | Нет колонки и справочника статусов квартир в миграциях |

---

# ШАГ 5 — Итоговая таблица соответствия

## СТРАНИЦА: Каталог ЖК (`/objects/list`)

**✔ Можно заполнить (есть в БД, формат подходит):**
- name — `blocks.name`
- address — `blocks.address` (один адрес)
- district_name (как регион) — `blocks.district_name`
- builder_name — `blocks.builder_name` или builder->name
- min_price, max_price — `blocks.min_price`, `blocks.max_price`; для сортировки price_from — `blocks.price_from`
- apart_count — `blocks.units_count`
- deadline (одна дата) — `blocks.deadline_at` или `nearest_deadline_at` (форматировать в строку)
- Фото — из `blocks.images` (если в JSON есть path/file_name или URL)

**⚠ Частично:**
- Метро — есть связь и pivot: имя, время (travel_time); тип — число (travel_type 1/2), нужен маппинг в «пешком»/«транспорт»; цвет/линия — из Subway (line_name, line_color).
- Регион — district_name есть; связи с regions нет (FK снят).
- Ссылка на деталь — slug/guid нет; использовать `blocks.id` в URL (`/object/{id}`) или добавить slug.

**❌ Нельзя (нет в БД):**
- min_prices[] (цены по типам комнат)
- view_apart_count
- advantages[]
- finishing, сontractTypes[], payment[] на карточке ЖК
- apartmentsCount, blocksCount, prelaunchesCount в meta (считать отдельно; prelaunchesCount — нет признака)

---

# ШАГ 6 — Детальная страница ЖК

| Блок | Можно | Частично | Нельзя |
|------|--------|----------|--------|
| Hero (название, адрес) | name, address, description | — | — |
| Галерея | images (JSON) как массив; primary — первый элемент, если нет поля | — | isPrimary не задан |
| Характеристики | description | — | building_type, facade_type, contract_type, finishing на блоке — нет |
| Карта | lat, lng | — | — |
| Сроки | deadline_at, nearest_deadline_at | Одна дата | deadlines[], corp — нет |
| Метро | subways с travel_time, travel_type (маппинг) | — | — |
| Застройщик | builder_id, builder_name, builder->name | — | — |
| Регион/локация | district_name | location как текст — нет | — |
| Вкладка: таблица квартир | Список apartments по block_id (через buildings) | — | block_guid для ссылок нет |
| Вкладка: планировки | apartments с plan_url | — | — |
| Вкладка: шахматка | Здания есть (buildings); квартиры по building_id | Нет таблицы ячеек шахматки (floor×section×apartment); нет подсекций, статусов ячеек | Нужна структура типа checkerboard_data и логика сетки |
| Мета: apatCount | units_count | — | — |
| minPrice | min_price, price_from | — | — |

---

# ШАГ 7 — Страница квартиры

| Блок | Можно | Частично | Нельзя |
|------|--------|----------|--------|
| Планировка | plan_url | Один URL | Несколько планировок, тип plan в медиа — нет |
| Номер | number | — | — |
| Тип комнат | room, roomType->name | — | — |
| Этаж / этажей всего | floor, floors_total | — | — |
| Корпус | building->name | — | — |
| Секция / подъезд | — | — | section, entrance — нет |
| Площади | area_given, area_kitchen, area_total | — | — |
| Цена | price, price_per_meter | — | — |
| Статус | — | — | status — нет в БД |
| Отделка | finishing->name | — | — |
| Срок сдачи | building_deadline_at | — | — |
| ЖК | block_name, block_id | block_guid (slug) — нет | — |
| Застройщик | block_builder_name | — | — |
| Метро | Только через блок (block->subways) | — | Отдельно по квартире — нет |
| Акции / вознаграждение / видовые | — | — | reward, view_places — нет |
| Ипотека | — | — | Нет в миграциях |

---

# Сводка по сущностям шаблонов и наличию в livegrid

| Сущность шаблона | В livegrid | Таблица/модель | Примечание |
|------------------|------------|----------------|------------|
| Block (ЖК) | Да | blocks, Block | Нет slug, min_prices, view_apart_count, advantages, contract_types, payment, prelaunch |
| Apartment | Да | apartments, Apartment | Нет status, section, entrance, subway, reward, view_places; один plan_url |
| Building (корпус) | Да | buildings, Building | Есть |
| ComplexBuilding / checkerboard | Нет | — | Нет таблицы ячеек шахматки и подсекций |
| Builder | Да | builders, Builder | Есть |
| Region | Частично | regions, blocks.district_name | district_name на блоке; FK с regions снят |
| Subway | Да | subways, block_subway | travel_time, travel_type (int); distance_type — маппинг |
| Room (тип комнат) | Да | rooms, Room | Есть |
| Finishing | Да | finishings, Finishing | Есть |
| Gallery / изображения ЖК | Частично | blocks.images (JSON) | Нет отдельной таблицы; нет isPrimary |
| Планировка квартиры | Частично | apartments.plan_url | Один URL |
| Фото квартиры (main, gallery, 3D) | Нет | — | Нет |
| Media | Есть | media, Media | Не привязана к Block/Apartment |
| Status квартиры | Нет | — | Нет |
| Deadlines (массив по корпусам) | Нет | — | Одна дата на блок/здание |
| Location (текст) | Нет | — | Есть только location POINT (гео) |

*Отчёт составлен по фактическим миграциям и моделям livegrid (backend).*
