# Полный аудит frontend livegrid

**Область анализа:** только `frontend/src`. Backend, API, parser не учитываются.

---

# ШАГ 1 — Структура страниц

## Роутинг

**Файл:** `App.tsx`  
**Роутер:** `react-router-dom` (BrowserRouter, Routes, Route).

## Список реальных URL (публичные)

| URL | Страница (компонент) | Назначение |
|-----|----------------------|------------|
| `/` | Index | Главная (секции из content-store) |
| `/catalog` | Catalog | Каталог объектов (квартиры/дома — PropertyCard) |
| `/catalog-zhk` | CatalogZhk | Каталог ЖК (карточки ZhkCard) |
| `/zhk/:slug` | ZhkDetail | Детальная страница ЖК |
| `/object/:slug` | ObjectDetail | Детальная страница объекта (квартира/дом) |
| `/news` | News | Список новостей |
| `/news/:slug` | NewsDetail | Детальная новость |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | Login, Register, ForgotPassword, ResetPassword | Авторизация |
| `/admin/*` | AdminLayout + вложенные | Админка (страницы, медиа, пользователи, настройки, токены, редактор) |
| `*` | NotFound | 404 |

## Наличие страниц из шаблонов донора

| Страница донора | Есть во frontend? | URL во frontend | Примечание |
|-----------------|-------------------|-----------------|------------|
| Каталог ЖК | Да | `/catalog-zhk` | Список карточек ЖК |
| Детальная ЖК | Да | `/zhk/:slug` | Один slug в URL |
| Квартира (деталь) | Да (как объект) | `/object/:slug` | Один slug; не разделены ЖК и квартира по URL |
| Планировки | Нет отдельной страницы | — | Планировки показываются внутри ZhkDetail (таблица по типам + раскрытие квартир) |
| Шахматка | Нет | — | Отдельного роута `/zhk/:slug/checkerboard` нет |
| Карта (каталог) | Нет страницы | — | Кнопка «На карте» есть, но ведёт в никуда / без роута |
| Таблица квартир (отдельный вид) | Нет | — | Таблица квартир только внутри ZhkDetail по типам комнат |
| Таблица комплексов | Нет | — | Только сетка карточек в `/catalog-zhk` |

**Итог:** есть каталог ЖК, деталь ЖК, деталь объекта (квартира). Нет отдельных страниц: планировки, шахматка, карта, таблица квартир/комплексов.

---

# ШАГ 2 — Компоненты по страницам

## 2.1 Страница: Каталог ЖК (`/catalog-zhk`)

**Файл:** `pages/CatalogZhk.tsx`

**Компоненты:**
- Header
- ZhkCard (в цикле по `allZhk`)
- PropertyGridSection (title="Старт продаж", type="start")
- AboutPlatform, AdditionalFeatures, LatestNews, ContactsSection, FooterSection

**Данные:** локальный массив `allZhk: ZhkData[]` (мок). Нет запросов к API блоков.

**ZhkCard — используемые поля:**

| Prop / поле | Используется? | Где |
|-------------|---------------|-----|
| data.images | Да | data.images[photoIdx], data.images.length, слайдер точек |
| data.name | Да | alt, заголовок карточки |
| data.price | Да | справа в карточке |
| data.unitsCount | Да | под названием |
| data.badges | Да | массив бейджей сверху слева |
| data.apartments | Да | slice(0, 4) в overlay при hover/tap — type, area, price |
| data.slug | Да | для навигации navigate(`/zhk/${slug}`); fallback `'smorodina'` если нет |

**Передаётся, но не используется:** нет лишних полей; интерфейс ZhkData только эти поля и содержит.

---

## 2.2 Страница: Детальная ЖК (`/zhk/:slug`)

**Файл:** `pages/ZhkDetail.tsx`

**Компоненты:**
- Header
- ZhkCard (блок «Похожие объекты» — similarZhk)
- PropertyGridSection не используется на этой странице
- AboutPlatform, AdditionalFeatures, LatestNews, ContactsSection, FooterSection

