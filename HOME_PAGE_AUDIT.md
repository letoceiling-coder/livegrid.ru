# АУДИТ ГЛАВНОЙ СТРАНИЦЫ LIVEGRID — ИНТЕГРАЦИЯ С БД

## 📋 ОБЗОР СТРУКТУРЫ ГЛАВНОЙ СТРАНИЦЫ

Главная страница (`Index.tsx`) состоит из **10 секций**, отображаемых последовательно:

1. **HeroSection** — поиск и табы категорий
2. **CategoryTiles** — плитки категорий недвижимости
3. **NewListings** — новые объявления (8 карточек)
4. **CatalogZhk** — каталог ЖК (8 карточек)
5. **QuizSection** — подбор объекта (квиз)
6. **PropertyGridSection** (hot) — горячие предложения
7. **PropertyGridSection** (start) — стартующие продажи
8. **AboutPlatform** — о платформе (статистика)
9. **AdditionalFeatures** — доп. возможности
10. **LatestNews** — последние новости (8 карточек)
11. **ContactsSection** — контакты
12. **FooterSection** — подвал

---

## 🔍 ДЕТАЛЬНЫЙ АУДИТ СЕКЦИЙ

### ✅ 1. HeroSection — HERO БЛОК С ПОИСКОМ

**Текущее состояние:** Статичная разметка

**Что отображается:**
- Локация: "Москва и МО" (статично)
- Заголовок: "Live Grid. Более 100 000 объектов по России" (статично)
- Поисковая строка (нефункциональна)
- Кнопка "Показать 121 563 объекта" (статично)
- Табы категорий: ['Квартиры', 'Паркинги', 'Дома с участками', 'Участки', 'Коммерция']

**Что нужно из БД:**
```sql
-- 1. Общее количество объектов
SELECT COUNT(*) FROM apartments WHERE is_deleted = 0;

-- 2. Количество по категориям (через room_type или building_type)
SELECT bt.name, COUNT(a.id) 
FROM apartments a
JOIN building_types bt ON a.building_type_id = bt.id
WHERE a.is_deleted = 0
GROUP BY bt.name;
```

**API эндпоинт:**
```
GET /api/v1/stats/general
Ответ:
{
  "total_apartments": 62214,
  "by_category": {
    "apartments": 58000,
    "parking": 3200,
    "houses": 800,
    ...
  }
}
```

**Приоритет:** 🟡 СРЕДНИЙ (только счётчик нужен динамический)

---

### ✅ 2. CategoryTiles — ПЛИТКИ КАТЕГОРИЙ

**Текущее состояние:** Полностью статичный массив с картинками

**Что отображается:**
10 плиток: Новостройки, Вторичная недвижимость, Аренда, Дома, Участки, Ипотека, Квартиры, Паркинги, Коммерческая недвижимость, Подобрать объект

**Что нужно из БД:**
НЕ ТРЕБУЕТСЯ — категории фиксированы и редко меняются

**Изменения:**
- Сделать ссылки рабочими (роутинг на каталог с фильтром)
- Например: `/catalog?type=apartments`, `/catalog?type=parking`

**Приоритет:** 🟢 НИЗКИЙ (только роутинг)

---

### 🔴 3. NewListings — НОВЫЕ ОБЪЯВЛЕНИЯ (КРИТИЧНО!)

**Текущее состояние:** Массив из 8 статичных объектов

**Что отображается:**
```typescript
{
  image: string,
  title: string,      // "ЖК Снегири"
  price: string,      // "от 5.6 млн"
  address: string,    // "Москва, ул. Снежная 12"
  area: string,       // "24 м²"
  rooms: string,      // "Студия"
  badges?: string[]   // ["Рассрочка 1 год"]
}
```

**Что нужно из БД:**
```sql
-- Последние 8 квартир, отсортированные по дате создания
SELECT 
  a.id,
  a.price,
  a.area_total,
  a.room,
  a.plan_url AS image,
  r.name AS room_type,
  b.name AS block_name,
  b.address
FROM apartments a
LEFT JOIN rooms r ON a.room_type_id = r.id
LEFT JOIN blocks b ON a.block_id = b.id
WHERE a.is_deleted = 0
ORDER BY a.created_at DESC
LIMIT 8;
```

