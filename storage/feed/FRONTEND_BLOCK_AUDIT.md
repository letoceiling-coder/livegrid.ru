# FRONTEND_BLOCK_AUDIT — strict-template

**Источник:** https://github.com/Neeklo1606/strict-template.git  
**Дата аудита:** 2026-03-03

---

## 1. Homepage blocks (RedesignIndex)

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **Hero** | Inline in RedesignIndex | Регион, поиск, быстрые фильтры | region, searchQuery, quickFilters | Hardcoded `regions`, `quickFilters` |
| **Category Tiles** | `@/components/CategoryTiles` | Плитки категорий (Новостройки, Вторичка и т.д.) | items[] with name, link | Static config (no API) |
| **Featured Complexes** | `ComplexCard` (redesign) | Популярные ЖК (grid/map toggle) | ResidentialComplex[] | `complexes` from mock-data |
| **Property Grid (Hot)** | `PropertyGridSection` type="hot" | Горячие предложения | PropertyData[] (apartments) | `hotDeals` array in PropertyGridSection |
| **Property Grid (Start)** | `PropertyGridSection` type="start" | Старт продаж | PropertyData[] | `startSales` array in PropertyGridSection |
| **Quiz Section** | `QuizSection` | Подбор объекта (форма) | — | Static UI |
| **About Platform** | `AboutPlatform` | О платформе, статистика | stats | Static / could use stats API |
| **Map CTA** | Inline | CTA на карту | — | Static |
| **Help CTA** | Inline | «Нужна помощь с выбором» | — | Static |
| **Additional Features** | `AdditionalFeatures` | Доп. возможности (ипотека, подбор и т.д.) | — | Static |
| **Latest News** | `LatestNews` | Последние новости | news[] | Likely mock/static in template |
| **Contacts** | `ContactsSection` | Контакты | — | Static |
| **Footer** | `FooterSection` | Подвал | — | Static |

---

## 2. Catalog blocks (RedesignCatalog — ЖК)

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **Toolbar** | Inline | Заголовок, счётчик, view toggle (grid/list/map), моб. фильтры | totalCount, viewMode | `filtered.length` from mock `complexes` |
| **Filter Sidebar** | `FilterSidebar` (redesign) | Фильтры: поиск, комнаты, цена, площадь, район, метро, застройщик, отделка, срок, статус, этаж | CatalogFilters, districts, subways, builders, deadlines | `districts`, `subways`, `builders`, `deadlines` from mock-data |
| **Complex Grid** | `ComplexCard` variant="grid" | Сетка карточек ЖК | ResidentialComplex[] | `complexes` filtered client-side |
| **Complex List** | `ComplexCard` variant="list" | Список карточек ЖК | ResidentialComplex[] | Same |
| **Map View** | `MapSearch` | Карта с маркерами ЖК | ResidentialComplex[], activeSlug | Same |
| **Empty State** | Inline | «Ничего не найдено» | — | When filtered.length === 0 |
| **Mobile Filters** | Drawer with FilterSidebar | Мобильные фильтры | Same as FilterSidebar | Same |

---

## 3. Object (Block/Complex) page blocks (RedesignComplex)

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **Breadcrumb** | Inline | Навигация | Catalog, complex name | `complex.name` |
| **Complex Hero** | `ComplexHero` | Галерея, название, адрес, метро, статус, цена от, застройщик, срок, преимущества | ResidentialComplex | `getComplexBySlug(slug)` |
| **Tabs** | TabsList/TabsTrigger | Квартиры, Планировки, Шахматка, О комплексе, Инфраструктура, Карта | — | Static |
| **Apartments Table** | `ApartmentTable` | Таблица квартир с сортировкой | Apartment[], sort, onSort | `complex.buildings.flatMap(b => b.apartments)` |
| **Room Filter** | Inline buttons | Фильтр по комнатности | roomCounts, roomFilter | From apartments |
| **Layout Grid** | `LayoutGrid` | Планировки (группы по комнаты+площадь) | LayoutGroup[] | `getLayoutGroups(complexId)` |
| **Chessboard** | `Chessboard` | Шахматка по корпусам/этажам | buildings, apartments | From complex |
| **About Tab** | Inline | Описание, преимущества | description, advantages | From complex |
| **Infrastructure Tab** | Inline | Инфраструктура | infrastructure[] | From complex |
| **Map Tab** | Yandex Maps | Карта с маркером | coords, address | `complex.coords` |

---

## 4. Apartment page blocks (RedesignApartment)

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **Breadcrumb** | Inline | Каталог / ЖК / квартира | — | From getApartmentById |
| **Plan Image** | Inline | Планировка | planImage URL | `apt.planImage` |
| **Info Sidebar** | Inline | Название ЖК, корпус, адрес, цена, ₽/м², детали | apartment, complex, building | `getApartmentById(id)` |
| **Details** | Inline | Комнаты, площадь, кухня, этаж, отделка, срок, район, метро | — | From apt, building, complex |
| **CTA** | Buttons | Позвонить, Записаться | — | Static |
| **Description** | Inline | «О квартире» текст | — | Generated from apt/complex |

