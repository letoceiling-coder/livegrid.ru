# API Reference

**Base URL:** `https://livegrid.ru/api/v1`  
**Content-Type:** `application/json`  
**Authentication:** Bearer token (Laravel Sanctum)

---

## Response format

Все ответы оборачиваются в единый конверт:

### Success

```json
{
    "success": true,
    "message": "Optional message",
    "data": { ... }
}
```

### Error

```json
{
    "success": false,
    "message": "Human-readable error",
    "errors": {
        "field": ["Validation message"]
    }
}
```

### HTTP статусы

| Статус | Когда |
|--------|-------|
| `200 OK` | Успешный GET, PUT, DELETE |
| `201 Created` | Успешный POST (ресурс создан) |
| `204 No Content` | Успешное действие без тела ответа |
| `401 Unauthorized` | Токен отсутствует или недействителен |
| `403 Forbidden` | Доступ запрещён (нет прав) |
| `404 Not Found` | Ресурс не найден |
| `422 Unprocessable Entity` | Ошибка валидации |
| `500 Internal Server Error` | Непредвиденная ошибка сервера |

---

## Authentication

### POST /api/v1/auth/login

Аутентификация. Возвращает Bearer token.

**Request:**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
    "email": "admin@livegrid.ru",
    "password": "secret"
}
```

**Response 200:**
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": 1,
            "name": "Admin",
            "email": "admin@livegrid.ru",
            "created_at": "2026-01-01T00:00:00.000000Z"
        },
        "token": "1|abcdefghijklmnopqrstuvwxyz1234567890"
    }
}
```

**Response 422 (invalid credentials):**
```json
{
    "message": "The provided credentials are incorrect.",
    "errors": {
        "email": ["The provided credentials are incorrect."]
    }
}
```

**curl:**
```bash
curl -X POST https://livegrid.ru/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@livegrid.ru","password":"secret"}'
```

---

### POST /api/v1/auth/logout

Отзыв текущего токена. Требует авторизации.

**Request:**
```http
POST /api/v1/auth/logout
Authorization: Bearer 1|abcdefghijklmnopqrstuvwxyz
```

**Response 200:**
```json
{
    "success": true,
    "message": "Logged out successfully",
    "data": null
}
```

**curl:**
```bash
curl -X POST https://livegrid.ru/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /api/v1/auth/me

Данные текущего авторизованного пользователя.

**Request:**
```http
GET /api/v1/auth/me
Authorization: Bearer 1|abcdefghijklmnopqrstuvwxyz
```

**Response 200:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "Admin",
        "email": "admin@livegrid.ru",
        "created_at": "2026-01-01T00:00:00.000000Z"
    }
}
```

**curl:**
```bash
curl https://livegrid.ru/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Public Pages

### GET /api/v1/pages/{slug}

Получить опубликованную страницу по slug. **Не требует авторизации.**

**Parameters:**
- `slug` — строка из `[a-z0-9-]+`, например `home`, `about`, `contacts`

**Request:**
```http
GET /api/v1/pages/home
```

**Response 200:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "title": "Главная",
        "slug": "home",
        "meta_title": "Live Grid — Недвижимость России",
        "meta_description": "Поиск недвижимости",
        "is_published": true,
        "sections": [
            {
                "id": 1,
                "page_id": 1,
                "type": "hero",
                "content": {
                    "title": "Live Grid.",
                    "subtitle": "Более 100 000 объектов"
                },
                "sort_order": 0,
                "created_at": "2026-01-01T00:00:00.000000Z",
                "updated_at": "2026-01-01T00:00:00.000000Z"
            }
        ],
        "created_at": "2026-01-01T00:00:00.000000Z",
        "updated_at": "2026-01-01T00:00:00.000000Z"
    }
}
```

**Response 404:**
```json
{
    "success": false,
    "message": "Page not found"
}
```

**curl:**
```bash
curl https://livegrid.ru/api/v1/pages/home
curl https://livegrid.ru/api/v1/pages/about
curl https://livegrid.ru/api/v1/pages/contacts
```

---

## Admin: Pages

> Все admin-эндпоинты требуют заголовок `Authorization: Bearer <token>`.

### GET /api/v1/admin/pages

Список всех страниц (paginated).

**Query parameters:**
- `per_page` — количество на странице (default: 15)
- `page` — номер страницы (default: 1)

**Request:**
```http
GET /api/v1/admin/pages?per_page=10&page=1
Authorization: Bearer $TOKEN
```

**Response 200:**
```json
{
    "success": true,
    "data": {
        "current_page": 1,
        "data": [ { ... }, { ... } ],
        "last_page": 3,
        "per_page": 10,
        "total": 25
    }
}
```

**curl:**
```bash
curl "https://livegrid.ru/api/v1/admin/pages?per_page=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /api/v1/admin/pages/{id}

Получить страницу по ID (со всеми секциями).

**curl:**
```bash
curl https://livegrid.ru/api/v1/admin/pages/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### POST /api/v1/admin/pages

Создать страницу.

