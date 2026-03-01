#!/bin/bash
# Infrastructure diagnostic script

echo ""
echo "=========================================="
echo "1. TIMEZONE"
echo "=========================================="
echo "--- System timezone ---"
timedatectl 2>/dev/null || cat /etc/timezone 2>/dev/null || date
echo ""
echo "--- PHP timezone ---"
php -r "echo date_default_timezone_get(); echo PHP_EOL;"
echo ""
echo "--- MySQL timezone ---"
mysql -e "SELECT @@global.time_zone AS global_tz, @@session.time_zone AS session_tz;" 2>&1

echo ""
echo "=========================================="
echo "2. MYSQL VERSION & ENGINE"
echo "=========================================="
mysql --version 2>&1
mysql -e "SHOW VARIABLES LIKE 'version';" 2>&1
mysql -e "SHOW VARIABLES LIKE 'innodb_version';" 2>&1
mysql -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';" 2>&1
mysql -e "SHOW VARIABLES LIKE 'max_allowed_packet';" 2>&1

echo ""
echo "=========================================="
echo "3. SERVER RESOURCES"
echo "=========================================="
echo "--- RAM ---"
free -h
echo ""
echo "--- CPU cores ---"
nproc
echo ""
echo "--- Disk space ---"
df -h
echo ""
echo "--- Load average ---"
uptime

echo ""
echo "=========================================="
echo "4. PHP LIMITS"
echo "=========================================="
php -i 2>/dev/null | grep -E "memory_limit|max_execution_time|upload_max_filesize"
echo ""
echo "--- Laravel PHP ini (cli) ---"
cd /var/www/livegrid/backend && php artisan tinker --execute="echo ini_get('memory_limit');" 2>/dev/null || echo "tinker not available"

echo ""
echo "=========================================="
echo "5. DATABASE SIZE"
echo "=========================================="
mysql -e "SELECT table_schema AS 'DB', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'MB' FROM information_schema.tables GROUP BY table_schema ORDER BY 2 DESC;" 2>&1
echo ""
echo "--- Table sizes in livegrid ---"
mysql -e "SELECT table_name, ROUND((data_length + index_length) / 1024 / 1024, 3) AS 'MB', table_rows FROM information_schema.tables WHERE table_schema = 'livegrid' ORDER BY 2 DESC;" 2>&1

echo ""
echo "=========================================="
echo "6. SPATIAL SUPPORT"
echo "=========================================="
mysql -e "SHOW VARIABLES LIKE 'have_geometry';" 2>&1
mysql -e "SELECT ST_AsText(ST_GeomFromText('POINT(1 1)'));" 2>&1
mysql -e "SELECT ST_Distance_Sphere(POINT(37.62, 55.75), POINT(37.62, 55.75)) AS dist_m;" 2>&1

echo ""
echo "=========================================="
echo "7. CRON STATUS"
echo "=========================================="
crontab -l 2>/dev/null || echo "(no crontab for root)"
echo ""
echo "--- All system crons ---"
ls /etc/cron.d/ 2>/dev/null
