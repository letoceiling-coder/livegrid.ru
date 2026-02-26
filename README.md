# Livegrid.ru

> Production-ready monorepo: **Laravel 10 API** + **React SPA** (Vite) на одном домене через Nginx.

[![PHP](https://img.shields.io/badge/PHP-8.2-blue)](https://php.net)
[![Laravel](https://img.shields.io/badge/Laravel-10-red)](https://laravel.com)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646cff)](https://vitejs.dev)

---

## Содержание

- [Архитектура](#архитектура)
- [Быстрый старт](#быстрый-старт)
- [Деплой](#деплой)
- [Окружения](#окружения)
- [Документация](#документация)

---

## Архитектура

### Monorepo-структура

```
/var/www/livegrid/
└── backend/                  ← git repo root (этот репозиторий)
    ├── app/                  ← Laravel application
    │   ├── Console/Commands/ ← Artisan commands (deploy)
    │   ├── Http/Controllers/ ← API controllers (Api/V1/)
    │   ├── Models/           ← Eloquent models
    │   └── Services/         ← Business logic
    ├── config/               ← Laravel config
    ├── database/             ← Migrations + seeders
    ├── deploy/               ← Infrastructure configs
    │   ├── nginx/livegrid.ru ← Nginx server block
    │   ├── vps-init.sh       ← One-shot VPS bootstrap
    │   └── env.production.template
    ├── public/               ← Laravel entry point (index.php)
    ├── routes/
    │   └── api.php           ← API routes (/api/v1/*)
    └── frontend/             ← React SPA (Vite + TypeScript)
        ├── src/
        │   ├── lib/api.ts    ← Axios client → backend API
        │   ├── pages/        ← SPA pages
        │   └── admin/        ← Admin panel (CMS)
        ├── .env.production   ← VITE_API_URL=https://livegrid.ru/api/v1
        └── dist/             ← Production build (gitignored)
```

### Nginx routing flow

```
Входящий запрос
       │
       ▼
  [HTTP :80] ──────────────────────────────► 301 → HTTPS
       │
  [HTTPS :443]
       │
       ├── /api/*    ──► fastcgi → php8.2-fpm ──► Laravel (backend/public/index.php)
       │
       ├── /storage/ ──► alias backend/public/storage/  (uploaded files)
       │
       └── /*        ──► try_files → frontend/dist/index.html  (React SPA)
```

### Аутентификация

- **Laravel Sanctum** — Bearer token
- Токен выдаётся при `POST /api/v1/auth/login`
- Передаётся в заголовке: `Authorization: Bearer <token>`
- Фронтенд хранит токен в `localStorage` (ключ `livegrid_api_token`)

---

## Production URLs

| Назначение | URL |
|-----------|-----|
| Фронтенд | https://livegrid.ru |
| API v1 | https://livegrid.ru/api/v1 |
| Главная страница (test) | https://livegrid.ru/api/v1/pages/home |
| Admin panel | https://livegrid.ru/admin |

---

## Быстрый старт

### Локальная разработка — Backend

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
# API доступно на http://localhost:8000/api/v1
```

### Локальная разработка — Frontend

```bash
cd backend/frontend
cp .env.example .env.local
# Отредактировать: VITE_API_URL=http://localhost:8000/api/v1
npm install
npm run dev
# SPA доступно на http://localhost:8080
```

---

## Деплой

### Основная команда

```bash
php artisan deploy
```

Команда выполняет три фазы:

| Фаза | Описание |
|------|----------|
| Phase 1 | `git add . && git commit && git push origin main` |
| Phase 2 | SSH → сервер: `git pull`, `composer install`, `migrate`, `cache` |
| Phase 3 | SSH → сервер: `npm ci`, `npm run build` |

### Флаги

```bash
php artisan deploy --skip-frontend   # только backend
php artisan deploy --skip-backend    # только frontend
php artisan deploy --skip-git        # без git push
php artisan deploy --skip-migrate    # без миграций
php artisan deploy --dry-run         # показать команды без запуска
```

### Переменные деплоя (backend `.env`)

```env
DEPLOY_SSH_HOST=85.198.64.93
DEPLOY_SSH_USER=root
DEPLOY_SSH_KEY=/Users/you/.ssh/id_rsa
DEPLOY_SSH_PORT=22
DEPLOY_PATH=/var/www/livegrid/backend
DEPLOY_BRANCH=main
DEPLOY_DOMAIN=livegrid.ru
```

> Подробно: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

---

## Окружения

| Переменная | Local | Production |
|-----------|-------|------------|
| `APP_ENV` | `local` | `production` |
| `APP_DEBUG` | `true` | **`false`** |
| `APP_URL` | `http://localhost:8000` | `https://livegrid.ru` |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | `https://livegrid.ru/api/v1` |

> Подробно: [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md)

---

## Troubleshooting

### 502 Bad Gateway

```bash
systemctl status php8.2-fpm
systemctl restart php8.2-fpm
tail -n 50 /var/log/nginx/livegrid.error.log
```

### API возвращает 404

```bash
ssh root@85.198.64.93
cd /var/www/livegrid/backend
php artisan route:list --path=api
php artisan config:cache
```

### Фронтенд не обновился

```bash
php artisan deploy --skip-backend
# или вручную:
ssh root@85.198.64.93 "cd /var/www/livegrid/backend/frontend && npm run build"
```

### SSL expired

```bash
ssh root@85.198.64.93
certbot renew --dry-run
certbot renew
systemctl reload nginx
```

---

## Документация

| Файл | Содержание |
|------|------------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Архитектура системы, схемы, routing |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Деплой: first setup, CI workflow, rollback |
| [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) | Переменные окружения local vs production |
| [`docs/NGINX.md`](docs/NGINX.md) | Nginx конфиг: SPA + API + SSL |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Безопасность: UFW, SSH, APP_DEBUG, SSL |
| [`docs/API.md`](docs/API.md) | API Reference: endpoints, auth, примеры curl |

---

## Технологии

| Компонент | Технология | Версия |
|----------|-----------|--------|
| Backend | Laravel | 10.x |
| PHP | PHP-FPM | 8.2 |
| Database | MySQL | 8.0 |
| Frontend | React + Vite | 18 + 5 |
| Styles | Tailwind CSS + shadcn/ui | 3.x |
| HTTP Client | Axios | 1.x |
| State | Zustand + TanStack Query | latest |
| Web server | Nginx | 1.24+ |
| SSL | Let's Encrypt / Certbot | latest |
| OS | Ubuntu | 24.04 LTS |
