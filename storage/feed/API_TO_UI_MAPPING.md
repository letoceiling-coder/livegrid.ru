# API_TO_UI_MAPPING — strict-template → livegrid API

**Цель:** Подключить UI strict-template к существующему API livegrid без изменений backend.

---

## UI routes ↔ API (сводка)

| UI route | Page | API endpoint |
|----------|------|--------------|
| `/complex/:slug` | Complex (ЖК) | `GET /api/v1/blocks/{slug}` — backend принимает slug или id |
| `/apartment/:id` | Apartment (квартира) | `GET /api/v1/apartments/{id}` — id = 24 hex (MongoDB ObjectId) |

---

## 1. ComplexCard (карточка ЖК)

| UI Field | Expected (Template) | API Endpoint | API Field | Transformation |
|----------|---------------------|--------------|-----------|----------------|
| name | ResidentialComplex.name | GET /api/v1/blocks | data[].name | Direct |
| slug | ResidentialComplex.slug | GET /api/v1/blocks | data[].slug | Direct |
| images | string[] | GET /api/v1/blocks | data[].images | Direct (array of URLs) |
| district | string | GET /api/v1/blocks | data[].district.name | Use district.name |
| address | string | GET /api/v1/blocks | data[].address | Direct |
| subway | string | GET /api/v1/blocks | data[].subways[0]?.name | subways[0]?.name + travel_time |
| builder | string | GET /api/v1/blocks | data[].builder.name | Direct |
| deadline | string | GET /api/v1/blocks | data[].deadline_label | Direct (e.g. "II кв. 2027") |
| priceFrom | number | GET /api/v1/blocks | data[].price_from | Direct |
| status | building/planned/completed | — | — | **Не в API.** Вывести из nearest_deadline_at или оставить «Строится» по умолчанию |
| advantages | string[] | — | — | **Нет в API.** Оставить пустой массив или хардкод |
| buildings | Building[] | — | — | **Не в list.** Для карточки — использовать units_count, room_groups |
| totalApts | number | data[].units_count | Direct | — |

---

## 2. FilterSidebar (фильтры каталога ЖК)

| Filter | Expected | API | Transformation |
|--------|----------|-----|----------------|
| districts | {id, name}[] | GET /api/v1/blocks/filters | data.districts | Use id for API param district[] |
| builders | {id, name}[] | GET /api/v1/blocks/filters | data.builders | Use id for builder[] |
| price | {min, max} | GET /api/v1/blocks/filters | data.price | Direct for price_min/price_max |
| deadline | {min, max} | GET /api/v1/blocks/filters | data.deadline | Map to deadline_from, deadline_to |
| rooms | — | Blocks API не фильтрует по rooms | — | Убрать из фильтров каталога ЖК или считать по apartments |
| subways | — | Blocks filters не возвращают subways | — | **Нет.** Убрать или загружать из другого источника |
| finishing, status | — | Нет в blocks filters | — | Убрать для каталога ЖК |

**CatalogFilters → API params (blocks):**
- `district[]` ← filters.district (id)
- `builder[]` ← filters.builder (id)
- `search` ← filters.search
- `deadline_from`, `deadline_to` ← из filters (если добавить)
- `sort`, `order` ← price_from, deadline, name

---

## 3. RedesignCatalog (список ЖК)

| Data | API | Params |
|------|-----|--------|
| Blocks list | GET /api/v1/blocks | district[], builder[], search, deadline_from, deadline_to, sort, order, per_page, page |
| Total count | Response meta.total | — |
| Filters options | GET /api/v1/blocks/filters | — |

---

## 4. Complex page (страница ЖК) — ComplexHero, RedesignComplex

**UI route:** `/complex/:slug`

**API:** `GET /api/v1/blocks/{slug}` — backend принимает slug или id (формат slug: `zhk-name-{24hex}`).

| UI Field | API | Transformation |
|----------|-----|----------------|
| name | GET /api/v1/blocks/{slug} | Direct |
| description | description | Direct |
| images | images | Direct |
| address | address | Direct |
| district | district.name | Direct |
| builder | builder.name | Direct |
| subway | subways[0]?.name | + travel_time в «N мин» |
| priceFrom | price_from | formatPrice() |
| deadline | deadline_label | Direct |
| status | — | Вывести из nearest_deadline_at или оставить default |
| advantages | — | **Нет.** Пустой массив |
| totalApts | units_count | Direct |

---

## 5. ApartmentTable (таблица квартир в ЖК)

