# IMPLEMENTATION_PLAN — Интеграция strict-template в livegrid

**Цель:** Заменить UI livegrid на strict-template, сохранив backend и API.

---

## Этап 0. Подготовка (до кода)

1. Утвердить FRONTEND_BLOCK_AUDIT.md, API_TO_UI_MAPPING.md, ROUTING_PLAN.md.
2. Создать ветку `feature/strict-template-integration`.

---

## Этап 1. Роутер (первый шаг внедрения)

- В App (или роутере) завести маршруты по ROUTING_PLAN.md:
  - `/` → RedesignIndex
  - `/catalog` → RedesignCatalog
  - `/complex/:slug` → RedesignComplex
  - `/apartment/:id` → RedesignApartment
  - `/map` → RedesignMap
  - `/search` → Search results page
- Добавить редиректы для обратной совместимости:
  - `/zhk/:slug` → `/complex/:slug`
  - `/object/:slug` → `/apartment/:slug`
- Все ссылки в приложении должны вести на `/complex/` и `/apartment/` (не на legacy `/zhk/`, `/object/`).

---

## Этап 2. Базовая структура

### 2.1 Скопировать strict-template в livegrid frontend

- Скопировать `strict-template-temp/src/redesign/` → `frontend/src/redesign/`.
- Скопировать недостающие UI компоненты из strict-template (если отличаются).
- Убедиться, что пути `@/` резолвятся.

### 2.2 Удалить mock-данные

- Удалить или заменить импорты из `@/redesign/data/mock-data`.
- Создать `src/api/` (если ещё нет) и типы под API.

---

## Этап 2. API слой

### 3.1 Файлы API

| File | Endpoints | Назначение |
|------|-----------|------------|
| api/blocks.ts | GET /blocks, /blocks/{id}, /blocks/{id}/apartments, /blocks/filters, /blocks/map | ЖК |
| api/apartments.ts | GET /apartments, /apartments/{id} | Квартиры |
| api/filters.ts | GET /filters | Фильтры квартир |
| api/search.ts | GET /search?q= | Поиск |
| api/stats.ts | GET /stats/platform | Статистика |
| api/news.ts | GET /news, /news/{slug} | Новости |

Использовать существующий `lib/api.ts` (axios instance).

### 3.2 Хуки

| Hook | API | Данные |
|------|-----|--------|
| useBlocks | GET /blocks | Paginated blocks, filters |
| useBlockDetail | GET /blocks/{id} | Block detail |
| useBlockApartments | GET /blocks/{id}/apartments | Apartments in block |
| useBlockFilters | GET /blocks/filters | Filter options for ЖК |
| useApartments | GET /apartments | Paginated apartments, filters |
| useApartmentDetail | GET /apartments/{id} | Apartment detail |
| useFilters | GET /filters | Filter options for apartments |
| useLiveSearch | GET /search?q= | Search results |
| usePlatformStats | GET /stats/platform | Stats for AboutPlatform |
| useLatestNews | GET /news | News list |
| useHotDeals | GET /apartments?is_hot=1 | Hot section |
| useStartSales | GET /apartments?is_start_sales=1 | Start sales section |

Часть хуков уже есть в livegrid — переиспользовать.

---

## Этап 4. Адаптация компонентов

### 4.1 ComplexCard

- **Вход:** BlockListItem (из API).
- **Маппинг:** name, slug, images[0], district.name, address, subways[0], builder.name, deadline_label, price_from, units_count, room_groups.
- **Нет в API:** advantages → [].
- **status:** Определять по deadline или оставить «Строится».

### 4.2 FilterSidebar (каталог ЖК)

- Загружать опции из GET /api/v1/blocks/filters.
- Применять фильтры к useBlocks (district[], builder[], search, deadline_from, deadline_to).
- Убрать subway, finishing, status, rooms (или маппить, если добавим в API позже).

### 4.3 RedesignCatalog

- useBlocks + useBlockFilters.
- URL params: ?district[]=&builder[]=&search=&sort=&order=&page=
- ComplexCard для каждого блока.

### 4.4 ComplexHero

- useBlockDetail(slug).
- Маппинг полей из BlockDetail.
- advantages = [].

### 4.5 ApartmentTable

- useBlockApartments(blockId).
- Маппинг ApartmentListItem → Apartment (template). status не показывать или «—».

### 4.6 RedesignApartment

- useApartmentDetail(id). Роут **/apartment/:id**, id = 24-символьный идентификатор из API.
- Маппинг ApartmentResource → template Apartment.

### 3.7 PropertyGridSection

- Заменить mock на useHotDeals / useStartSales.
- Преобразовать ApartmentListItem → PropertyData для PropertyCard.