**API эндпоинт:**
```
GET /api/v1/apartments?sort=created_at&order=desc&per_page=8
```

**Компонент уже использует:**
- `PropertyCard` — универсальная карточка
- `PropertyData` интерфейс

**Hook для создания:**
```typescript
// frontend/src/hooks/useNewListings.ts
export function useNewListings() {
  return useApartments({ 
    sort: 'created_at', 
    order: 'desc' 
  }, 1, 8);
}
```

**Приоритет:** 🔴 **ВЫСОКИЙ** (динамический контент!)

---

### 🔴 4. CatalogZhk — КАТАЛОГ ЖК (КРИТИЧНО!)

**Текущее состояние:** Массив из 8 статичных ЖК

**Что отображается:**
```typescript
{
  images: string[],       // [building1.jpg, building2.jpg, ...]
  name: string,           // "ЖК Снегири"
  price: string,          // "от 5.6 млн"
  unitsCount: string,     // "В продаже 226 квартир"
  badges: string[],       // ["Рассрочка 1 год", "Ипотека 6%"]
  apartments: [{          // Типы квартир в ЖК
    type: string,         // "Студия"
    area: string,         // "от 24 м.кв."
    price: string         // "от 5.6 млн"
  }]
}
```

**Что нужно из БД:**
```sql
-- Топ-8 ЖК по количеству квартир или популярности
SELECT 
  b.id,
  b.name,
  b.images,              -- JSON array
  b.price_from,
  b.units_count,
  b.address,
  GROUP_CONCAT(DISTINCT a.room) AS available_rooms,
  MIN(a.price) AS min_price_per_room
FROM blocks b
LEFT JOIN apartments a ON a.block_id = b.id AND a.is_deleted = 0
WHERE b.is_deleted = 0
GROUP BY b.id
ORDER BY b.units_count DESC
LIMIT 8;
```

**API эндпоинт:**
```
GET /api/v1/blocks?sort=units_count&order=desc&per_page=8
```

**Hook для создания:**
```typescript
// frontend/src/hooks/useTopBlocks.ts
export function useTopBlocks() {
  return useBlocks({ 
    sort: 'units_count', 
    order: 'desc' 
  }, 1, 8);
}
```

**Badges (значки):**
В БД нет поля `badges`. Варианты:
1. Генерировать бэкендом на основе условий (ипотека < 7%, рассрочка > 6 мес)
2. Добавить JSON поле `badges` в таблицу `blocks`

**Приоритет:** 🔴 **КРИТИЧНО** (ключевой контент страницы!)

---

### 🟡 5. QuizSection — КВИЗ ПОДБОРА

**Текущее состояние:** Полностью UI-логика (выбор типа, цели, бюджета)

**Что отображается:**
- Шаг 1: Тип недвижимости (6 вариантов)
- Шаг 2: Цель покупки (4 варианта)
- Шаг 3: Бюджет (5 диапазонов)

**Что нужно из БД:**
НЕ ТРЕБУЕТСЯ — данные фиксированы

**Изменения:**
- При "Подобрать" отправлять на `/catalog` с фильтрами
- Или отправлять lead в БД (таблица `leads`)

**Приоритет:** 🟡 СРЕДНИЙ (функционал submit)

---

### 🔴 6 & 7. PropertyGridSection — ГОРЯЧИЕ / СТАРТУЮЩИЕ

**Текущее состояние:** 2 статичных массива по 4 объекта

**Что отображается:**
- **Hot Deals** — горячие предложения со скидками
- **Start Sales** — стартующие продажи (будущие ЖК)

**Что нужно из БД:**
```sql
-- HOT DEALS: квартиры с максимальной скидкой или спецпредложениями
SELECT ... FROM apartments 
WHERE discount > 0 OR has_special_offer = 1
ORDER BY discount DESC
LIMIT 4;

-- START SALES: ЖК с датой начала продаж в будущем
SELECT b.*, bld.deadline_at
FROM blocks b
JOIN buildings bld ON bld.block_id = b.id
WHERE bld.deadline_at > NOW()
ORDER BY bld.deadline_at ASC
LIMIT 4;
```

**Проблема:**
В БД нет полей `discount`, `has_special_offer`, нужно добавить или использовать другую логику (например, топ по просмотрам)

