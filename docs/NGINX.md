# Nginx Configuration

Конфиг: `/etc/nginx/sites-available/livegrid.ru`  
Источник в репо: `deploy/nginx/livegrid.ru`

---

## Структура конфига

Два `server` блока:

```
server { listen 80  }   ← HTTP → HTTPS redirect
server { listen 443 }   ← основной блок (SPA + API + SSL)
```

---

## HTTP → HTTPS redirect

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name livegrid.ru www.livegrid.ru;

    # ACME challenge — нужен для Certbot при продлении сертификата
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Всё остальное — 301 на HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

**Почему 301 (permanent) а не 302?**  
301 кэшируется браузерами и поисковиками — повторные запросы на HTTP не попадают на сервер.

---

## SSL (Let's Encrypt)

```nginx
ssl_certificate     /etc/letsencrypt/live/livegrid.ru/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/livegrid.ru/privkey.pem;
include             /etc/letsencrypt/options-ssl-nginx.conf;
ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;
```

`options-ssl-nginx.conf` — файл Certbot, который содержит:
- `ssl_protocols TLSv1.2 TLSv1.3`
- `ssl_ciphers <recommended>`
- `ssl_prefer_server_ciphers off`

---

## Laravel API: `location ^~ /api/`

```nginx
location ^~ /api/ {
    root /var/www/livegrid/backend/public;

    try_files $uri /index.php?$query_string;

    location ~ \.php$ {
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass            unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index           index.php;
        fastcgi_param           SCRIPT_FILENAME /var/www/livegrid/backend/public/index.php;
        fastcgi_param           DOCUMENT_ROOT   /var/www/livegrid/backend/public;
        include                 fastcgi_params;
        fastcgi_read_timeout    300;
    }
}
```

**Ключевые детали:**

| Директива | Значение | Пояснение |
|-----------|---------|-----------|
| `^~` | Префикс с наивысшим приоритетом | Прерывает поиск других `location` |
| `root` | `backend/public` | Переключает document root для этого блока |
| `try_files $uri /index.php?$query_string` | Сначала ищем файл, потом → `index.php` | Позволяет отдавать статику из `public/`, `/api/*` → `index.php` |
| `SCRIPT_FILENAME` | Жёстко указан `index.php` | Все PHP-запросы идут через Laravel front controller |

**Почему `SCRIPT_FILENAME` жёстко?**  
В Laravel всегда один точкой входа является `public/index.php`. Жёсткая привязка исключает возможность запустить произвольный `.php` файл.

---

## React SPA fallback: `location /`

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

**Логика `try_files`:**

1. `$uri` — ищем файл буквально: `/catalog` → `dist/catalog` (не существует)
2. `$uri/` — ищем директорию: `dist/catalog/` (не существует)
3. `/index.html` — fallback: отдаём `dist/index.html`, React Router обрабатывает URL

Это стандартный паттерн для SPA. Без него `GET /catalog` при прямом переходе вернёт 404.

---

## Статические файлы (кэширование)

```nginx
location ~* \.(js|css|woff2?|ttf|eot|otf|svg|webp|png|jpg|jpeg|gif|ico)$ {
    expires    1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

Vite генерирует имена файлов с хешем содержимого (`vendor-RlW5PSiM.js`).  
Это означает: если файл изменился — изменилось имя → браузер запросит новый файл.  
Поэтому безопасно кэшировать на 1 год с `immutable`.

---

## Storage: uploaded files

```nginx
location ^~ /storage/ {
    alias /var/www/livegrid/backend/public/storage/;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

`php artisan storage:link` создаёт симлинк `public/storage → storage/app/public`.  
Nginx раздаёт файлы напрямую, минуя PHP-FPM — быстрее и экономнее.

---

## Security headers

```nginx
add_header X-Frame-Options           "SAMEORIGIN"    always;
add_header X-Content-Type-Options    "nosniff"       always;
add_header X-XSS-Protection          "1; mode=block" always;
add_header Referrer-Policy           "strict-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

| Заголовок | Защита от |
|----------|----------|
| `X-Frame-Options: SAMEORIGIN` | Clickjacking (встраивание в iframe) |
| `X-Content-Type-Options: nosniff` | MIME-sniffing атак |
| `X-XSS-Protection` | Устаревший, но поддерживается старыми IE |
| `Referrer-Policy: strict-origin` | Утечки URL в Referer-заголовке |
| `Strict-Transport-Security` | Downgrade attacks, принудительный HTTPS |

`preload` в HSTS включает домен в HSTS preload list браузеров.

---

## Блокировка чувствительных файлов

```nginx
location ~ /\.(env|git|ht) {
    deny all;
    return 404;
}

location ~* \.(env|log|sql|sh|bak)$ {
    deny all;
    return 404;
}
```

Блокирует доступ к:
- `.env` — переменные окружения с паролями
- `.git/` — история репозитория
- `.htaccess` — Apache-конфиги (не используются, но могут присутствовать)
- `*.log`, `*.sql`, `*.sh`, `*.bak` — логи, дампы, скрипты

---

## Gzip compression

```nginx
gzip            on;
gzip_vary       on;
gzip_proxied    any;
gzip_comp_level 6;
gzip_types      text/plain text/css text/xml text/javascript
                application/json application/javascript application/xml+rss
                application/atom+xml image/svg+xml;
gzip_min_length 256;
```

Уровень `6` — баланс скорость/степень сжатия.  
Изображения (jpg, png, webp) не сжимаются — они уже сжаты.

---

## Управление конфигом

```bash
# Применить изменения из репо
ssh root@85.198.64.93
cp /var/www/livegrid/backend/deploy/nginx/livegrid.ru \
   /etc/nginx/sites-available/livegrid.ru

# Проверить синтаксис
nginx -t

# Применить без перезапуска
systemctl reload nginx

# Полный перезапуск (прерывает активные соединения)
systemctl restart nginx
```

---

## Диагностика

```bash
# Проверить активный конфиг
nginx -T | grep -A 50 "server_name livegrid"

# Логи доступа
tail -f /var/log/nginx/livegrid.access.log

# Логи ошибок
tail -f /var/log/nginx/livegrid.error.log

# Текущие соединения
ss -tlnp | grep nginx
```
