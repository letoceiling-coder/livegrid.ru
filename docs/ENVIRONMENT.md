# Environment Variables

## Backend (`backend/.env`)

### Application

| Переменная | Local | Production | Описание |
|-----------|-------|------------|---------|
| `APP_NAME` | `Livegrid` | `Livegrid` | Имя приложения |
| `APP_ENV` | `local` | `production` | Окружение |
| `APP_KEY` | `base64:...` | `base64:...` | 32-байтовый ключ шифрования (генерируется `php artisan key:generate`) |
| `APP_DEBUG` | `true` | **`false`** | Показывать stacktrace в ответах |
| `APP_URL` | `http://localhost:8000` | `https://livegrid.ru` | Base URL приложения |

> ⚠️ `APP_DEBUG=true` в production раскрывает внутреннюю структуру кода. Всегда `false` на сервере.

### Logging

| Переменная | Local | Production |
|-----------|-------|------------|
| `LOG_CHANNEL` | `stack` | `stack` |
| `LOG_LEVEL` | `debug` | `error` |

В production логируются только ошибки уровня `error` и выше. Файл: `storage/logs/laravel.log`.

### Database

| Переменная | Описание | Пример |
|-----------|---------|--------|
| `DB_CONNECTION` | Драйвер | `mysql` |
| `DB_HOST` | Хост | `127.0.0.1` |
| `DB_PORT` | Порт | `3306` |
| `DB_DATABASE` | Имя базы | `livegrid` |
| `DB_USERNAME` | Пользователь | `livegrid_user` |
| `DB_PASSWORD` | Пароль | `<generated>` |

Пароль генерируется автоматически при первом запуске `vps-init.sh`:
```bash
DB_PASS="$(openssl rand -base64 32 | tr -d '/+=' | head -c 24)"
```

### Cache / Queue / Session

| Переменная | Local | Production |
|-----------|-------|------------|
| `CACHE_DRIVER` | `file` | `file` |
| `QUEUE_CONNECTION` | `sync` | `sync` |
| `SESSION_DRIVER` | `file` | `file` |

Для высоконагруженных сценариев рекомендуется переключить `CACHE_DRIVER=redis` и `QUEUE_CONNECTION=redis`.

### Sanctum

| Переменная | Значение | Описание |
|-----------|---------|---------|
| `SANCTUM_STATEFUL_DOMAINS` | `livegrid.ru,www.livegrid.ru` | Домены для SPA-аутентификации через cookie |

### Deploy variables

Используются только **локально** командой `php artisan deploy`. На сервер не копируются (не нужны).

| Переменная | Описание | Пример |
|-----------|---------|--------|
| `DEPLOY_SSH_HOST` | IP или hostname сервера | `85.198.64.93` |
| `DEPLOY_SSH_USER` | SSH-пользователь | `root` |
| `DEPLOY_SSH_KEY` | Путь к приватному ключу | `~/.ssh/id_rsa_livegrid` |
| `DEPLOY_SSH_PORT` | SSH-порт | `22` |
| `DEPLOY_PATH` | Путь к backend на сервере | `/var/www/livegrid/backend` |
| `DEPLOY_BRANCH` | Git-ветка для деплоя | `main` |
| `DEPLOY_DOMAIN` | Домен | `livegrid.ru` |
| `DEPLOY_FRONTEND_PATH` | Путь к frontend на сервере | `/var/www/livegrid/backend/frontend` |

### Полный `.env` — local

```env
APP_NAME=Livegrid
APP_ENV=local
APP_KEY=base64:GENERATED_BY_ARTISAN
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=livegrid_local
DB_USERNAME=root
DB_PASSWORD=secret

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

SANCTUM_STATEFUL_DOMAINS=localhost,localhost:8080

# Deploy configuration (needed only locally)
DEPLOY_SSH_HOST=85.198.64.93
DEPLOY_SSH_USER=root
DEPLOY_SSH_KEY=/Users/yourname/.ssh/id_rsa_livegrid
DEPLOY_SSH_PORT=22
DEPLOY_PATH=/var/www/livegrid/backend
DEPLOY_BRANCH=main
DEPLOY_DOMAIN=livegrid.ru
DEPLOY_FRONTEND_PATH=/var/www/livegrid/backend/frontend
```

### Полный `.env` — production (на сервере)

```env
APP_NAME=Livegrid
APP_ENV=production
APP_KEY=base64:<openssl_generated>
APP_DEBUG=false
APP_URL=https://livegrid.ru

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

FRONTEND_URL=https://livegrid.ru

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=livegrid
DB_USERNAME=livegrid_user
DB_PASSWORD=<generated_24_chars>

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

SANCTUM_STATEFUL_DOMAINS=livegrid.ru,www.livegrid.ru

DEPLOY_SSH_HOST=85.198.64.93
DEPLOY_SSH_USER=root
DEPLOY_SSH_KEY=/root/.ssh/id_rsa
DEPLOY_SSH_PORT=22
DEPLOY_PATH=/var/www/livegrid/backend
DEPLOY_BRANCH=main
DEPLOY_DOMAIN=livegrid.ru
```

---

## Frontend (`frontend/.env.*`)

### Файлы и приоритет

Vite загружает `.env` файлы в следующем порядке (более специфичный перекрывает общий):

```
.env                    ← базовый (загружается всегда)
.env.local              ← локальный override (gitignored)
.env.production         ← только при npm run build
.env.development        ← только при npm run dev
```

### Переменные

| Переменная | Описание | Local | Production |
|-----------|---------|-------|------------|
| `VITE_API_URL` | Base URL для axios | `http://localhost:8000/api/v1` | `https://livegrid.ru/api/v1` |

> **Важно:** все `VITE_*` переменные **вшиваются в бандл** во время сборки (`npm run build`).  
> Они не являются секретами — значения видны в исходниках браузера.

### `.env.production` (коммитится в репо)

```env
VITE_API_URL=https://livegrid.ru/api/v1
```

### `.env.local` (gitignored, только для разработки)

```env
VITE_API_URL=http://localhost:8000/api/v1
```

Файл `.env.local` исключён из git в `.gitignore`, чтобы разные разработчики могли иметь разные локальные настройки.

---

## Что НЕ хранить в `.env`

| Нарушение | Последствие |
|---------|-----------|
| `APP_DEBUG=true` в production | Раскрытие stacktrace, путей, переменных |
| `APP_KEY=` (пусто) | Невозможность расшифровать сессии и токены |
| SSH пароль вместо ключа | Атака brute-force, утечка в истории shell |
| `.env` в git | Компрометация всех паролей и ключей |

```bash
# Проверить, что .env не попал в git
git ls-files --error-unmatch .env     # должна вернуть ошибку (файл не в репо)
cat .gitignore | grep ".env"          # должна показать строку ".env"
```