**Request body:**
```json
{
    "title": "О компании",
    "slug": "about",
    "meta_title": "О компании — Live Grid",
    "meta_description": "Информация о платформе",
    "is_published": false
}
```

**Validation:**
| Поле | Тип | Правила |
|------|-----|---------|
| `title` | string | required, max:255 |
| `slug` | string | required, unique:pages, regex:[a-z0-9-] |
| `meta_title` | string | nullable, max:255 |
| `meta_description` | string | nullable, max:500 |
| `is_published` | boolean | nullable |

**Response 201:**
```json
{
    "success": true,
    "message": "Page created successfully",
    "data": { "id": 5, "title": "О компании", "slug": "about", ... }
}
```

**curl:**
```bash
curl -X POST https://livegrid.ru/api/v1/admin/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"О компании","slug":"about","is_published":false}'
```

---

### PUT /api/v1/admin/pages/{id}

Обновить страницу.

**curl:**
```bash
curl -X PUT https://livegrid.ru/api/v1/admin/pages/5 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_published":true}'
```

---

### DELETE /api/v1/admin/pages/{id}

Удалить страницу.

**curl:**
```bash
curl -X DELETE https://livegrid.ru/api/v1/admin/pages/5 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Admin: Sections

### GET /api/v1/admin/sections

Список секций. Можно фильтровать по странице.

**Query parameters:**
- `page_id` — фильтр по ID страницы

**curl:**
```bash
curl "https://livegrid.ru/api/v1/admin/sections?page_id=1" \
  -H "Authorization: Bearer $TOKEN"
```

---

### POST /api/v1/admin/sections

Создать секцию.

**Request body:**
```json
{
    "page_id": 1,
    "type": "hero",
    "content": {
        "title": "Заголовок",
        "subtitle": "Подзаголовок",
        "button_text": "Подробнее"
    },
    "sort_order": 0
}
```

**Validation:**
| Поле | Тип | Правила |
|------|-----|---------|
| `page_id` | integer | required, exists:pages,id |
| `type` | string | required, max:100 |
| `content` | object | nullable |
| `sort_order` | integer | nullable, min:0 |

**curl:**
```bash
curl -X POST https://livegrid.ru/api/v1/admin/sections \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"page_id":1,"type":"hero","content":{"title":"Hero"},"sort_order":0}'
```

---

### PUT /api/v1/admin/sections/{id}

Обновить секцию.

**curl:**
```bash
curl -X PUT https://livegrid.ru/api/v1/admin/sections/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sort_order":2}'
```

---

### DELETE /api/v1/admin/sections/{id}

**curl:**
```bash
curl -X DELETE https://livegrid.ru/api/v1/admin/sections/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Admin: Media

### GET /api/v1/admin/media

Список медиафайлов. Фильтр по типу.

**Query parameters:**
- `type` — `image` | `video` | `document`

**curl:**
```bash
curl "https://livegrid.ru/api/v1/admin/media?type=image" \
  -H "Authorization: Bearer $TOKEN"
```

---

### POST /api/v1/admin/media

Загрузка файла. **Multipart form data.**

**Request:**
```http
POST /api/v1/admin/media
Authorization: Bearer $TOKEN
Content-Type: multipart/form-data

file=<binary>
alt=Описание изображения
type=image
```

**Ограничения:**
- Максимальный размер: **20 MB**
- Типы: `image`, `video`, `document`

**Response 201:**
```json
{
    "success": true,
    "message": "Media uploaded successfully",
    "data": {
        "id": 10,
        "path": "media/image/AbcDef123.jpg",
        "alt": "Описание",
        "type": "image",
        "url": "https://livegrid.ru/storage/media/image/AbcDef123.jpg",
        "created_at": "2026-02-26T15:00:00.000000Z"
    }
}
```

**curl:**
```bash
curl -X POST https://livegrid.ru/api/v1/admin/media \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "alt=Описание" \
  -F "type=image"
```

---

### PUT /api/v1/admin/media/{id}

Обновить alt и/или type медиафайла.

**curl:**
```bash
curl -X PUT https://livegrid.ru/api/v1/admin/media/10 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alt":"Новое описание"}'
```

---

### DELETE /api/v1/admin/media/{id}

Удалить файл с диска и запись из БД.

**curl:**
```bash
curl -X DELETE https://livegrid.ru/api/v1/admin/media/10 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Bearer token usage (frontend)

```typescript
// frontend/src/lib/api.ts — axios interceptor
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('livegrid_api_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

```typescript
// Пример использования в компоненте
import api from '@/lib/api';

const { data } = await api.get('/admin/pages');
const pages = data; // уже unwrapped из { success, data }
```

---

## Quick reference

```bash
# Переменные окружения для curl
export BASE=https://livegrid.ru/api/v1
export TOKEN=$(curl -sX POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@livegrid.ru","password":"secret"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# Проверить токен
curl $BASE/auth/me -H "Authorization: Bearer $TOKEN"

# Получить главную страницу
curl $BASE/pages/home | python3 -m json.tool

# Список страниц в admin
curl $BASE/admin/pages -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```