---

## 5. Map page blocks (RedesignMap)

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **Map** | MapSearch or similar | Карта всех ЖК | ResidentialComplex[] | `complexes` |
| **Filters** | Possibly FilterSidebar | Фильтры для карты | CatalogFilters | `defaultFilters` |

---

## 6. Layouts page blocks (RedesignLayouts)

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **Layout Grid** | `LayoutGrid` | Группы планировок по комнатам+площади | LayoutGroup[] | `getLayoutGroups(complexId)` |

---

## 7. Navigation blocks

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **Header** | `RedesignHeader` | Лого, нав, поиск, избранное, телефон, войти | navItems | Static |
| **Search Dropdown** | Inline in RedesignHeader | Живой поиск ЖК | ResidentialComplex[] | `searchComplexes(query)` (mock) |
| **Mobile Menu** | Inline | Бургер-меню | navItems | Static |
| **Mobile Bottom Nav** | Inline | Нижняя навигация (Главная, Каталог, Карта, Застройщики) | — | Static |

---

## 8. Filters

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **Filter Sidebar** | `FilterSidebar` | Полный набор фильтров | CatalogFilters, options (districts, subways, builders, deadlines) | mock-data |
| **Search Input** | In FilterSidebar | Поиск по названию, району | search string | filters.search |
| **Active Tags** | In FilterSidebar | Активные фильтры (чипы) | Active filters | Derived from filters |

---

## 9. Cards & Lists

| Block | Component File | Purpose | Expected Data | Mock Data Source |
|-------|----------------|---------|---------------|------------------|
| **ComplexCard** | `redesign/components/ComplexCard` | Карточка ЖК (grid/list) | ResidentialComplex | mock `complexes` |
| **PropertyCard** | `PropertyCard` | Карточка квартиры | PropertyData (image, title, price, address, area, rooms, badges) | hotDeals, startSales arrays |
| **ApartmentTable** | `ApartmentTable` | Таблица квартир | Apartment[] | From complex.buildings[].apartments |

---

## 10. Shared components (from pages, not redesign)

| Component | Used In | Purpose | Mock/API |
|-----------|---------|---------|----------|
| CategoryTiles | RedesignIndex | Категории | Static |
| PropertyGridSection | RedesignIndex | Hot / Start sections | **Mock** (hotDeals, startSales) |
| QuizSection | RedesignIndex | Квиз подбора | Static |
| AboutPlatform | RedesignIndex | О платформе | Static / stats |
| AdditionalFeatures | RedesignIndex | Доп. возможности | Static |
| LatestNews | RedesignIndex | Новости | Likely mock or needs API |
| ContactsSection | RedesignIndex | Контакты | Static |
| FooterSection | RedesignIndex | Футер | Static |

---

## 11. Mock data summary

| Source | Content | Used By |
|--------|---------|---------|
| `mock-data.ts` | `complexes`, `getComplexBySlug`, `getApartmentById`, `getLayoutGroups`, `searchComplexes`, `districts`, `subways`, `builders`, `deadlines`, `formatPrice` | RedesignIndex, RedesignCatalog, RedesignComplex, RedesignApartment, RedesignMap, RedesignLayouts, RedesignHeader, FilterSidebar, ComplexCard, ComplexHero, ApartmentTable, Chessboard, LayoutGrid, MapSearch |
| `PropertyGridSection.tsx` | `hotDeals`, `startSales` (PropertyData[]) | PropertyGridSection (hot/start) |
| `types.ts` | ResidentialComplex, Building, Apartment, LayoutGroup, CatalogFilters, SortField, SortDir | All redesign components |

---

## 12. Gaps (strict-template vs livegrid API)

- **ResidentialComplex** = Block (ЖК) in API. Template uses `slug`; API has `slug` (from Block model).
- **Apartment** in template has `status` (available/reserved/sold); **API apartments have no status**.
- **advantages**, **infrastructure** — in template; **API blocks have no these fields**.
- **LayoutGroup** — template groups by rooms+area; API has apartments, can be grouped on frontend.
- **PropertyCard** expects `PropertyData` (image, title, price, address, area, rooms, badges). API apartments have different shape (block_name, plan_url, area.total, room_label, etc.).
- **ComplexCard** expects full ResidentialComplex with buildings[].apartments. API BlockListResource has `room_groups`, `price_from`, `units_count` — no full buildings in list.
- **Filter options** (districts, subways, builders, deadlines) — API has `GET /api/v1/filters` and `GET /api/v1/blocks/filters` with id+name structures.
