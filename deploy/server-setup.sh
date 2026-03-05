#!/usr/bin/env bash
# =============================================================================
# server-setup.sh — Production server bootstrap for livegrid.ru
# =============================================================================
#
# Run once on a fresh Ubuntu 22.04 VPS as root:
#   bash server-setup.sh
#
# What this script does:
#   1. System update
#   2. Install Nginx, PHP 8.2-FPM, MySQL, Composer, Git, Certbot
#   3. Create MySQL database and user
#   4. Clone repository and create production .env
#   5. Configure Nginx (HTTP) for livegrid.ru
#   6. Run Laravel setup (composer, migrate, seed, optimize)
#   7. Obtain SSL certificate via Certbot
#   8. Enable Certbot auto-renew
#   9. Set correct permissions
#   10. Firewall rules (UFW)
#
# =============================================================================

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION — edit these before running
# ──────────────────────────────────────────────────────────────────────────────
DOMAIN="livegrid.ru"
REPO="https://github.com/letoceiling-coder/livegrid.ru.git"
BRANCH="main"
PROJECT_PATH="/var/www/livegrid/backend"
DB_NAME="livegrid"
DB_USER="livegrid_user"
DB_PASS="$(openssl rand -base64 24)"          # auto-generated secure password
CERTBOT_EMAIL="admin@livegrid.ru"
PHP_VERSION="8.2"
PHP_FPM_SOCK="/var/run/php/php${PHP_VERSION}-fpm.sock"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
WEB_USER="www-data"

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────
log()     { echo -e "\n\033[1;36m[$(date '+%H:%M:%S')] $*\033[0m"; }
success() { echo -e "\033[1;32m✓ $*\033[0m"; }
warn()    { echo -e "\033[1;33m⚠ $*\033[0m"; }
die()     { echo -e "\033[1;31m✗ ERROR: $*\033[0m" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "This script must be run as root"

# ──────────────────────────────────────────────────────────────────────────────
# 1. System update
# ──────────────────────────────────────────────────────────────────────────────
log "1/10 — System update"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
success "System updated"

# ──────────────────────────────────────────────────────────────────────────────
# 2. Install packages
# ──────────────────────────────────────────────────────────────────────────────
log "2/10 — Installing packages"
apt-get install -y \
    nginx \
    mysql-server \
    git \
    curl \
    unzip \
    software-properties-common \
    ufw \
    certbot \
    python3-certbot-nginx

# Add PHP PPA and install PHP 8.2
add-apt-repository -y ppa:ondrej/php
apt-get update -y
apt-get install -y \
    php${PHP_VERSION}-fpm \
    php${PHP_VERSION}-cli \
    php${PHP_VERSION}-mysql \
    php${PHP_VERSION}-mbstring \
    php${PHP_VERSION}-xml \
    php${PHP_VERSION}-curl \
    php${PHP_VERSION}-zip \
    php${PHP_VERSION}-bcmath \
    php${PHP_VERSION}-intl \
    php${PHP_VERSION}-gd \
    php${PHP_VERSION}-redis

# Install Composer globally
curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
success "All packages installed"

# ──────────────────────────────────────────────────────────────────────────────
# 3. MySQL — create database and user
# ──────────────────────────────────────────────────────────────────────────────
log "3/10 — Configuring MySQL"
mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
success "MySQL database '${DB_NAME}' and user '${DB_USER}' created"
warn "Generated DB password: ${DB_PASS}  ← SAVE THIS!"

# ──────────────────────────────────────────────────────────────────────────────
# 4. Clone repo and set up project
# ──────────────────────────────────────────────────────────────────────────────
log "4/10 — Cloning repository"
mkdir -p "$(dirname ${PROJECT_PATH})"
if [ -d "${PROJECT_PATH}/.git" ]; then
    warn "Repository already cloned, pulling latest..."
    cd "${PROJECT_PATH}"
    git pull origin "${BRANCH}"
else
    git clone --branch "${BRANCH}" "${REPO}" "${PROJECT_PATH}"
    cd "${PROJECT_PATH}"
fi

# Create production .env
log "Creating production .env"
cat > "${PROJECT_PATH}/.env" <<ENV
APP_NAME=Livegrid
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://${DOMAIN}

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

FRONTEND_URL=https://${DOMAIN}

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASS}

BROADCAST_DRIVER=log
CACHE_DRIVER=file
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
SESSION_DRIVER=file
SESSION_LIFETIME=120

SANCTUM_STATEFUL_DOMAINS=${DOMAIN},www.${DOMAIN}

DEPLOY_SSH_HOST=85.198.64.93
DEPLOY_SSH_USER=root
DEPLOY_PATH=${PROJECT_PATH}
DEPLOY_BRANCH=${BRANCH}
DEPLOY_DOMAIN=${DOMAIN}
ENV