**API эндпоинт:**
```
GET /api/v1/apartments?filter=hot&per_page=4
GET /api/v1/blocks?filter=start_sales&per_page=4
```

**Приоритет:** 🔴 ВЫСОКИЙ (нужна логика badges/фильтрации)

---

### 🟢 8. AboutPlatform — О ПЛАТФОРМЕ

**Текущее состояние:** Статичная статистика

**Что отображается:**
```typescript
{
  value: '100 000+', label: 'объектов',
  value: '50 000+', label: 'пользователей',
  value: '85', label: 'регионов',
  value: '10 лет', label: 'на рынке'
}
```

**Что нужно из БД:**
```sql
-- Реальная статистика
SELECT 
  (SELECT COUNT(*) FROM apartments WHERE is_deleted = 0) AS total_objects,
  (SELECT COUNT(*) FROM users) AS total_users,
  (SELECT COUNT(DISTINCT region_id) FROM blocks) AS total_regions
```

**API эндпоинт:**
```
GET /api/v1/stats/platform
```

**Приоритет:** 🟢 НИЗКИЙ (не критично, но полезно)

---

### 🟡 9. AdditionalFeatures — ДОП. ВОЗМОЖНОСТИ

**Текущее состояние:** Статичные карточки с роутингом

**Что отображается:**
4 карточки: Ипотечный калькулятор, Индивидуальный подбор, Вся недвижимость, Личный кабинет

**Что нужно из БД:**
НЕ ТРЕБУЕТСЯ — навигационные элементы

**Изменения:**
- Форма "Индивидуальный подбор" → сохранять в `leads`

**Приоритет:** 🟡 СРЕДНИЙ (только форма)

---

### 🟡 10. LatestNews — ПОСЛЕДНИЕ НОВОСТИ

**Текущее состояние:** Массив из 8 статичных новостей

**Что отображается:**
```typescript
{
  image: string,
  title: string,     // "Обзор новостроек Москвы 2025"
  date: string,      // "15 фев 2025"
  category: string   // "Обзор"
}
```

**Проблема:**
В БД **НЕТ** таблицы `news`!

**Решение:**
Создать таблицу `news`:
```sql
CREATE TABLE news (
  id CHAR(24) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  category VARCHAR(50),
  image_url VARCHAR(500),
  excerpt TEXT,
  content TEXT,
  published_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**API эндпоинт:**
```
GET /api/v1/news?per_page=8&sort=published_at&order=desc
```

**Приоритет:** 🟡 СРЕДНИЙ (нужна новая сущность)

---

### 🟢 11. ContactsSection — КОНТАКТЫ

**Текущее состояние:** Статичный текст

**Что отображается:**
- Телефоны: +7 (4) 333 44 11, +7 (4) 333 66 12
- Email: info@livegrid.ru
- Адрес: Москва, ул. Примерная, д. 1
- Соцсети: VK, TG, YT, OK

**Что нужно из БД:**
Можно хранить в `settings` (key-value таблица):
```sql
CREATE TABLE settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT
);
```

**Приоритет:** 🟢 НИЗКИЙ (контент редко меняется)

---

## 📊 ИТОГОВАЯ ТАБЛИЦА ПРИОРИТЕТОВ

| # | Секция | Статус | Приоритет | Источник данных | Требуется |
|---|--------|--------|-----------|-----------------|-----------|
| 1 | HeroSection | 🟡 Частично | СРЕДНИЙ | `apartments` (COUNT) | API stats |
| 2 | CategoryTiles | 🟢 OK | НИЗКИЙ | Статично | Только роутинг |
| 3 | **NewListings** | 🔴 Статично | **ВЫСОКИЙ** | `apartments` (ORDER BY created_at) | **Hook + API** |
| 4 | **CatalogZhk** | 🔴 Статично | **КРИТИЧНО** | `blocks` (TOP by units_count) | **Hook + API + badges** |
| 5 | QuizSection | 🟡 OK | СРЕДНИЙ | Статично | Submit handler |
| 6-7 | **PropertyGridSection** | 🔴 Статично | **ВЫСОКИЙ** | `apartments` (hot/start filters) | **Логика фильтров** |
| 8 | AboutPlatform | 🟡 Статично | НИЗКИЙ | `apartments`, `users`, `regions` | API stats |
| 9 | AdditionalFeatures | 🟡 OK | СРЕДНИЙ | — | Lead form |
| 10 | LatestNews | 🟡 Статично | СРЕДНИЙ | **⚠️ Нет таблицы `news`!** | **Создать модель News** |
| 11 | ContactsSection | 🟢 OK | НИЗКИЙ | `settings` (опционально) | — |

---

## 🎯 ПЛАН РЕАЛИЗАЦИИ (ПОРЯДОК ВЫПОЛНЕНИЯ)

### ЭТАП 1: Критичный контент (3 секции)

#### ✅ 1.1. NewListings — Новые объявления
**Файлы:**
- `backend/app/Http/Controllers/Api/V1/ApartmentController.php` — уже готов
- `frontend/src/hooks/useNewListings.ts` — **СОЗДАТЬ**
- `frontend/src/components/NewListings.tsx` — **ИЗМЕНИТЬ**

**Действия:**
```typescript
// 1. Создать хук
export function useNewListings() {
  const { rawApartments, loading, error } = useApartments(
    { sort: 'created_at', order: 'desc' }, 
    1, 
    8
  );
  
  // Трансформировать в PropertyData
  const properties: PropertyData[] = rawApartments.map(apt => ({
    image: apt.plan_url || '/placeholder.svg',
    title: apt.block.name,
    price: formatPrice(apt.price),
    address: apt.block.address || `${apt.block.district?.name}`,
    area: `${apt.area.total} м²`,
    rooms: apt.room_label,
    badges: [], // TODO: генерировать бэкендом
  }));
  
  return { properties, loading, error };
}

