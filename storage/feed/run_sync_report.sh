#!/bin/bash

LOG="/tmp/feed_sync_output.log"
SLOW_LOG="/var/log/mysql/mysql-slow.log"
DB="livegrid"

echo "=========================================="
echo "  feed:sync — Production Performance Run"
echo "  Started: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=========================================="
echo ""

# ── Step 1: Run feed:sync ─────────────────────────────────────────────────────
echo "--- Running: php artisan feed:sync ---"
cd /var/www/livegrid/backend

START_TS=$(date +%s%N)
php artisan feed:sync 2>&1 | tee "$LOG"
EXIT_CODE=${PIPESTATUS[0]}
END_TS=$(date +%s%N)

WALL_SECS=$(echo "scale=2; ($END_TS - $START_TS) / 1000000000" | bc)

echo ""
echo "--- feed:sync exit code: $EXIT_CODE ---"
echo "--- Wall-clock time: ${WALL_SECS}s ---"

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ CRITICAL: feed:sync failed with exit code $EXIT_CODE"
    echo "Last 30 lines of output:"
    tail -30 "$LOG"
    exit $EXIT_CODE
fi

# ── Step 2: Parse stats from Laravel log ─────────────────────────────────────
echo ""
echo "=========================================="
echo "  2. SYNC STATS (from feed log)"
echo "=========================================="
FEED_LOG="/var/www/livegrid/backend/storage/logs/feed.log"
if [ -f "$FEED_LOG" ]; then
    echo "--- Last 'sync complete' entry ---"
    grep "sync complete" "$FEED_LOG" | tail -1
    echo ""
    echo "--- Last 20 log lines ---"
    tail -20 "$FEED_LOG"
else
    echo "(feed.log not found at $FEED_LOG)"
fi

# ── Step 3: Database row count ────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  3. DATABASE ROW COUNTS"
echo "=========================================="
mysql "$DB" -e "
SELECT
    'apartments'    AS tbl, COUNT(*) AS total_rows FROM apartments
UNION ALL SELECT 'apartments (active)',   COUNT(*) FROM apartments WHERE is_deleted = 0
UNION ALL SELECT 'apartments (deleted)',  COUNT(*) FROM apartments WHERE is_deleted = 1
UNION ALL SELECT 'blocks',               COUNT(*) FROM blocks
UNION ALL SELECT 'buildings',            COUNT(*) FROM buildings
UNION ALL SELECT 'builders',             COUNT(*) FROM builders
UNION ALL SELECT 'regions',              COUNT(*) FROM regions
UNION ALL SELECT 'subways',              COUNT(*) FROM subways
UNION ALL SELECT 'finishings',           COUNT(*) FROM finishings
UNION ALL SELECT 'rooms',               COUNT(*) FROM rooms;
"

# ── Step 4: Database size ─────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  4. DATABASE SIZE (table breakdown)"
echo "=========================================="
mysql -e "
SELECT
    table_name,
    table_rows                                                          AS est_rows,
    ROUND(data_length  / 1024 / 1024, 2)                               AS data_mb,
    ROUND(index_length / 1024 / 1024, 2)                               AS index_mb,
    ROUND((data_length + index_length) / 1024 / 1024, 2)               AS total_mb
FROM information_schema.tables
WHERE table_schema = '$DB'
ORDER BY (data_length + index_length) DESC;
"

echo ""
echo "--- Total DB size ---"
mysql -e "
SELECT
    table_schema AS db,
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS total_mb
FROM information_schema.tables
WHERE table_schema = '$DB'
GROUP BY table_schema;
"

# ── Step 5: Slow query log ────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  5. SLOW QUERY LOG"
echo "=========================================="
if [ -f "$SLOW_LOG" ] && [ -s "$SLOW_LOG" ]; then
    SLOW_COUNT=$(grep -c "^# Query_time" "$SLOW_LOG" 2>/dev/null || echo 0)
    echo "Total slow queries logged: $SLOW_COUNT"
    echo ""
    echo "--- Last 3 slow queries ---"
    grep -A 5 "^# Query_time" "$SLOW_LOG" | tail -30
else
    echo "Slow query log is empty or does not exist — no slow queries detected ✅"
fi

# ── Step 6: Server memory after sync ─────────────────────────────────────────
echo ""
echo "=========================================="
echo "  6. SERVER MEMORY AFTER SYNC"
echo "=========================================="
free -h
echo ""
echo "Swap usage:"
swapon --show

# ── Step 7: Summary ───────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  SUMMARY"
echo "=========================================="
echo "  Wall-clock time : ${WALL_SECS}s"
echo "  Exit code       : $EXIT_CODE"
echo "  Completed at    : $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=========================================="
