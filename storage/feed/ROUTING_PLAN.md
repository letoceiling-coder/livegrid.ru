# ROUTING_PLAN — Final routing (strict-template structure)

**Решение:** Использовать маршруты strict-template. Не использовать legacy-маршруты `/zhk/` и `/object/`.

**Правило:** Backend routes не меняем. Меняем только frontend routing.

---

## 1. Итоговая таблица маршрутов (FINAL)

| Route | Page / Component | Назначение |
|-------|-------------------|------------|
| **/** | RedesignIndex | Главная |
| **/catalog** | RedesignCatalog | Каталог ЖК (комплексов) |
| **/complex/:slug** | RedesignComplex | Страница ЖК (комплекса) |
| **/apartment/:id** | RedesignApartment | Страница квартиры |
| **/map** | RedesignMap | Карта ЖК |
| **/search** | Search results page | Результаты поиска |
| /news | News | Список новостей |
| /news/:slug | NewsDetail | Деталь новости |
| /login | Login | Вход |
| /register | Register | Регистрация |
| /forgot-password | ForgotPassword | Восстановление пароля |
| /reset-password | ResetPassword | Сброс пароля |
| /ipoteka | Ipoteka | Ипотека |
| /favorites | Favorites | Избранное |
| /contacts | ContactsPage | Контакты |
| /admin/* | AdminLayout | Админ-панель |

---

## 2. Соответствие legacy → new (отказ от legacy)

| Legacy (НЕ использовать) | Новый (использовать) |
|--------------------------|----------------------|
| /catalog-zhk | **/catalog** |
| /zhk/:slug | **/complex/:slug** |
| /object/:slug | **/apartment/:id** |

Каталог квартир в текущем livegrid был на `/catalog`; после интеграции **/catalog** = каталог ЖК (как в strict-template). При необходимости отдельный каталог квартир — отдельный путь (например `/apartments`), по согласованию.

---

## 3. Внутренние ссылки (единый стандарт)

- Ссылки на ЖК: **`/complex/{slug}`**
- Ссылки на квартиру: **`/apartment/{id}`** (id = 24-символьный идентификатор из API)
- Каталог ЖК: **`/catalog`**
- Карта: **`/map`**
- Поиск: **`/search`** (страница результатов)

Strict-template уже использует `/complex/` и `/apartment/` в redesign-компонентах; legacy-компоненты и старые страницы приводятся к тем же путям.

---

## 4. Реализация роутера (структура)

Финальная структура роутов в приложении:

```
/                     → RedesignIndex (главная)
/catalog              → RedesignCatalog (каталог ЖК)
/complex/:slug        → RedesignComplex (страница ЖК)
/apartment/:id        → RedesignApartment (страница квартиры)
/map                  → RedesignMap (карта)
/search               → Search results (результаты поиска)
```

Остальные маршруты (news, auth, ipoteka, favorites, contacts, admin) без изменений.

---

## 5. Обратная совместимость (редиректы)

Если в проекте или во внешних ссылках остались старые URL, на frontend добавить редиректы:

| Старый URL | Редирект на |
|------------|-------------|
| /zhk/:slug | **/complex/:slug** |
| /object/:slug | **/apartment/:slug** |

Примечание: для квартир API использует `id` (24 hex). Если старые ссылки были вида `/object/{id}`, то редирект `/object/:slug` → `/apartment/:slug` сохранит тот же идентификатор (id в URL считаем как :slug в роуте для обратной совместимости). Итог: **/object/:slug** → **/apartment/:slug** (параметр передаётся как есть).

---

## 6. Валидация компонентов под новыми маршрутами

Убедиться, что следующие компоненты работают с новой схемой:

| Компонент | Ожидаемое поведение |
|-----------|----------------------|
| **ComplexCard** | Ссылка `to={/complex/${complex.slug}}` |
| **ComplexHero** | Страница по роуту `/complex/:slug`, данные по slug |
| **ComplexLayout** | Внутренние ссылки на `/complex/:slug` |
| **ApartmentTable** | Ссылка на квартиру `to={/apartment/${a.id}}` |
| **PropertyCard** | Для квартиры: `to={/apartment/${id}}`; для ЖК: `to={/complex/${slug}}` |
| **Search** | Результаты: комплексы → `/complex/{slug}`, квартиры → `/apartment/{id}` |
| **Map** | Баллуны/маркеры: ссылка на ЖК `/complex/{slug}`, на квартиру `/apartment/{id}` |

Все ссылки в шаблоне должны использовать только `/complex/` и `/apartment/`, без `/zhk/` и `/object/`.