# Generate app key
php artisan key:generate --force
success "Production .env created and app key generated"

# ──────────────────────────────────────────────────────────────────────────────
# 5. Nginx — HTTP config (before SSL)
# ──────────────────────────────────────────────────────────────────────────────
log "5/10 — Configuring Nginx (HTTP)"
cat > "${NGINX_CONF}" <<'NGINX'
server {
    listen 80;
    listen [::]:80;

    server_name livegrid.ru www.livegrid.ru;

    root /var/www/livegrid/backend/public;
    index index.php;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include        snippets/fastcgi-php.conf;
        fastcgi_pass   unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param  SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include        fastcgi_params;
    }

    location ~ /\. {
        deny all;
    }
}
NGINX

# Enable site
ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl reload nginx
success "Nginx configured"

# ──────────────────────────────────────────────────────────────────────────────
# 6. Laravel setup
# ──────────────────────────────────────────────────────────────────────────────
log "6/10 — Laravel setup"
cd "${PROJECT_PATH}"

composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan db:seed --force || true
php artisan config:cache
php artisan route:cache
php artisan optimize
php artisan storage:link || true

success "Laravel setup complete"

# ──────────────────────────────────────────────────────────────────────────────
# 7. SSL — Certbot
# ──────────────────────────────────────────────────────────────────────────────
log "7/10 — Obtaining SSL certificate"
mkdir -p /var/www/certbot

certbot --nginx \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "${CERTBOT_EMAIL}" \
    --redirect

success "SSL certificate obtained for ${DOMAIN}"

# Replace Nginx with full HTTPS config from deploy/nginx/
log "Deploying HTTPS Nginx config"
if [ -f "${PROJECT_PATH}/deploy/nginx/${DOMAIN}" ]; then
    cp "${PROJECT_PATH}/deploy/nginx/${DOMAIN}" "${NGINX_CONF}"
    nginx -t
    systemctl reload nginx
    success "Full HTTPS Nginx config deployed"
else
    warn "deploy/nginx/${DOMAIN} not found, using certbot-modified config"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 8. Certbot auto-renew
# ──────────────────────────────────────────────────────────────────────────────
log "8/10 — Setting up SSL auto-renewal"
# Certbot installs a systemd timer by default. Verify it's active:
systemctl enable certbot.timer  2>/dev/null || true
systemctl start  certbot.timer  2>/dev/null || true

# Also add a cron fallback
CRON_JOB="0 3 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'"
(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -
success "SSL auto-renewal configured"

# ──────────────────────────────────────────────────────────────────────────────
# 9. Permissions
# ──────────────────────────────────────────────────────────────────────────────
log "9/10 — Setting permissions"
chown -R "${WEB_USER}:${WEB_USER}" "${PROJECT_PATH}"
find "${PROJECT_PATH}" -type f -exec chmod 644 {} \;
find "${PROJECT_PATH}" -type d -exec chmod 755 {} \;
chmod -R 775 "${PROJECT_PATH}/storage"
chmod -R 775 "${PROJECT_PATH}/bootstrap/cache"
success "Permissions set"

# ──────────────────────────────────────────────────────────────────────────────
# 10. Firewall (UFW)
# ──────────────────────────────────────────────────────────────────────────────
log "10/10 — Configuring firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh      # 22
ufw allow http     # 80
ufw allow https    # 443
# Explicitly block 8000 (no Laravel dev server in production)
ufw deny 8000
ufw --force enable
ufw status verbose
success "Firewall configured: 22/80/443 open, 8000 blocked"

# ──────────────────────────────────────────────────────────────────────────────
# Final status check
# ──────────────────────────────────────────────────────────────────────────────
log "Final status checks"

echo ""
echo "──────────────────────────────────────────────────────"
echo " NGINX:"
systemctl is-active nginx && success "nginx is running" || warn "nginx not running"

echo " PHP-FPM:"
systemctl is-active "php${PHP_VERSION}-fpm" && success "php${PHP_VERSION}-fpm is running" || warn "fpm not running"

echo " MySQL:"
systemctl is-active mysql && success "mysql is running" || warn "mysql not running"

echo ""
echo " Route list:"
cd "${PROJECT_PATH}" && php artisan route:list --path=api 2>/dev/null || true

echo ""
echo "════════════════════════════════════════════════════════"
echo "  SERVER SETUP COMPLETE ✅"
echo "  Domain  : https://${DOMAIN}"
echo "  API     : https://${DOMAIN}/api/v1/pages/home"
echo "  DB Pass : ${DB_PASS}  ← STORE SECURELY"
echo "════════════════════════════════════════════════════════"