| UI Field | API | Transformation |
|----------|-----|----------------|
| apartments | GET /api/v1/blocks/{id}/apartments | data (ApartmentListItem[]) |
| rooms | room (0=студия, 1,2,3…) | Direct |
| area | area.total | Direct |
| kitchenArea | area.kitchen | Direct |
| floor | floor | Direct |
| totalFloors | floors_total | Direct |
| price | price | Direct |
| pricePerMeter | price_per_meter | Compute if null: price/area_total |
| finishing | finishing.name | Direct |
| status | — | **Нет в API.** Всегда «Свободна» или скрыть колонку |
| id (link) | id | Link to **/apartment/{id}** |

**Sort params:** sort=price|area_total|floor|building_deadline_at, order=asc|desc

---

## 6. PropertyCard (карточка квартиры)

| UI Field | Expected PropertyData | API (ApartmentListItem) | Transformation |
|----------|----------------------|-------------------------|----------------|
| image | URL | plan_url | plan_url (план) или блок images[0] |
| title | string | block.name + room_label + area | `ЖК ${block.name}, ${room_label} ${area.total} м²` |
| price | string | price | formatPrice(price) |
| address | string | block.district.name | block.district.name |
| area | string | area.total | `${area.total} м²` |
| rooms | string | room_label | room_label |
| badges | string[] | — | Optional: is_hot → «Горячее», is_start_sales → «Старт» |
| link | — | id | Link: **/apartment/{id}** (квартиры по id, не slug) |

---

## 7. PropertyGridSection (hot / start)

| Section | API | Params |
|---------|-----|--------|
| Hot | GET /api/v1/apartments | is_hot=1, per_page=4 |
| Start | GET /api/v1/apartments | is_start_sales=1, per_page=4 |

Transform each item to PropertyData for PropertyCard.

---

## 8. Apartment page (страница квартиры) — RedesignApartment

**UI route:** `/apartment/:id`

**API:** `GET /api/v1/apartments/{id}` — id = 24-символьный идентификатор (MongoDB ObjectId).

| Data | API |
|------|-----|
| Apartment detail | GET /api/v1/apartments/{id} |
| Response | ApartmentResource (full: block, building, finishing, area, price, plan_url, etc.) |

**Mapping:**
- planImage → plan_url
- rooms → room (0=студия)
- area → area.total
- kitchenArea → area.kitchen
- floor, totalFloors → floor, floors_total
- price, pricePerMeter → price, price_per_meter
- finishing → finishing.name
- complex → block (name, district, address, subways from block)
- building → building (name, deadline_at)

---

## 9. Search (RedesignHeader)

| Expected | API |
|----------|-----|
| Live search | GET /api/v1/search?q={query} |
| Response | { data: { residential_complexes, apartments } } |
| residential_complexes | id, slug, name, district, metro, subtitle |
| apartments | id, slug, title, block_name, price |

Map to dropdown items: complex → Link **`/complex/{slug}`**, apartment → Link **`/apartment/{id}`**.

---

## 10. Map (blocks for map)

| Data | API |
|------|-----|
| Blocks with coords | GET /api/v1/blocks/map |
| Response | data[]: id, slug, name, lat, lng, price_from, units_count, image |

Use for MapSearch markers.

---

## 11. LatestNews

| API | Response |
|-----|----------|
| GET /api/v1/news | data[], meta |
| Fields | title, slug, excerpt, image, published_at, category |

---

## 12. AboutPlatform (статистика)

| API | Response |
|-----|----------|
| GET /api/v1/stats/platform | total_objects, total_users, total_regions, years_on_market |

---

## 13. Layouts (LayoutGroup)

API не возвращает «группы планировок». Группировка на фронте:
- Источник: GET /api/v1/blocks/{id}/apartments
- Группировать по (room, area_total) с округлением площади
- Для каждой группы: rooms, area, priceFrom (min), planImage (первая plan_url), availableCount

---

## 14. Chessboard

API не возвращает «шахматку». Нужно:
- buildings: GET /api/v1/blocks/{id} → buildings[]
- apartments: GET /api/v1/blocks/{id}/apartments
- Собрать сетку floor × building на фронте. Статус ячеек — **нет в API** (все «свободна» или скрыть).

---

## 15. Catalog (квартиры) — если нужен

Сейчас strict-template каталог — только ЖК (RedesignCatalog). Каталог квартир:
- GET /api/v1/apartments
- Параметры: price_min, price_max, room[], district[], builder[], finishing[], area_min, area_max, floor_min, floor_max, deadline_from, deadline_to, search, sort, order
- Фильтры: GET /api/v1/filters → rooms, districts, builders, finishings, price, area, floor, deadline