// 2. Использовать в компоненте
const NewListings = () => {
  const { properties, loading, error } = useNewListings();
  
  if (loading) return <SkeletonGrid />;
  if (error) return <ErrorMessage />;
  
  return (
    <section className="py-8">
      {/* ... отображение properties ... */}
    </section>
  );
};
```

---

#### ✅ 1.2. CatalogZhk — Каталог ЖК
**Файлы:**
- `backend/app/Http/Controllers/Api/V1/BlockController.php` — уже готов
- `frontend/src/hooks/useTopBlocks.ts` — **СОЗДАТЬ**
- `frontend/src/components/CatalogZhk.tsx` — **ИЗМЕНИТЬ**

**Действия:**
```typescript
// 1. Создать хук
export function useTopBlocks() {
  const { blocks, loading, error } = useBlocks(
    { sort: 'units_count', order: 'desc' }, 
    1, 
    8
  );
  
  return { blocks, loading, error };
}

// 2. Использовать (blocks уже трансформированы в ZhkData в useBlocks)
const CatalogZhk = () => {
  const { blocks, loading, error } = useTopBlocks();
  
  if (loading) return <SkeletonGrid />;
  
  return (
    <section className="py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {blocks.map((zhk, i) => (
          <ZhkCard key={i} data={zhk} />
        ))}
      </div>
    </section>
  );
};
```

**ПРОБЛЕМА: Badges**
В БД нет `badges`. Варианты решения:

**Вариант А: Генерировать бэкендом**
```php
// В ApartmentResource / BlockResource
'badges' => $this->generateBadges(),

protected function generateBadges(): array {
    $badges = [];
    
    if ($this->has_mortgage && $this->mortgage_rate < 7) {
        $badges[] = "Ипотека {$this->mortgage_rate}%";
    }
    
    if ($this->has_installment && $this->installment_months >= 12) {
        $badges[] = "Рассрочка {$this->installment_months} мес";
    }
    
    if ($this->discount_percent > 0) {
        $badges[] = "Скидка {$this->discount_percent}%";
    }
    
    return $badges;
}
```

**Вариант Б: Добавить JSON поле**
```sql
ALTER TABLE blocks ADD COLUMN badges JSON;
-- Пример: ["Рассрочка 1 год", "Ипотека 6%"]
```

---

#### ✅ 1.3. PropertyGridSection — Горячие/Стартующие
**Файлы:**
- `backend/app/Http/Controllers/Api/V1/ApartmentController.php` — добавить фильтр `hot`
- `backend/app/Http/Controllers/Api/V1/BlockController.php` — добавить фильтр `start_sales`
- `frontend/src/hooks/useHotDeals.ts`, `useStartSales.ts` — **СОЗДАТЬ**
- `frontend/src/components/PropertyGridSection.tsx` — **ИЗМЕНИТЬ**

**Действия:**

**Backend:**
```php
// ApartmentController::index()
if ($request->filter === 'hot') {
    $query->where('discount_percent', '>', 0)
          ->orWhere('has_special_offer', true)
          ->orderBy('discount_percent', 'desc');
}