### 4.8 RedesignHeader (search)

- useLiveSearch(query).
- Маппинг: комплексы → Link **/complex/{slug}**, квартиры → Link **/apartment/{id}**.

### 4.9 MapSearch (RedesignMap)

- useBlocks с limit без пагинации или GET /blocks/map.
- Маркеры по lat, lng.

### 3.10 LayoutGrid, Chessboard

- LayoutGrid: группировать apartments по (room, area) на фронте.
- Chessboard: строить из buildings + apartments; статус ячеек не показывать (нет в API).

---

## Этап 5. Маршрутизация (см. ROUTING_PLAN.md)

- Итоговая структура роутов (strict-template):
  - **/** → RedesignIndex
  - **/catalog** → RedesignCatalog (каталог ЖК)
  - **/complex/:slug** → RedesignComplex
  - **/apartment/:id** → RedesignApartment
  - **/map** → RedesignMap
  - **/search** → Search results
  - Остальные (news, auth, ipoteka, favorites, contacts, admin) без изменений.

- Все внутренние ссылки в шаблоне: **/complex/{slug}**, **/apartment/{id}**. Legacy `/zhk/` и `/object/` не использовать.

- Обратная совместимость: редиректы на frontend:
  - `/zhk/:slug` → `/complex/:slug`
  - `/object/:slug` → `/apartment/:slug`

---

## Этап 5. Состояния (loading, error, empty)

- Для каждого компонента с API:
  - loading → Skeleton или спиннер.
  - error → сообщение + retry.
  - empty → «Ничего не найдено» и т.п.

---

## Этап 7. Поиск и фильтры

- Live search: useLiveSearch с debounce.
- Фильтры каталога ЖК: синхронизация с URL (useSearchParams).
- Фильтры каталога квартир: аналогично, через useApartments.

---

## Этап 8. Производительность

- Lazy load страниц (уже есть в App).
- Кэш react-query (уже используется).
- Оптимизация изображений (lazy, sizes).
- Мемоизация тяжёлых списков.

---

## Этап 9. Валидация компонентов и финальная проверка

- Убедиться, что компоненты работают с новыми маршрутами (см. ROUTING_PLAN.md, п. 6):
  - **ComplexCard** — ссылка `/complex/{slug}`.
  - **ComplexHero** — страница по `/complex/:slug`, данные по slug.
  - **ApartmentTable** — ссылки на квартиры `/apartment/{id}`.
  - **PropertyCard** — для квартиры `/apartment/{id}`, для ЖК `/complex/{slug}`.
  - **Search** — результаты ведут на `/complex/{slug}` и `/apartment/{id}`.
  - **Map** — баллуны/маркеры ссылаются на `/complex/{slug}`, `/apartment/{id}`.

## Этап 10. Финальная проверка

- Все маршруты работают.
- Данные приходят из API.
- Нет обращений к mock.
- Фильтры, поиск, пагинация работают.
- Mobile layout корректен.

---

## Порядок внедрения (обязательный)

1. **Роутер** — завести маршруты `/`, `/catalog`, `/complex/:slug`, `/apartment/:id`, `/map`, `/search`; редиректы `/zhk/:slug` → `/complex/:slug`, `/object/:slug` → `/apartment/:slug`.
2. **Каталог** (`/catalog`) — RedesignCatalog, ComplexCard, FilterSidebar, API blocks + filters.
3. **Страница ЖК** (`/complex/:slug`) — RedesignComplex, ComplexHero, ApartmentTable, API blocks/{slug}, blocks/{id}/apartments.
4. **Страница квартиры** (`/apartment/:id`) — RedesignApartment, API apartments/{id}.
5. **Поиск** (`/search`) — страница результатов, live search, ссылки на /complex/{slug} и /apartment/{id}.
6. **Карта** (`/map`) — RedesignMap, MapSearch, API blocks/map.
7. **Главная** — RedesignIndex, блоки (Hero, featured, PropertyGridSection, новости и т.д.).
8. API слой + хуки (общие для всех страниц).
9. Состояния loading/error/empty, производительность.
10. Валидация компонентов (ComplexCard, ComplexHero, ApartmentTable, PropertyCard, Search, Map) и cleanup.

---

## Риски и ограничения

- **Нет status у квартир** — колонку в ApartmentTable скрыть или показывать «—».
- **Нет advantages, infrastructure** — оставить пустыми или не выводить блоки.
- **Chessboard** — без статусов ячеек, только базовая сетка.
- **Совместимость slug** — блоки используют slug вида `zhk-name-{id}`; apartments — id (24 hex).
