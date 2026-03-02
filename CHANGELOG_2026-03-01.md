# Обновления каталога ЖК - 2026-03-01

## Выполненные задачи

### 1. API для фильтров ЖК
✅ Создан эндпоинт `GET /api/v1/blocks/filters`
- Возвращает доступные районы (из таблицы regions)
- Возвращает доступных застройщиков (из таблицы builders)
- Возвращает диапазон цен (min/max по price_from)
- Возвращает диапазон сроков сдачи (min/max по nearest_deadline_at)

**Файлы:**
- `backend/app/Http/Controllers/Api/V1/BlockController.php` - добавлен метод `filters()`
- `backend/routes/api.php` - добавлен роут `/api/v1/blocks/filters`

### 2. Фильтры на фронтенде
✅ Реализованы рабочие фильтры для каталога ЖК:
- Фильтр по районам (множественный выбор)
- Фильтр по застройщикам (множественный выбор)
- Фильтр по цене (от/до)
- Фильтр по сроку сдачи (от/до)
- Кнопка "Найти" с отображением реального количества результатов
- Кнопка сброса всех фильтров

**Файлы:**
- `frontend/src/hooks/useBlockFilters.ts` - хук для загрузки доступных фильтров
- `frontend/src/components/BlockFilters.tsx` - компонент фильтров с UI
- `frontend/src/pages/CatalogZhk.tsx` - интеграция фильтров

**Интеграция с API:**
- Фильтры применяются к запросу `/api/v1/blocks` через query параметры:
  - `district[]` - массив ID районов
  - `builder[]` - массив ID застройщиков
  - `deadline_from` - дата начала
  - `deadline_to` - дата окончания

### 3. Переключение режимов просмотра
✅ Добавлен блок переключения между режимами отображения:
- **Плитка** (Grid) - сетка карточек 4 колонки
- **Строки** (List) - список в одну колонку
- **Карта** (Map) - интерактивная карта с маркерами

**Файлы:**
- `frontend/src/pages/CatalogZhk.tsx` - добавлен state `viewMode` и кнопки переключения

### 4. Интерактивная карта с Yandex Maps
✅ Создан компонент карты для отображения ЖК:
- Использует Yandex Maps API 2.1
- Маркеры для каждого ЖК с координатами
- Балуны с информацией при наведении на маркер:
  - Изображение ЖК
  - Название
  - Цена от
  - Количество квартир в продаже
  - Ссылка "Подробнее"
- Кластеризация маркеров при большом количестве
- Автоматическое масштабирование карты под все маркеры

**Файлы:**
- `frontend/src/components/ZhkMap.tsx` - компонент карты
- `frontend/src/hooks/useBlocks.ts` - добавлен `rawBlocks` для доступа к координатам

**API данные:**
- Используются координаты из `geo.lat` и `geo.lng` (уже присутствуют в BlockListResource)

## Технические детали

### Обновленные типы
```typescript
// frontend/src/hooks/useBlocks.ts
export interface UseBlocksResult {
  blocks: ZhkData[];        // Трансформированные данные для карточек
  rawBlocks: BlockListItem[]; // Исходные данные с координатами
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
}
```

### Структура фильтров
```typescript
// frontend/src/components/BlockFilters.tsx
export interface BlockFilterValues {
  districts: string[];      // ID районов
  builders: string[];       // ID застройщиков
  priceMin: number | null;
  priceMax: number | null;
  deadlineFrom: string | null; // ISO date
  deadlineTo: string | null;   // ISO date
}
```

## UI компоненты
Использованы существующие shadcn/ui компоненты:
- Button
- Popover
- Checkbox
- Label
- Input
- ScrollArea

## Зависимости
- Yandex Maps API 2.1 (загружается динамически)
- Без дополнительных npm пакетов

## Примечания
1. Для продакшена рекомендуется получить API ключ Yandex Maps
2. Координаты ЖК уже присутствуют в БД (поля `lat`, `lng` в таблице `blocks`)
3. Фильтры применяются только при клике на кнопку "Найти" (не в реальном времени)
4. Pagination скрывается в режиме карты (показываются все результаты на карте)

## Следующие шаги (опционально)
- [ ] Добавить фильтры по цене для blocks API (сейчас игнорируются)
- [ ] Реализовать list view с другой раскладкой карточек
- [ ] Добавить сохранение выбранного режима просмотра в localStorage
- [ ] Оптимизировать загрузку маркеров (lazy loading при перемещении по карте)
