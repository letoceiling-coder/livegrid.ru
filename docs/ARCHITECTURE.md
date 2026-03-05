# Architecture

## Overview

Livegrid.ru — **monorepo** с двумя приложениями в одном git-репозитории:

- **backend/** — Laravel 10 REST API (корень репозитория)
- **backend/frontend/** — React 18 SPA, собирается в `frontend/dist/`

Оба приложения обслуживаются одним Nginx-сервером на одном домене.  
Разделение происходит **на уровне URL-префикса**: `/api/*` → Laravel, всё остальное → React.

---

## Repository structure

```
backend/                          ← git root
├── app/
│   ├── Console/Commands/
│   │   └── DeployCommand.php     ← php artisan deploy (3-phase)
│   ├── Http/
│   │   ├── Controllers/Api/V1/   ← REST controllers
│   │   ├── Requests/Api/V1/      ← Form request validators
│   │   └── Traits/ApiResponse.php ← JSON response envelope
│   ├── Models/                   ← Eloquent: Page, Section, Media, User
│   └── Services/
│       └── PageService.php       ← Business logic layer
├── config/
├── database/
│   ├── migrations/
│   └── seeders/
├── deploy/
│   ├── nginx/livegrid.ru         ← Production Nginx server block
│   ├── vps-init.sh               ← One-shot VPS bootstrap (13 steps)
│   └── env.production.template   ← .env template for server
├── public/                       ← Laravel webroot (index.php)
├── routes/
│   └── api.php                   ← Route definitions /api/v1/*
├── frontend/                     ← React SPA (subdirectory)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── api.ts            ← Axios client + Bearer auth
│   │   │   ├── auth.ts           ← Auth API calls
│   │   │   └── pages-api.ts      ← Pages CRUD API
│   │   ├── pages/                ← Route-level components
│   │   ├── components/           ← Shared UI components
│   │   └── admin/                ← Admin panel (CMS)
│   ├── .env.production           ← VITE_API_URL baked at build time
│   └── dist/                     ← Production build output (gitignored)
└── docs/                         ← This documentation
```

---

## Server topology

```
Internet
   │
   ▼
[Nginx :443 SSL]  ─── livegrid.ru
   │
   ├── location ^~ /api/
   │       │
   │       └── fastcgi_pass → unix:/var/run/php/php8.2-fpm.sock
   │                               │
   │                               └── Laravel index.php
   │                                       │
   │                                       ├── Router
   │                                       ├── Controller
   │                                       ├── Service
   │                                       └── MySQL 8.0
   │
   ├── location ^~ /storage/
   │       └── alias → backend/public/storage/  (uploaded files)
   │
   └── location /
           └── try_files $uri /index.html
                   │
                   └── frontend/dist/index.html  (React SPA)
```

---

## SPA routing strategy

React использует **client-side routing** (`react-router-dom`).  
Nginx настроен на `try_files $uri /index.html` — любой URL, не соответствующий статическому файлу, возвращает `index.html`, и React Router берёт управление на себя.

**Важно:** префикс `/api/` перехватывается `location ^~ /api/` **до** блока `location /`, поэтому API-запросы никогда не попадают в React.

```
GET /catalog          → frontend/dist/index.html → React Router → <Catalog />
GET /api/v1/pages/home → PHP-FPM → Laravel → PublicPageController
GET /admin            → frontend/dist/index.html → React Router → <AdminLayout />
```

---

## API versioning

Все эндпоинты вынесены под `/api/v1/`:

```
api.php:  Route::prefix('v1')->group(...)
```

При необходимости добавить v2 достаточно создать новый `Route::prefix('v2')` без нарушения существующего контракта.

---

## Authentication flow (Sanctum tokens)

```
POST /api/v1/auth/login
  { email, password }
       │
       ▼
  Auth::attempt()
       │
       ▼
  $user->createToken('api-token')->plainTextToken
       │
       ▼
  Response: { success: true, data: { user, token } }
       │
       ▼
  Frontend: localStorage.setItem('livegrid_api_token', token)
       │
       ▼
  Последующие запросы:
  Authorization: Bearer <token>
       │
       ▼
  middleware('auth:sanctum') → проверяет токен в personal_access_tokens
```

Токены **не имеют срока истечения** по умолчанию.  
Отзыв — `POST /api/v1/auth/logout` (удаляет текущий токен из БД).

---

## Data models

```
users
  id, name, email, password, remember_token, timestamps

pages
  id, title, slug (unique), meta_title, meta_description,
  is_published (bool), timestamps

sections
  id, page_id (FK→pages), type (varchar), content (JSON),
  sort_order (int), timestamps

media
  id, path, alt, type (image|video|document), timestamps

personal_access_tokens  (Laravel Sanctum)
  id, tokenable_type, tokenable_id, name, token (hashed),
  abilities, last_used_at, expires_at, timestamps
```

---

## Frontend state management

| Слой | Инструмент | Назначение |
|------|-----------|------------|
| Server state | TanStack Query | Кэш API-запросов, refetch |
| Admin CMS state | Zustand (`cms-store`, `content-store`) | localStorage-based CMS данные |
| Editor state | Zustand (`editor-store`) | Визуальный редактор страниц |
| Forms | react-hook-form + zod | Валидация форм |
| Routing | react-router-dom v6 | Client-side navigation |

---

## Build pipeline

### Backend (PHP)
```
git push → SSH pull → composer install --no-dev → migrate → config:cache → route:cache → optimize
```

### Frontend (Node)
```
git push → SSH pull → npm ci → vite build → dist/ (2.4 MB, 45 files)
```

Vite output разбит на чанки (`manualChunks`):

| Чанк | Содержимое | Размер (gzip) |
|------|-----------|--------------|
| `vendor` | react, react-dom, react-router-dom | ~53 kB |
| `ui` | @radix-ui/react-* | ~24 kB |
| `query` | @tanstack/react-query | ~8 kB |
| `motion` | framer-motion | ~0.1 kB |
| `index` | App code | ~59 kB |
