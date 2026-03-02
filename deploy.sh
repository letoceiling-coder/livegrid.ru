#!/usr/bin/env bash
# deploy.sh — pull latest code and restart services
set -e

REPO="/var/www/livegrid/backend"

echo "==> [deploy] Pulling latest code..."
git -C "$REPO" fetch origin main
git -C "$REPO" reset --hard origin/main

echo "==> [deploy] Composer install (no dev)..."
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader -d "$REPO"

echo "==> [deploy] Frontend dist (nginx serves from frontend/dist)..."
FE="$REPO/frontend"
D="$FE/dist"
mkdir -p "$D"
cp -f "$FE/index.html" "$D/" 2>/dev/null || true
[ -d "$FE/assets" ] && rm -rf "$D/assets" && cp -r "$FE/assets" "$D/"
for f in favicon.svg favicon.ico logo.svg placeholder.svg robots.txt contacts.png buildings-promo.png; do
  [ -f "$FE/$f" ] && cp -f "$FE/$f" "$D/"
done
chown -R www-data:www-data "$D"

echo "==> [deploy] Artisan optimize..."
php "$REPO/artisan" config:cache
php "$REPO/artisan" route:cache
php "$REPO/artisan" view:cache
php "$REPO/artisan" event:cache

echo "==> [deploy] Fix storage permissions..."
chown -R www-data:www-data "$REPO/storage" "$REPO/bootstrap/cache"
chmod -R 775 "$REPO/storage" "$REPO/bootstrap/cache"

echo "==> [deploy] Reload PHP-FPM..."
systemctl reload php8.2-fpm

echo "==> [deploy] Done! $(date)"