// BlockController::index()
if ($request->filter === 'start_sales') {
    $query->whereHas('buildings', function($q) {
        $q->where('deadline_at', '>', now());
    })->orderBy('created_at', 'desc');
}
```

**Frontend:**
```typescript
export function useHotDeals() {
  return useApartments({ filter: 'hot' }, 1, 4);
}

export function useStartSales() {
  return useBlocks({ filter: 'start_sales' }, 1, 4);
}

const PropertyGridSection = ({ title, type }: Props) => {
  const hotData = useHotDeals();
  const startData = useStartSales();
  
  const { properties, loading } = type === 'hot' ? hotData : startData;
  
  if (loading) return <SkeletonGrid />;
  
  return (
    <section className="py-8">
      {/* ... */}
    </section>
  );
};
```

---

### ЭТАП 2: Дополнительные секции

#### ✅ 2.1. AboutPlatform — Статистика
**Файлы:**
- `backend/app/Http/Controllers/Api/V1/StatsController.php` — **СОЗДАТЬ**
- `backend/routes/api.php` — добавить роут
- `frontend/src/hooks/usePlatformStats.ts` — **СОЗДАТЬ**

**Backend:**
```php
// StatsController.php
public function platform()
{
    return response()->json([
        'total_objects' => Apartment::where('is_deleted', 0)->count(),
        'total_users' => User::count(),
        'total_regions' => Block::distinct('region_id')->count(),
        'years_on_market' => 10, // статично
    ]);
}
```

**Frontend:**
```typescript
export function usePlatformStats() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    api.get('/stats/platform').then(res => setStats(res.data));
  }, []);
  
  return stats;
}
```

---

#### ✅ 2.2. LatestNews — Новости
**Проблема:** Таблицы `news` НЕТ в БД!

**Решение:**

**1. Создать миграцию:**
```php
// database/migrations/2026_03_01_000000_create_news_table.php
Schema::create('news', function (Blueprint $table) {
    $table->string('id', 24)->primary();
    $table->string('title');
    $table->string('slug')->unique();
    $table->string('category', 50)->nullable();
    $table->string('image_url', 500)->nullable();
    $table->text('excerpt')->nullable();
    $table->text('content')->nullable();
    $table->timestamp('published_at')->nullable();
    $table->boolean('is_published')->default(false);
    $table->timestamps();
    
    $table->index('published_at');
    $table->index('category');
});
```

**2. Создать модель:**
```php
// app/Models/News.php
class News extends Model
{
    use HasFactory, HasUuids;
    