**Данные:** локальный объект `zhkDatabase: Record<string, …>` и `mockFlats: Record<string, FlatData[]>`. Выбор по `useParams().slug`; fallback `'smorodina'`.

**Структура данных ЖК (ожидаемая страницей):**

| Поле | Используется? | Где |
|------|---------------|-----|
| name | Да | Hero, breadcrumb, карта, инфраструктура |
| heroImage | Да | Одно изображение в hero |
| deliveryDate | Да | Под названием «Сдача в эксплуатацию» |
| priceFrom | Да | Карточка над таблицей, заголовок таблицы |
| pricePerM2 | Да | Бейдж справа от заголовка таблицы |
| mortgage | Да | В карточке над таблицей |
| apartments | Да | Таблица по типам: type, count, area, price; раскрытие по клику |
| description | Да | Блок «О проекте» (массив параграфов) |
| quota | Да | Квота в блоке «О проекте» |
| floors | Да | Этажность |
| areaTotal | Да | Площадь |
| developer | Да | Блок «О застройщике» (массив параграфов) |
| infrastructure | Да | Сетка карточек (title, image, accent); фильтр !accent для карточек |

**Таблица квартир (mockFlats) — FlatData:**

| Поле | Используется? | Где |
|------|---------------|-----|
| slug | Да | Link to={`/object/${flat.slug}`} |
| planImage | Да | Миниатюра в таблице |
| building | Да | Колонка «Корп.» |
| section | Да | Колонка «Секц.» |
| floor | Да | Колонка «Эт.» |
| number | Да | Колонка «№ кв.» |
| area | Да | S прив. |
| kitchenArea | Да | S кухни |
| finishing | Да | Колонка «Отделка» |
| basePrice | — | Не выводится отдельно |
| fullPrice | Да | Колонка «При 100%» |
| pricePerM2 | Да | Колонка «За м²» |
| status | Да | Колонка «Статус», стили (Свободна / Бронь) |

---

## 2.3 Страница: Деталь объекта/квартиры (`/object/:slug`)

**Файл:** `pages/ObjectDetail.tsx`

**Компоненты:**
- Header
- ZhkCard (похожие ЖК)
- PropertyCard (похожие объекты)
- QuizSection, AboutPlatform, AdditionalFeatures, LatestNews, ContactsSection, FooterSection
- Tabs (Планировка, Описание, Инфраструктура)

**Данные:** один локальный объект `objectData`. Параметр `slug` из useParams не используется для выбора данных (всегда один и тот же objectData).

**Ожидаемая структура объекта (objectData):**

| Поле | Используется? | Где |
|------|---------------|-----|
| name | Да | Breadcrumb, галерея alt |
| price | Да | Сайдбар |
| pricePerM2 | Да | Сайдбар |
| rooms | Да | Сайдбар, вкладка «Планировка» |
| area | Да | Сайдбар, вкладка «Планировка» |
| floor | Да | Сайдбар |
| type | Да | Сайдбар «Тип» |
| finish | Да | characteristics (как value «Черновая») |
| zhkName | Да | Breadcrumb, карта |
| zhkSlug | Да | Link to={`/zhk/${d.zhkSlug}`} |
| deliveryDate | Не выводится в текущем коде | — |
| images | Да | Галерея (mainPhoto + thumbnails) |
| description | Да | Вкладка «Описание» |
| characteristics | Да | Сетка под описанием (label, value, icon) |
| developer | Да | Блок «О застройщике» |
| infrastructure | Да | Вкладка «Инфраструктура» (title, image, accent) |

**Передаётся, но не используется:** deliveryDate в objectData есть в моке, на странице не отображается.

---

## 2.4 Страница: Каталог (`/catalog`)

**Файл:** `pages/Catalog.tsx`

