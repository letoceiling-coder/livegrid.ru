# /etc/nginx/sites-available/livegrid.ru
# Laravel 10 API — livegrid.ru
# Generated for: https://livegrid.ru
# Project path: /var/www/livegrid/backend

##############################################################################
# HTTP → HTTPS redirect
##############################################################################
server {
    listen 80;
    listen [::]:80;

    server_name livegrid.ru www.livegrid.ru;

    # Let's Encrypt ACME challenge (certbot needs this)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

##############################################################################
# HTTPS — main server block
##############################################################################
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name livegrid.ru www.livegrid.ru;

    root /var/www/livegrid/backend/public;
    index index.php;

    # -------------------------------------------------------------------------
    # SSL (managed by Certbot — do not remove the certbot comment lines)
    # -------------------------------------------------------------------------
    ssl_certificate     /etc/letsencrypt/live/livegrid.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/livegrid.ru/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # -------------------------------------------------------------------------
    # Security headers
    # -------------------------------------------------------------------------
    add_header X-Frame-Options           "SAMEORIGIN"           always;
    add_header X-Content-Type-Options    "nosniff"              always;
    add_header X-XSS-Protection          "1; mode=block"        always;
    add_header Referrer-Policy           "strict-origin"        always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # CORS for API — handled in Laravel, not here
    # (Avoids double CORS headers)

    # -------------------------------------------------------------------------
    # Logging
    # -------------------------------------------------------------------------
    access_log /var/log/nginx/livegrid.access.log;
    error_log  /var/log/nginx/livegrid.error.log  warn;

    # -------------------------------------------------------------------------
    # Gzip compression
    # -------------------------------------------------------------------------
    gzip            on;
    gzip_types      text/plain application/json application/javascript text/css;
    gzip_min_length 256;

    # -------------------------------------------------------------------------
    # Client limits
    # -------------------------------------------------------------------------
    client_max_body_size 50M;
    keepalive_timeout    65;

    # -------------------------------------------------------------------------
    # Laravel routing
    # -------------------------------------------------------------------------
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM
    location ~ \.php$ {
        include        snippets/fastcgi-php.conf;
        fastcgi_pass   unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param  SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include        fastcgi_params;

        # Timeouts for long requests (migrations etc.)
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
    }

    # Block hidden files (.htaccess, .env, .git, etc.)
    location ~ /\. {
        deny all;
        return 404;
    }

    # Prevent direct access to sensitive files
    location ~* \.(env|log|sql|sh|bak)$ {
        deny all;
        return 404;
    }

    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff2?|ttf|svg|webp)$ {
        expires    30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