    protected $table = 'news';
    protected $fillable = ['title', 'slug', 'category', 'image_url', 'excerpt', 'content', 'published_at', 'is_published'];
    protected $casts = ['published_at' => 'datetime', 'is_published' => 'boolean'];
}
```

**3. Создать контроллер:**
```php
// app/Http/Controllers/Api/V1/NewsController.php
public function index(Request $request)
{
    $news = News::where('is_published', true)
        ->orderBy('published_at', 'desc')
        ->paginate($request->per_page ?? 8);
    
    return NewsResource::collection($news);
}
```

**4. Frontend:**
```typescript
export function useLatestNews() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.get('/news?per_page=8').then(res => {
      setNews(res.data);
      setLoading(false);
    });
  }, []);
  
  return { news, loading };
}
```

---

#### ✅ 2.3. HeroSection — Счётчик объектов
**Файлы:**
- `backend/app/Http/Controllers/Api/V1/StatsController.php` — использовать существующий
- `frontend/src/components/HeroSection.tsx` — добавить хук

**Действия:**
```typescript
const HeroSection = () => {
  const [totalCount, setTotalCount] = useState(121563);
  
  useEffect(() => {
    api.get('/stats/platform').then(res => {
      setTotalCount(res.data.total_objects);
    });
  }, []);
  
  return (
    <button className="bg-primary ...">
      Показать {totalCount.toLocaleString('ru-RU')} объекта
    </button>
  );
};
```

---

## 📝 ИТОГОВЫЙ ЧЕКЛИСТ

### Backend (API)

- [ ] **ApartmentController** — добавить фильтр `hot`
- [ ] **BlockController** — добавить фильтр `start_sales`
- [ ] **StatsController** (новый) — эндпоинт `/stats/platform`
- [ ] **NewsController** (новый) — CRUD для новостей
- [ ] **News модель** (новая) — миграция + модель
- [ ] **Badges логика** — генерировать в Resource или добавить JSON поле
- [ ] **Роуты** — добавить `api/v1/news`, `api/v1/stats/platform`

### Frontend (Hooks + Components)

- [ ] **useNewListings()** — хук для новых объявлений
- [ ] **useTopBlocks()** — хук для топ-8 ЖК
- [ ] **useHotDeals()** — хук для горячих предложений
- [ ] **useStartSales()** — хук для стартующих продаж
- [ ] **usePlatformStats()** — хук для статистики
- [ ] **useLatestNews()** — хук для новостей
- [ ] **NewListings.tsx** — интегрировать useNewListings
- [ ] **CatalogZhk.tsx** — интегрировать useTopBlocks
- [ ] **PropertyGridSection.tsx** — интегрировать useHotDeals / useStartSales
- [ ] **AboutPlatform.tsx** — интегрировать usePlatformStats
- [ ] **LatestNews.tsx** — интегрировать useLatestNews
- [ ] **HeroSection.tsx** — добавить динамический счётчик

### Database

- [ ] **Миграция `news`** — создать таблицу
- [ ] **Seed данных** — добавить тестовые новости
- [ ] **Опционально:** Добавить поля `discount_percent`, `has_special_offer` в `apartments`
- [ ] **Опционально:** Добавить JSON поле `badges` в `blocks`

---

## 🚀 ПОРЯДОК ВНЕДРЕНИЯ

1. **Backend API (1-2 часа)**
   - Создать StatsController
   - Добавить фильтры в ApartmentController/BlockController
   - Создать News модель + контроллер + миграцию

2. **Frontend Hooks (1 час)**
   - useNewListings, useTopBlocks, useHotDeals, useStartSales, usePlatformStats, useLatestNews

3. **Frontend Components (2 часа)**
   - Интегрировать хуки в NewListings, CatalogZhk, PropertyGridSection, AboutPlatform, LatestNews, HeroSection

4. **Testing & Deploy (1 час)**
   - Проверить все секции
   - Деплой через git

**Общее время:** ~5-6 часов работы

---

## ⚠️ КРИТИЧНЫЕ ЗАМЕЧАНИЯ

1. **Badges (значки):** Сейчас в БД нет данных для генерации. Нужно либо:
   - Добавить поля `discount_percent`, `mortgage_rate`, `installment_months`
   - Или добавить JSON поле `badges` и заполнить вручную

2. **News (новости):** Таблицы нет вообще. Это **блокирует** секцию LatestNews.

3. **Images (изображения):** 
   - Для квартир используем `plan_url` (планировка)
   - Для ЖК используем `block.images[0]` (первое фото из массива)
   - Нужен fallback на placeholder если нет фото

4. **Performance:**
   - Все запросы кэшировать на 5-10 минут (Redis)
   - Использовать пагинацию везде
   - Eager load отношения (уже есть в ApartmentController)

---

## 📌 ГОТОВЫЕ КОМПОНЕНТЫ (УЖЕ РАБОТАЮТ)

✅ `PropertyCard` — карточка квартиры  
✅ `ZhkCard` — карточка ЖК  
✅ `useApartments()` — хук для квартир  
✅ `useBlocks()` — хук для ЖК  
✅ `formatPrice()` — форматирование цены  
✅ `ApartmentController::index()` — API список квартир  
✅ `BlockController::index()` — API список ЖК  

Нужно только **правильно использовать** существующие инструменты!

---

**Автор аудита:** AI Assistant  
**Дата:** 27 февраля 2026  
**Версия:** 1.0