**Компоненты:**
- Header
- PropertyCard (в цикле по paged из allProperties)
- PropertyGridSection (title="Горячие предложения", type="hot")
- QuizSection, AboutPlatform, AdditionalFeatures, LatestNews, ContactsSection, FooterSection
- Pagination, Checkbox (фильтры)

**Данные:** мок `allProperties: PropertyData[]`. Пагинация и фильтры только по локальному массиву.

**PropertyCard — используемые поля:**

| Prop / поле | Используется? | Где |
|-------------|---------------|-----|
| data.image | Да | Одно изображение карточки |
| data.title | Да | Заголовок, генерация slug если slug нет |
| data.price | Да | Справа вверху |
| data.address | Да | Под заголовком (если нет description) |
| data.area | Да | Под адресом |
| data.rooms | Да | Под адресом |
| data.badges | Да | Бейджи сверху слева (если есть) |
| data.slug | Да | Link to={`/object/${slug}`}; иначе slug из title |
| data.description | Да | Если есть — показывается вместо address+area+rooms |

**Передаётся, но не используется:** нет.

---

## 2.5 Главная (`/`)

**Файл:** `pages/Index.tsx`

**Компоненты:** из content-store выбираются секции для страницы с slug === '/'. Рендер по типу секции: hero → HeroSection, category_tiles → CategoryTiles, new_listings → NewListings, catalog_zhk → CatalogZhk (компонент секции, не страница), quiz → QuizSection, about_platform → AboutPlatform, additional_features → AdditionalFeatures, latest_news → LatestNews, contacts → ContactsSection, footer → FooterSection. Для property_grid → PropertyGridSection с title и gridType из settings.

**Данные:** страницы и секции из `useContentStore` (админский контент). Секции не передают данные блоков/квартир — внутри NewListings и CatalogZhk свои моки.

---

# ШАГ 3 — Ожидаемая структура данных (по факту использования во frontend)

## Карточка ЖК (ZhkCard / каталог и «похожие»)

```ts
{
  images: string[];        // URL или import — массив, минимум 1; используется [photoIdx], length
  name: string;
  price: string;           // уже отформатировано, например "от 5.6 млн"
  unitsCount: string;      // например "В продаже 226 квартир"
  badges: string[];
  apartments: { type: string; area: string; price: string }[];  // до 4 в overlay
  slug?: string;           // опционально; иначе fallback 'smorodina'
}
```

**Примечание:** frontend не ожидает id, min_price (number), apart_count (number), subways, region, address, builder отдельно — в карточке только name, price (строка), unitsCount (строка), badges, apartments (type, area, price), images, slug.

---

## Детальная ЖК (ZhkDetail)

```ts
{
  name: string;
  heroImage: string;
  deliveryDate: string;
  priceFrom: string;
  pricePerM2: string;
  mortgage: string;
  apartments: { type: string; count: number; area: string; price: string }[];
  description: string[];
  quota: string;
  floors: string;
  areaTotal: string;
  developer: string[];
  infrastructure: { title: string; image: string; accent?: boolean }[];
}
```

Квартиры в таблице (FlatData):

```ts
{
  slug: string;
  planImage: string;
  building: string;
  section: string;
  floor: string;
  number: string;
  area: string;
  kitchenArea: string;
  finishing: string;
  basePrice: string;
  fullPrice: string;
  pricePerM2: string;
  status: string;  // "Свободна" | "Бронь" и т.д.
}
```

---

## Деталь объекта/квартиры (ObjectDetail)

```ts
{
  name: string;
  price: string;
  pricePerM2: string;
  rooms: string;
  area: string;
  floor: string;
  type: string;
  finish: string;
  zhkName: string;
  zhkSlug: string;
  deliveryDate?: string;
  images: string[];
  description: string[];
  characteristics: { label: string; value: string; icon: Component }[];
  developer: string[];
  infrastructure: { title: string; image: string; accent?: boolean }[];
}
```

---

## Карточка объекта (PropertyCard)

