# /etc/nginx/sites-available/livegrid.ru
# livegrid.ru — React SPA (frontend) + Laravel API (backend)
# Frontend dist : /var/www/livegrid/backend/frontend/dist
# Backend public: /var/www/livegrid/backend/public

##############################################################################
# HTTP → HTTPS redirect
##############################################################################
server {
    listen 80;
    listen [::]:80;

    server_name livegrid.ru www.livegrid.ru;

    # ACME challenge for Certbot renewals
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

##############################################################################
# HTTPS — main block
##############################################################################
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name livegrid.ru www.livegrid.ru;

    # ─── SSL (managed by Certbot) ─────────────────────────────────────────
    ssl_certificate     /etc/letsencrypt/live/livegrid.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/livegrid.ru/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # ─── Security headers ─────────────────────────────────────────────────
    add_header X-Frame-Options           "SAMEORIGIN"    always;
    add_header X-Content-Type-Options    "nosniff"       always;
    add_header X-XSS-Protection          "1; mode=block" always;
    add_header Referrer-Policy           "strict-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # ─── Logging ──────────────────────────────────────────────────────────
    access_log /var/log/nginx/livegrid.access.log;
    error_log  /var/log/nginx/livegrid.error.log warn;

    # ─── Compression ──────────────────────────────────────────────────────
    gzip            on;
    gzip_vary       on;
    gzip_proxied    any;
    gzip_comp_level 6;
    gzip_types
        text/plain text/css text/xml text/javascript
        application/json application/javascript application/xml+rss
        application/atom+xml image/svg+xml;
    gzip_min_length 256;

    # ─── Limits ───────────────────────────────────────────────────────────
    client_max_body_size 50M;
    keepalive_timeout    65;

    # ─── Frontend root ────────────────────────────────────────────────────
    root  /var/www/livegrid/backend/frontend/dist;
    index index.html;

    ##########################################################################
    # API — Laravel backend
    # All /api/* and /sanctum/* requests go to Laravel's index.php
    ##########################################################################
    location ^~ /api/ {
        # Override root for this block
        root /var/www/livegrid/backend/public;

        # Always route through Laravel's front controller
        try_files $uri /index.php?$query_string;

        location ~ \.php$ {
            fastcgi_split_path_info ^(.+\.php)(/.+)$;
            fastcgi_pass            unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_index           index.php;
            fastcgi_param           SCRIPT_FILENAME /var/www/livegrid/backend/public/index.php;
            fastcgi_param           DOCUMENT_ROOT   /var/www/livegrid/backend/public;
            include                 fastcgi_params;
            fastcgi_read_timeout    300;
            fastcgi_send_timeout    300;
            fastcgi_buffer_size     128k;
            fastcgi_buffers         4 256k;
        }
    }

    # Sanctum CSRF cookie endpoint (SPA authentication)
    location ^~ /sanctum/ {
        root /var/www/livegrid/backend/public;
        try_files $uri /index.php?$query_string;

        location ~ \.php$ {
            fastcgi_pass        unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param       SCRIPT_FILENAME /var/www/livegrid/backend/public/index.php;
            fastcgi_param       DOCUMENT_ROOT   /var/www/livegrid/backend/public;
            include             fastcgi_params;
            fastcgi_read_timeout 300;
        }
    }

    # Backend storage (uploaded media files)
    location ^~ /storage/ {
        alias /var/www/livegrid/backend/public/storage/;
        # Note: This requires php artisan storage:link to have been run
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    ##########################################################################
    # React SPA — all other routes serve index.html
    ##########################################################################
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static asset caching (hashed filenames from Vite)
    location ~* \.(js|css|woff2?|ttf|eot|otf|svg|webp|png|jpg|jpeg|gif|ico)$ {
        expires    1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    ##########################################################################
    # Security — block sensitive files
    ##########################################################################
    location ~ /\.(env|git|ht) {
        deny all;
        return 404;
    }

    location ~* \.(env|log|sql|sh|bak)$ {
        deny all;
        return 404;
    }
}
