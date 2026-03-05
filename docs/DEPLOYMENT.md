# Deployment

## Server requirements

| Компонент | Минимум | Рекомендуется |
|----------|---------|--------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Disk | 20 GB | 40 GB SSD |
| PHP | 8.2-fpm | 8.2-fpm |
| MySQL | 8.0 | 8.0 |
| Node.js | 20 LTS | 20 LTS |
| Nginx | 1.18+ | 1.24+ |

---

## First server setup (one-time)

### 1. Подготовить SSH-ключ

```bash
# На локальной машине — сгенерировать ключ (если нет)
ssh-keygen -t rsa -b 4096 -C "deploy@livegrid.ru" -f ~/.ssh/id_rsa_livegrid

# Скопировать публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_rsa_livegrid.pub root@85.198.64.93

# Проверить беспарольный вход
ssh -i ~/.ssh/id_rsa_livegrid root@85.198.64.93 "echo OK"
```

### 2. Запустить VPS bootstrap-скрипт

```bash
# С локальной машины — отправить и выполнить скрипт
(Get-Content deploy/vps-init.sh -Raw) -replace "`r`n","`n" |
  ssh root@85.198.64.93 "bash -s"
```

Скрипт выполняет **13 шагов**:

| Шаг | Действие |
|-----|---------|
| 1 | apt update + upgrade |
| 2 | Установка: nginx, mysql, php8.2-fpm, composer, certbot |
| 3 | Создание MySQL БД и пользователя |
| 4 | `git clone` репозитория |
| 5 | Создание `.env` на сервере с генерацией `APP_KEY` |
| 6 | `composer install` + `migrate` + `db:seed` + `config:cache` |
| 7 | Права `775` на `storage/` и `bootstrap/cache/` |
| 8 | Nginx HTTP-конфиг (для получения сертификата) |
| 9 | SSL Let's Encrypt via certbot |
| 10 | UFW firewall (22/80/443 открыты, 8000 закрыт) |
| 11 | Node.js 20 LTS via NodeSource |
| 12 | `npm ci && npm run build` фронтенда |
| 13 | Применение продакшн Nginx HTTPS-конфига (SPA + API) |

> **Внимание:** скрипт генерирует случайный пароль БД. Сохраните его из вывода.

### 3. Настроить локальный `.env` для деплоя

```bash
# backend/.env (добавить):
DEPLOY_SSH_HOST=85.198.64.93
DEPLOY_SSH_USER=root
DEPLOY_SSH_KEY=/Users/yourname/.ssh/id_rsa_livegrid
DEPLOY_SSH_PORT=22
DEPLOY_PATH=/var/www/livegrid/backend
DEPLOY_BRANCH=main
DEPLOY_DOMAIN=livegrid.ru
DEPLOY_FRONTEND_PATH=/var/www/livegrid/backend/frontend
```

### 4. Первый деплой

```bash
php artisan deploy --dry-run   # проверка без выполнения
php artisan deploy             # полный деплой
```

---

## Continuous deploy workflow

### Стандартный деплой (backend + frontend)

```bash
php artisan deploy
```

### Только backend изменения

```bash
php artisan deploy --skip-frontend
```

### Только frontend изменения

```bash
php artisan deploy --skip-backend --skip-git
# или если уже запушили:
php artisan deploy --skip-backend
```

### Что происходит при `php artisan deploy`

```
┌─ PHASE 1 — Local Git Push
│   git add .
│   git commit --allow-empty -m "auto deploy: 2026-02-26 15:00:00"
│   git push origin main
└─ ✅ SUCCESS

┌─ PHASE 2 — Remote Backend Deploy
│   cd /var/www/livegrid/backend
│   git pull origin main
│   composer install --no-dev --optimize-autoloader
│   php artisan migrate --force
│   php artisan db:seed --force
│   php artisan config:clear && cache:clear && route:clear && view:clear
│   php artisan config:cache && route:cache
│   php artisan optimize
│   php artisan storage:link
│   chmod -R 775 storage bootstrap/cache
└─ ✅ SUCCESS

┌─ PHASE 3 — Remote Frontend Build
│   cd /var/www/livegrid/backend/frontend
│   echo 'VITE_API_URL=https://livegrid.ru/api/v1' > .env.production
│   npm ci
│   npm run build
│   chown -R www-data:www-data dist/
└─ ✅ SUCCESS
```

Лог сохраняется в `storage/logs/deploy.log`.

---

## Post-deploy verification

```bash
# HTTP статусы
curl -I https://livegrid.ru/
curl -I https://livegrid.ru/api/v1/pages/home

# Сервисы
ssh root@85.198.64.93 "systemctl status nginx php8.2-fpm mysql"

# Nginx тест
ssh root@85.198.64.93 "nginx -t"

# Route list
ssh root@85.198.64.93 "cd /var/www/livegrid/backend && php artisan route:list --path=api"

# Размер фронтенд-билда
ssh root@85.198.64.93 "du -sh /var/www/livegrid/backend/frontend/dist"
```

---

## Rollback strategy

В проекте нет автоматического rollback. Используется ручной откат через git.

### Откат backend до предыдущего коммита

```bash
ssh root@85.198.64.93

cd /var/www/livegrid/backend

# Посмотреть историю
git log --oneline -10

# Откатиться к конкретному коммиту
git reset --hard <commit-hash>

# Пересобрать кэши
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader
php artisan migrate --force   # ОСТОРОЖНО: rollback миграций не выполняется автоматически
php artisan config:cache
php artisan route:cache
php artisan optimize
```

### Откат фронтенда

```bash
ssh root@85.198.64.93

cd /var/www/livegrid/backend/frontend
git reset --hard <commit-hash>

npm ci
npm run build
```

### Откат миграций (если нужен)

```bash
ssh root@85.198.64.93
cd /var/www/livegrid/backend

# Откатить последнюю миграцию
php artisan migrate:rollback

# Откатить N последних
php artisan migrate:rollback --step=2

# Статус миграций
php artisan migrate:status
```

> ⚠️ **Внимание:** откат миграций уничтожает данные. Делайте резервную копию БД перед rollback.

---

## Database backup

```bash
# Создать дамп
ssh root@85.198.64.93 \
  "mysqldump -u livegrid_user -p livegrid > /tmp/livegrid_$(date +%Y%m%d_%H%M%S).sql"

# Скачать дамп
scp root@85.198.64.93:/tmp/livegrid_*.sql ./backups/

# Восстановить
ssh root@85.198.64.93 \
  "mysql -u livegrid_user -p livegrid < /tmp/livegrid_backup.sql"
```

---

## Environment-specific deploy notes

### Если `node_modules` сломались на сервере

```bash
ssh root@85.198.64.93
cd /var/www/livegrid/backend/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Если PHP вернул 500

```bash
ssh root@85.198.64.93
cd /var/www/livegrid/backend

# Сбросить все кэши (без --force не трогает данные)
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Пересобрать
php artisan config:cache
php artisan route:cache
php artisan optimize

# Последние ошибки Laravel
tail -n 100 storage/logs/laravel.log
```

### Если Nginx вернул 502

```bash
ssh root@85.198.64.93
systemctl restart php8.2-fpm
systemctl reload nginx
# Проверить socket
ls -la /var/run/php/php8.2-fpm.sock
```
