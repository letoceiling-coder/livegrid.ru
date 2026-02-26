#!/usr/bin/env bash
# =============================================================================
# vps-init.sh — ONE-SHOT VPS bootstrap for livegrid.ru
# Ubuntu 24.04 LTS | root@85.198.64.93
# =============================================================================
#
# USAGE (from local machine):
#   ssh root@85.198.64.93 'bash -s' < deploy/vps-init.sh
#
# Or copy and run on server:
#   scp deploy/vps-init.sh root@85.198.64.93:/tmp/
#   ssh root@85.198.64.93 "bash /tmp/vps-init.sh"
#
# =============================================================================

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# ──────────────────────────────────────────────────────────────────────────────
# VARIABLES
# ──────────────────────────────────────────────────────────────────────────────
REPO="https://github.com/letoceiling-coder/livegrid.ru.git"
BRANCH="main"
PROJECT_PATH="/var/www/livegrid/backend"
DOMAIN="livegrid.ru"
CERTBOT_EMAIL="admin@livegrid.ru"
PHP_VER="8.2"
DB_NAME="livegrid"
DB_USER="livegrid_user"
DB_PASS="$(openssl rand -base64 32 | tr -d '/+=' | head -c 24)"
WEB_USER="www-data"

# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()     { echo -e "\n${CYAN}━━━ [$(date '+%H:%M:%S')] $* ${NC}"; }
ok()      { echo -e "${GREEN}  ✓ $*${NC}"; }
warn()    { echo -e "${YELLOW}  ⚠ $*${NC}"; }
die()     { echo -e "${RED}  ✗ FATAL: $*${NC}" >&2; exit 1; }
sep()     { echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

[[ $EUID -eq 0 ]] || die "Run as root"

sep
echo -e "${CYAN}  VPS INIT — livegrid.ru — $(date)${NC}"
sep

# ──────────────────────────────────────────────────────────────────────────────
# STEP 1 — System update
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 1/10 — System update"
apt-get update -y -q
apt-get upgrade -y -q
ok "System updated"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 2 — Install packages
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 2/10 — Installing packages"

apt-get install -y -q \
    nginx \
    mysql-server \
    git \
    curl \
    wget \
    unzip \
    software-properties-common \
    ufw \
    certbot \
    python3-certbot-nginx \
    openssl

# PHP 8.2 via ondrej PPA (Ubuntu 24.04 ships PHP 8.3 by default)
if ! php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;" 2>/dev/null | grep -q "^8\.2"; then
    add-apt-repository -y ppa:ondrej/php
    apt-get update -y -q
fi

apt-get install -y -q \
    php${PHP_VER}-fpm \
    php${PHP_VER}-cli \
    php${PHP_VER}-mysql \
    php${PHP_VER}-mbstring \
    php${PHP_VER}-xml \
    php${PHP_VER}-curl \
    php${PHP_VER}-zip \
    php${PHP_VER}-bcmath \
    php${PHP_VER}-intl \
    php${PHP_VER}-gd \
    php${PHP_VER}-tokenizer \
    php${PHP_VER}-fileinfo

# Composer
if ! command -v composer &>/dev/null; then
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer --quiet
fi

ok "All packages installed"
php -v | head -1
composer --version

# ──────────────────────────────────────────────────────────────────────────────
# STEP 3 — MySQL — create database and user
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 3/10 — Configure MySQL"

# Ensure MySQL is running
systemctl start mysql
systemctl enable mysql

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1'
    IDENTIFIED BY '${DB_PASS}';

GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

ok "MySQL: database '${DB_NAME}', user '${DB_USER}' created"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 4 — Clone / update repository
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 4/10 — Clone repository"

mkdir -p "$(dirname "${PROJECT_PATH}")"

if [[ -d "${PROJECT_PATH}/.git" ]]; then
    warn "Repository already exists — pulling latest"
    cd "${PROJECT_PATH}"
    git fetch --all
    git reset --hard "origin/${BRANCH}"
    git pull origin "${BRANCH}"
else
    warn "Cloning from ${REPO}"
    git clone --branch "${BRANCH}" "${REPO}" "${PROJECT_PATH}"
    cd "${PROJECT_PATH}"
fi

ok "Repository ready at ${PROJECT_PATH}"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 5 — Production .env
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 5/10 — Create production .env"

cd "${PROJECT_PATH}"

# Only create .env if it doesn't exist (don't overwrite manual edits)
if [[ ! -f .env ]]; then
    cat > .env <<ENV
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
DEPLOY_SSH_KEY=/root/.ssh/id_rsa
DEPLOY_SSH_PORT=22
DEPLOY_PATH=${PROJECT_PATH}
DEPLOY_BRANCH=${BRANCH}
DEPLOY_DOMAIN=${DOMAIN}
ENV
    # Generate APP_KEY directly without artisan (vendor/ not installed yet)
    RAW_KEY="$(openssl rand -base64 32)"
    APP_KEY_VAL="base64:${RAW_KEY}"
    sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY_VAL}|" .env
    ok ".env created, APP_KEY generated (openssl)"
