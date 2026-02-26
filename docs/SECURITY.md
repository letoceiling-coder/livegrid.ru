# Security

## Принципы безопасности проекта

1. **Нет паролей в коде и git** — только переменные окружения
2. **Нет прямого shell-exec** — только Symfony Process с массивом аргументов
3. **SSH только по ключу** — без паролей
4. **Минимальная поверхность атаки** — открыты только порты 22, 80, 443
5. **Нулевая информация об ошибках** — `APP_DEBUG=false` в production

---

## APP_DEBUG=false

```env
# production .env
APP_DEBUG=false
```

При `APP_DEBUG=true` Laravel возвращает в ответе:
- Полный stacktrace с именами файлов и строками
- Значения переменных окружения
- SQL-запросы с параметрами
- Пути файловой системы

При `APP_DEBUG=false` вместо этого возвращается:
```json
{
    "message": "Server Error",
    "exception": "HttpException"
}
```

**Проверка:**
```bash
ssh root@85.198.64.93
cd /var/www/livegrid/backend
grep APP_DEBUG .env         # должно быть false
php artisan config:show app | grep debug
```

---

## SSH: только ключевая аутентификация

### Генерация ключа

```bash
# На локальной машине
ssh-keygen -t rsa -b 4096 -C "deploy@livegrid.ru" -f ~/.ssh/id_rsa_livegrid -N ""

# Копируем публичный ключ на сервер
ssh-copy-id -i ~/.ssh/id_rsa_livegrid.pub root@85.198.64.93
```

### Отключение парольной аутентификации (рекомендуется)

```bash
ssh root@85.198.64.93
nano /etc/ssh/sshd_config

# Изменить:
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password

# Применить
systemctl restart sshd
```

### Использование в DeployCommand

```php
// DeployCommand.php использует Symfony Process — НЕ exec()
$process = new Process([
    'ssh', '-i', $config['ssh_key'],
    '-o', 'StrictHostKeyChecking=accept-new',
    '-T',
    $config['user'] . '@' . $config['host'],
    'bash -s'
], null, null, $script, 900);
```

SSH-ключ берётся из `DEPLOY_SSH_KEY` в `.env` — **в git не хранится**.

---

## UFW Firewall

### Текущие правила

```
Правило        Действие   Назначение
───────────    ────────   ──────────
22/tcp         ALLOW      SSH (управление сервером)
80/tcp         ALLOW      HTTP (только для ACME challenge + redirect)
443/tcp        ALLOW      HTTPS (основной трафик)
8000/tcp       DENY       Laravel dev server (закрыт в production)
*              DENY       Все остальные входящие соединения
```

### Управление

```bash
# Просмотр статуса
ufw status verbose

# Добавить правило (если нужно)
ufw allow 22/tcp

# Удалить правило
ufw delete allow 8000/tcp

# Сбросить и настроить заново
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 8000/tcp
ufw --force enable
```

**Почему закрыт порт 8000?**  
`php artisan serve` запускает встроенный dev-сервер на порту 8000.  
В production он не нужен. Если его случайно запустить, без UFW он будет доступен публично.

---

## SSL auto-renewal

### Certbot systemd timer (основной)

Ubuntu 24.04 устанавливает `certbot.timer` автоматически:

```bash
systemctl status certbot.timer
# должен показать: active (waiting)

# Ручная проверка renewal
certbot renew --dry-run
```

### Cron backup

`vps-init.sh` добавляет запись в crontab как дублирующий механизм:

```cron
0 3 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'
```

### Проверка срока действия

```bash
echo | openssl s_client -connect livegrid.ru:443 -servername livegrid.ru 2>/dev/null \
    | openssl x509 -noout -dates

# Или через certbot
certbot certificates
```

---

## Права файлов (chmod)

| Путь | Права | Пояснение |
|------|-------|-----------|
| `storage/` | `775` | Laravel пишет логи, кэш, сессии |
| `bootstrap/cache/` | `775` | Laravel пишет compiled routes/config |
| `*.php` | `644` | Только чтение для web-процесса |
| `artisan` | `755` | Должен быть исполняемым |
| `.env` | `640` | Только владелец читает; группа — нет |

```bash
# Применить корректные права
cd /var/www/livegrid/backend
chown -R www-data:www-data .
find . -type f -exec chmod 644 {} \;
find . -type d -exec chmod 755 {} \;
chmod -R 775 storage bootstrap/cache
chmod +x artisan
chmod 640 .env
```

---

## .env не в git

```bash
# Проверить .gitignore
grep "\.env" .gitignore

# Убедиться, что .env не отслеживается
git ls-files .env
# Если вернула имя файла — файл в репо! Удалить:
git rm --cached .env
git commit -m "security: remove .env from tracking"
```

`.env` и `.env.local` внесены в `.gitignore`:
```
.env
.env.*.local
frontend/.env.local
```

`.env.example` и `frontend/.env.production` — **безопасно коммитить**, т.к. не содержат реальных секретов.

---

## API security

### Валидация входных данных

Все контроллеры используют Laravel Form Requests с `validate()`:

```php
$credentials = $request->validate([
    'email'    => ['required', 'email'],
    'password' => ['required', 'string'],
]);
```

При ошибке валидации автоматически возвращается `422 Unprocessable Entity`:

```json
{
    "message": "The email field is required.",
    "errors": {
        "email": ["The email field is required."]
    }
}
```

### Rate limiting

Laravel применяет throttle middleware по умолчанию для API маршрутов.  
Дополнительная настройка в `RouteServiceProvider` при необходимости.

### SQL Injection

Полностью исключён — Eloquent ORM и Query Builder используют PDO prepared statements.

---

## Nginx security headers

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
add_header X-Frame-Options           "SAMEORIGIN";
add_header X-Content-Type-Options    "nosniff";
```

Подробно: [`NGINX.md → Security headers`](NGINX.md#security-headers)

---

## Security checklist

```
[✓] APP_DEBUG=false
[✓] APP_KEY сгенерирован (base64:...)
[✓] .env не в git
[✓] SSH только по ключу
[✓] Порт 8000 закрыт (UFW)
[✓] Только 22/80/443 открыты
[✓] storage/ chmod 775
[✓] bootstrap/cache/ chmod 775
[✓] SSL Let's Encrypt + auto-renew
[✓] HTTPS redirect с HTTP (301)
[✓] HSTS header (max-age=31536000)
[✓] .env, .git, .htaccess заблокированы в Nginx
[✓] SQL-инъекции исключены (Eloquent ORM)
[✓] XSS в API отсутствует (JSON responses, не HTML)
[✓] Никакого exec() — только Symfony Process
[✓] DB_USER не root
```