```ts
{
  image: string;
  title: string;
  price: string;
  address: string;
  area?: string;
  rooms?: string;
  badges?: string[];
  slug?: string;
  description?: string;
}
```

---

# ШАГ 4 — Сопоставление с БД

Используется сводка из UI_DATA_MAPPING_LIVEGRID.md (поля БД livegrid).

## Карточка ЖК (ZhkCard)

| Поле frontend | Есть в БД? | Нужно трансформировать? |
|---------------|------------|--------------------------|
| images | Частично (blocks.images JSON) | Да — привести к массиву URL или path+file_name |
| name | Да (blocks.name) | Нет |
| price | Да (blocks.price_from / min_price) | Да — форматировать в строку «от N млн» |
| unitsCount | Да (blocks.units_count) | Да — в строку типа «В продаже N квартир» |
| badges | Нет | Да — собирать из advantages/finishing или не показывать |
| apartments (type, area, price) | Нет (min_prices[] в БД нет) | Да — либо агрегат по квартирам по типам комнат, либо не показывать |
| slug | Нет (только blocks.id) | Да — использовать id в URL или добавить slug в БД |

## Детальная ЖК (ZhkDetail)

| Поле frontend | Есть в БД? | Нужно трансформировать? |
|---------------|------------|--------------------------|
| name | Да | Нет |
| heroImage | Частично (blocks.images) | Да — первый элемент или primary |
| deliveryDate | Частично (deadline_at) | Да — формат в строку типа «Март 2027» |
| priceFrom, pricePerM2 | Да (min_price, price_from) | Да — форматирование |
| mortgage | Нет | Да — нет в БД |
| apartments (type, count, area, price) | Частично (units_count есть; по типам — нет) | Да — агрегат по apartments по room type |
| description | Да | Нет |
| quota | Да (units_count) | Да — в строку «N квартир» |
| floors | Нет на блоке | Через buildings.floors_total или не показывать |
| areaTotal | Нет на блоке | Агрегат по квартирам или не показывать |
| developer | Да (builder_name / builder) | Нет |
| infrastructure | Нет | Нет в БД — не заполнить |
| Квартиры в таблице (FlatData): slug | Нет (apartment id есть) | Использовать id в URL или slug |
| planImage | Да (apartments.plan_url) | Нет |
| building, section | building — да (Building.name); section — нет | section — нет в БД |
| floor, number, area, kitchenArea, finishing | Да | Форматирование |
| fullPrice, pricePerM2 | price есть | Форматирование |
| status | Нет в БД | Нет — не заполнить |

## Деталь объекта (ObjectDetail)

| Поле frontend | Есть в БД? | Трансформация? |
|---------------|------------|-----------------|
| name, price, pricePerM2, rooms, area, floor, type, finish | Да (apartment + relations) | Форматирование |
| zhkName, zhkSlug | block_name — да; slug — нет | zhkSlug — id или slug |
| images | Нет (у квартиры только plan_url) | Один plan_url или пустой массив |
| description, characteristics, developer | description нет у квартиры; developer через block | Взять от блока |
| infrastructure | Нет | Не заполнить |

## PropertyCard (каталог/объекты)

| Поле frontend | Есть в БД? | Трансформация? |
|---------------|------------|-----------------|
| image | blocks.images / apartments нет | От блока — images[0] |
| title | block_name / name | Для объекта — сформировать из квартиры или блока |
| price, address, area, rooms | Есть на блоке/квартире | Форматирование |
| badges, slug | badges нет; slug нет | slug = id или добавить поле |
| description | Нет | Не заполнить |

---

# ШАГ 5 — Критичные несоответствия