else
    warn ".env already exists — skipping"
    # Ensure APP_KEY is set if empty
    if grep -q "^APP_KEY=$" .env; then
        RAW_KEY="$(openssl rand -base64 32)"
        sed -i "s|^APP_KEY=.*|APP_KEY=base64:${RAW_KEY}|" .env
        ok "APP_KEY was empty, generated new one"
    fi
fi

# ──────────────────────────────────────────────────────────────────────────────
# STEP 6 — Composer + Artisan setup
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 6/10 — Composer install + Laravel setup"

cd "${PROJECT_PATH}"
COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction

php artisan migrate --force
php artisan db:seed --force || warn "Seeder failed or no seeders (non-fatal)"
php artisan config:cache
php artisan route:cache
php artisan optimize
php artisan storage:link || true

ok "Laravel setup complete"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 7 — Permissions
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 7/10 — Permissions"

chown -R "${WEB_USER}:${WEB_USER}" "${PROJECT_PATH}"
find "${PROJECT_PATH}" -type f -exec chmod 644 {} \;
find "${PROJECT_PATH}" -type d -exec chmod 755 {} \;
chmod -R 775 "${PROJECT_PATH}/storage"
chmod -R 775 "${PROJECT_PATH}/bootstrap/cache"
# artisan must be executable
chmod +x "${PROJECT_PATH}/artisan"

ok "Permissions set"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 8 — Nginx (HTTP first, HTTPS after certbot)
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 8/10 — Nginx configuration"

NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
mkdir -p /var/www/certbot

# Write HTTP-only config first (needed for certbot ACME challenge)
cat > "${NGINX_CONF}" <<NGINX
server {
    listen 80;
    listen [::]:80;

    server_name ${DOMAIN} www.${DOMAIN};

    root ${PROJECT_PATH}/public;
    index index.php;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php\$ {
        include        snippets/fastcgi-php.conf;
        fastcgi_pass   unix:/var/run/php/php${PHP_VER}-fpm.sock;
        fastcgi_param  SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include        fastcgi_params;
        fastcgi_read_timeout 300;
    }

    # Block sensitive files
    location ~ /\.(env|git|ht) {
        deny all;
        return 404;
    }
}
NGINX

# Enable site
ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl enable nginx
systemctl restart nginx
ok "Nginx started (HTTP)"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 9 — SSL via Certbot
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 9/10 — SSL Let's Encrypt"

# Check if domain resolves to this server
SERVER_IP=$(curl -s https://api.ipify.org || curl -s https://ifconfig.me || echo "unknown")
DOMAIN_IP=$(getent hosts "${DOMAIN}" | awk '{print $1}' || echo "unknown")

if [[ "${SERVER_IP}" != "${DOMAIN_IP}" ]]; then
    warn "Domain '${DOMAIN}' resolves to ${DOMAIN_IP}, server IP is ${SERVER_IP}"
    warn "DNS not yet pointing to this server — SKIPPING certbot"
    warn "After DNS propagation run: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${CERTBOT_EMAIL}"
else
    certbot --nginx \
        -d "${DOMAIN}" \
        -d "www.${DOMAIN}" \
        --non-interactive \
        --agree-tos \
        --email "${CERTBOT_EMAIL}" \
        --redirect
    ok "SSL certificate obtained"

    # If we have the full HTTPS nginx config from deploy/nginx/, apply it
    if [[ -f "${PROJECT_PATH}/deploy/nginx/${DOMAIN}" ]]; then
        cp "${PROJECT_PATH}/deploy/nginx/${DOMAIN}" "${NGINX_CONF}"
        nginx -t && systemctl reload nginx
        ok "Production Nginx HTTPS config applied"
    fi
fi

# Certbot auto-renew (systemd timer is installed by default, add cron as backup)
CRON_RENEW="0 3 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'"
(crontab -l 2>/dev/null | grep -qF 'certbot renew') || \
    (crontab -l 2>/dev/null; echo "${CRON_RENEW}") | crontab -
ok "Certbot auto-renewal configured"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 10 — Firewall (UFW) + GitHub SSH deploy key
# ──────────────────────────────────────────────────────────────────────────────
log "STEP 10/10 — Firewall + SSH Deploy Key"

# Firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP'
ufw allow 443/tcp   comment 'HTTPS'
ufw deny 8000/tcp   comment 'Block Laravel dev server'
ufw --force enable
ok "Firewall: 22/80/443 open, 8000 blocked"

# Generate GitHub deploy key (for private repo or future deploy-by-key)
DEPLOY_KEY="/root/.ssh/id_rsa_livegrid"
if [[ ! -f "${DEPLOY_KEY}" ]]; then
    ssh-keygen -t rsa -b 4096 -C "deploy@${DOMAIN}" -f "${DEPLOY_KEY}" -N ""
    ok "Deploy key generated: ${DEPLOY_KEY}"
fi

# ──────────────────────────────────────────────────────────────────────────────
# FINAL STATUS REPORT
# ──────────────────────────────────────────────────────────────────────────────
sep
echo ""
echo -e "${CYAN}  SERVICES STATUS${NC}"
for svc in nginx "php${PHP_VER}-fpm" mysql; do
    if systemctl is-active --quiet "$svc"; then
        ok "$svc is RUNNING"
    else
        warn "$svc is NOT running — check: systemctl status $svc"
    fi
done

echo ""
echo -e "${CYAN}  ROUTE LIST${NC}"
cd "${PROJECT_PATH}" && php artisan route:list --path=api 2>/dev/null || true

echo ""
sep
echo -e "${GREEN}"
cat <<REPORT
  ╔═══════════════════════════════════════════════════════╗
  ║           VPS INIT COMPLETE ✅                        ║
  ╠═══════════════════════════════════════════════════════╣
  ║  Domain   : https://${DOMAIN}
  ║  API test : https://${DOMAIN}/api/v1/pages/home
  ║  Project  : ${PROJECT_PATH}
  ║  PHP      : $(php -r 'echo PHP_VERSION;')
  ║  DB Name  : ${DB_NAME}
  ║  DB User  : ${DB_USER}
  ║  DB Pass  : ${DB_PASS}
  ║
  ║  ⚠  SAVE DB PASSWORD ABOVE — it won't be shown again
  ║
  ║  GitHub Deploy Key (add to repo → Settings → Deploy Keys):
  ╠═══════════════════════════════════════════════════════╣
REPORT
echo -e "${NC}"
cat "${DEPLOY_KEY}.pub" 2>/dev/null || true
sep
echo ""
echo -e "${YELLOW}  NEXT STEPS:${NC}"
echo "  1. Add the public key above to GitHub → Settings → Deploy Keys"
echo "  2. Test: curl https://${DOMAIN}/api/v1/pages/home"
echo "  3. From local machine: php artisan deploy"
echo "  4. If DNS not yet propagated, run certbot manually after:"
echo "     certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${CERTBOT_EMAIL}"
sep