| Что ожидает frontend | Есть в БД? | Критичность |
|----------------------|------------|-------------|
| **slug** (для ссылок /zhk/:slug, /object/:slug) | Нет | Высокая — роуты по slug; сейчас мок с slug; без slug только id в URL |
| **gallery / heroImage** (одно или массив изображений ЖК) | blocks.images (JSON) | Средняя — структура images не задана; нет isPrimary |
| **min_prices / apartments по типам** (type, area, price для карточки и детали ЖК) | Нет min_prices; есть apartments | Средняя — можно собрать из apartments по room type; без доработки БД — тяжёлый запрос |
| **unitsCount** (строка) | units_count (integer) | Низкая — форматирование в строку |
| **badges** (массив строк) | Нет | Средняя — нет в БД; можно не показывать или вывести пустой массив |
| **status квартиры** (Свободна, Бронь и т.д.) | Нет | Высокая — в таблице квартир и на детали статус отображается; в БД поля нет |
| **section** (секция/подъезд квартиры) | Нет | Средняя — колонка в таблице есть; в БД нет |
| **Квартира: несколько images** (галерея) | Только plan_url | Средняя — одна планировка есть; галереи фото квартиры нет |
| **mortgage** на детали ЖК | Нет | Низкая — можно скрыть или заглушка |
| **floors / areaTotal** на блоке | Нет на блоке (floors_total у building) | Низкая — можно взять max по корпусам или скрыть |
| **infrastructure** (массив карточек) | Нет | Низкая — блок можно не заполнять или статичный контент |

---

# ШАГ 6 — Поля в БД, которые frontend не использует

Ни одна публичная страница не дергает API блоков/квартир — все данные мок. Ниже — поля БД, которые при подключении к API могли бы не использоваться текущим UI (если отдавать ровно то, что рендерится).

## Блок (blocks)

- **crm_id** — не выводится.
- **district_id** — не выводится (выводится district_name).
- **geometry_json** — не выводится (карта заглушка).
- **is_city** — не выводится в карточке/детали.
- **status** — не выводится в текущем UI (можно для фильтров).
- **max_price, min_area, max_area** — в карточке и детали не используются (используются price_from / min_price и units_count).
- **nearest_deadline_at** — не выводится (используется deliveryDate из одного поля).
- **location** (POINT) — не выводится (карта заглушка).

## Квартира (apartments)

- **crm_id, wc_count, area_balconies, area_rooms, area_rooms_total** — не выводятся в таблице и детали объекта.
- **price_per_meter** — выводится как pricePerM2 (используется).
- **building_type_id** — не выводится в текущем UI.
- **block_district_id, block_district_name, block_builder_id, block_builder_name, block_lat, block_lng, block_is_city** — частично (block_name, builder для ссылки и подписи); остальное не выводится.
- **is_deleted, last_seen_at** — не выводятся (служебные).

## Связи

- **block_subway.travel_type** — не выводится в текущем UI (метро на карточке ЖК нет; на детали ЖК метро не показывается в моках). При добавлении метро нужен маппинг в текст.
- **Region** (отдельная таблица) — во frontend используется только district_name на блоке; связь с regions не используется.

## Модель Media

- Не привязана к блокам/квартирам; во frontend нигде не вызывается для блоков/квартир — **полностью не используется** текущим публичным UI.

---

# Краткая сводка

1. **Страницы:** есть каталог ЖК (`/catalog-zhk`), деталь ЖК (`/zhk/:slug`), деталь объекта (`/object/:slug`), каталог объектов (`/catalog`). Нет отдельных страниц: планировки, шахматка, карта, таблица квартир/комплексов.
2. **Данные:** только моки; запросов к API блоков/квартир нет.
3. **Критичные несоответствия:** нет slug (нужен id в URL или поле slug); нет status у квартиры; нет badges и min_prices по типам на блоке; у квартиры нет галереи (только plan_url).
4. **Лишние для текущего UI поля БД:** crm_id, geometry_json, is_city, status блока, max_price/min_area/max_area, nearest_deadline_at, location POINT; у квартиры — wc_count, area_balconies, area_rooms, building_type_id, is_deleted, last_seen_at; таблица Media не используется.

*Аудит выполнен по коду в `frontend/src` без предположений.*
