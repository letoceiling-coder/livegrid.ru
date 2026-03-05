<?php

namespace App\Services\Feed;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use JsonMachine\Items as JsonMachineItems;
use JsonMachine\JsonDecoder\ExtJsonDecoder;
use Throwable;

/**
 * FeedSyncService — production-ready streaming feed synchronization.
 *
 * Algorithm:
 *  1. Download reference endpoints into memory (small JSON, ≤ 15 MB each)
 *  2. Upsert reference tables inside a single DB::transaction()
 *  3. Stream apartments.json to a tmp file via Guzzle sink (O(1) memory)
 *  4. Read the tmp file with json-machine (SAX-style streaming parser)
 *  5. Accumulate records into chunks of CHUNK_SIZE, upsert each chunk independently
 *     (NO giant transaction — avoids InnoDB undo-log bloat on 62k rows)
 *  6. After streaming: mark apartments not seen in this sync as is_deleted = true
 *  7. Always clean up tmp file; log peak memory / duration / counts
 */
class FeedSyncService
{
    private const CHUNK_SIZE = 1000;

    /** Tmp file for streaming apartments download */
    private const APARTMENTS_TMP = 'feed/tmp/apartments.json';

    /** Collected stats for logging */
    private array $stats = [
        'regions'        => ['upserted' => 0],
        'subways'        => ['upserted' => 0],
        'builders'       => ['upserted' => 0],
        'finishings'     => ['upserted' => 0],
        'building_types' => ['upserted' => 0],
        'rooms'          => ['upserted' => 0],
        'blocks'         => ['upserted' => 0],
        'block_subway'   => ['upserted' => 0],
        'buildings'      => ['upserted' => 0],
        'apartments'     => ['upserted' => 0, 'soft_deleted' => 0],
    ];

    public function __construct(
        private readonly FeedClient $client,
        private readonly FeedFileStorage $storage,
    ) {}

    // =========================================================================
    // Public entry point
    // =========================================================================

    /**
     * Run the full sync pipeline.
     *
     * @param  bool $dryRun  If true, only downloads and validates without writing to DB.
     * @return array         Stats array (counts + duration + peak memory).
     *
     * @throws Throwable
     */
    public function sync(bool $dryRun = false): array
    {
        // ── Distributed lock: prevent concurrent syncs ────────────────────────
        // TTL = 7200 s (2 h) — well above the worst-case runtime (~5 min).
        // The lock is released in the finally block regardless of outcome.
        $lock = Cache::lock('feed-sync-lock', 7200);

        if (! $lock->get()) {
            Log::channel('feed')->warning('FeedSyncService: sync skipped — another instance is already running', [
                'lock' => 'feed-sync-lock',
            ]);
            return ['skipped' => true, 'reason' => 'lock_held'];
        }

        try {
            return $this->runSync($dryRun);
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * Internal sync logic — called only after the distributed lock is acquired.
     *
     * @throws Throwable
     */
    private function runSync(bool $dryRun = false): array
    {
        $startedAt = microtime(true);
        $syncAt    = Carbon::now();

        Log::channel('feed')->info('FeedSyncService: starting sync', [
            'dry_run'    => $dryRun,
            'started_at' => $syncAt->toIso8601String(),
        ]);

        try {
            // ── Step 1: Reference endpoints (small, loaded into memory) ──────
            $refData = $this->downloadReferenceEndpoints();

            if ($dryRun) {
                $summary = $this->summarizeData($refData);
                $summary['apartments'] = '(streamed — not counted in dry-run)';
                Log::channel('feed')->info('FeedSyncService: dry-run complete', $summary);
                return ['dry_run' => true, 'summary' => $summary];
            }

            // ── Step 2: Upsert reference tables in a single transaction ──────
            DB::transaction(function () use ($refData) {
                $this->upsertRegions($refData['regions'] ?? []);
                $this->upsertSubways($refData['subways'] ?? []);
                $this->upsertBuilders($refData['builders'] ?? []);
                $this->upsertFinishings($refData['finishings'] ?? []);
                $this->upsertBuildingTypes($refData['building_types'] ?? []);
                $this->upsertRooms($refData['rooms'] ?? []);
                $this->upsertBlocks($refData['blocks'] ?? []);
                $this->upsertBuildings($refData['buildings'] ?? []);
            });

            // ── Step 3: Stream apartments.json to tmp file ───────────────────
            $tmpFile = $this->downloadApartmentsToFile();

            // ── Step 4 & 5: Stream-parse + chunked upsert (no transaction) ──
            try {
                $this->streamUpsertApartments($tmpFile, $syncAt);
            } finally {
                $this->cleanupTmpFile($tmpFile);
            }

            // ── Step 6: Soft-delete stale apartments ─────────────────────────
            $softDeleted = $this->markDeletedApartments($syncAt);
            $this->stats['apartments']['soft_deleted'] = $softDeleted;

            // ── Step 7: Refresh materialized block aggregates ─────────────────
            // Single JOIN UPDATE replaces 100+ correlated subqueries per API
            // request in BlockController::index(). Must run after soft-delete
            // so is_deleted apartments are excluded from counts.
            $this->updateBlockAggregates();

            // ── Step 8: Invalidate filters cache ──────────────────────────────
            // Price/area/floor/deadline ranges and district/builder lists may
            // change after every sync — bust the cache so the next request
            // recomputes fresh data.
            Cache::forget('filters:v1');
            Log::channel('feed')->info('FeedSyncService: filters cache invalidated');

        } catch (Throwable $e) {
            Log::channel('feed')->error('FeedSyncService: sync failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }

        $duration = round(microtime(true) - $startedAt, 2);
        $peakMb   = round(memory_get_peak_usage(true) / 1024 / 1024, 2);

        $this->stats['duration_seconds'] = $duration;
        $this->stats['peak_memory_mb']   = $peakMb;

        Log::channel('feed')->info('FeedSyncService: sync complete', $this->stats);

        return $this->stats;
    }

    // =========================================================================
    // Download helpers
    // =========================================================================

    /**
     * Download all reference endpoints (everything except apartments) into memory.
     *
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function downloadReferenceEndpoints(): array
    {
        $base = $this->resolveBaseUrl();

        $map = [
            'regions'        => "{$base}/regions.json",
            'subways'        => "{$base}/subways.json",
            'builders'       => "{$base}/builders.json",
            'finishings'     => "{$base}/finishings.json",
            'building_types' => "{$base}/buildingtypes.json",
            'rooms'          => "{$base}/rooms.json",
            'blocks'         => "{$base}/blocks.json",
            'buildings'      => "{$base}/buildings.json",
        ];

        $result = [];
        foreach ($map as $key => $url) {
            try {
                $fetchResult  = $this->client->fetch($url);
                $decoded      = $fetchResult->decoded();
                $result[$key] = is_array($decoded) ? array_values($decoded) : [];

                Log::channel('feed')->info("FeedSyncService: downloaded reference [{$key}]", [
                    'url'   => $url,
                    'count' => count($result[$key]),
                    'size'  => $fetchResult->payloadHumanSize(),
                ]);
            } catch (Throwable $e) {
                Log::channel('feed')->warning("FeedSyncService: failed to download [{$key}]", [
                    'url'   => $url,
                    'error' => $e->getMessage(),
                ]);
                $result[$key] = [];
            }
        }

        return $result;
    }

    /**
     * Stream apartments.json directly to a tmp file.
     * Memory cost: O(network buffer chunk) regardless of file size.
     *
     * @return string  Absolute path to the tmp file.
     * @throws \RuntimeException
     */
    private function downloadApartmentsToFile(): string
    {
        $base    = $this->resolveBaseUrl();
        $url     = "{$base}/apartments.json";
        $tmpPath = storage_path(self::APARTMENTS_TMP);

        Log::channel('feed')->info('FeedSyncService: streaming apartments.json to disk', [
            'url'    => $url,
            'target' => $tmpPath,
        ]);

        $elapsed = $this->client->downloadToFile($url, $tmpPath);
        $sizeMb  = round(filesize($tmpPath) / 1024 / 1024, 2);

        Log::channel('feed')->info('FeedSyncService: apartments.json saved', [
            'size_mb'     => $sizeMb,
            'elapsed_sec' => $elapsed,
            'memory_mb'   => round(memory_get_usage(true) / 1024 / 1024, 2),
        ]);

        return $tmpPath;
    }

    /**
     * Extract base URL from config (strips trailing filename).
     */
    private function resolveBaseUrl(): string
    {
        $endpoints = config('feed.endpoints', []);
        $primary   = is_array($endpoints) ? ($endpoints[0] ?? '') : (string) $endpoints;

        return rtrim(preg_replace('/[^\/]+\.json$/', '', $primary), '/');
    }

    // =========================================================================
    // Streaming apartment upsert (json-machine)
    // =========================================================================

    /**
     * SAX-style stream apartments.json from disk and upsert in CHUNK_SIZE batches.
     *
     * Memory profile:
     *  - json-machine holds ONE decoded object at a time
     *  - We accumulate CHUNK_SIZE records then flush → max O(CHUNK_SIZE) in memory
     *  - gc_collect_cycles() called after each flush
     *
     * No wrapping DB transaction: each chunk commits independently to avoid
     * InnoDB undo-log exhaustion on 62k+ rows.
     */
    private function streamUpsertApartments(string $filePath, Carbon $syncAt): void
    {
        // ExtJsonDecoder(true) → assoc arrays (same as json_decode $assoc=true)
        // New json-machine API: second arg is options array, not positional
        $items = JsonMachineItems::fromFile(
            $filePath,
            [
                'pointer' => '',              // JSON Pointer: '' = root array
                'decoder' => new ExtJsonDecoder(true),
            ]
        );

        $chunk = [];
        $total = 0;
        $batch = 0;

        foreach ($items as $row) {
            $id = (string) ($row['_id'] ?? '');
            if (empty($id)) {
                continue;
            }

            $chunk[] = $this->buildApartmentRecord($row, $syncAt);

            if (count($chunk) >= self::CHUNK_SIZE) {
                $this->upsertApartmentChunk($chunk);
                $total += count($chunk);
                $batch++;

                Log::channel('feed')->debug('FeedSyncService: apartments chunk flushed', [
                    'batch'     => $batch,
                    'chunk'     => count($chunk),
                    'total'     => $total,
                    'memory_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
                ]);

                $chunk = [];
                gc_collect_cycles();
            }
        }

        // Flush remaining records
        if (!empty($chunk)) {
            $this->upsertApartmentChunk($chunk);
            $total += count($chunk);
            $chunk  = [];
        }

        $this->stats['apartments']['upserted'] = $total;

        Log::channel('feed')->info('FeedSyncService: apartments streaming complete', [
            'total'     => $total,
            'batches'   => $batch + (!empty($chunk) ? 1 : 0),
            'memory_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
        ]);
    }

    /**
     * Execute a single upsert for one chunk of apartment records.
     */
    private function upsertApartmentChunk(array $records): void
    {
        if (empty($records)) {
            return;
        }

        DB::table('apartments')->upsert($records, ['id'], [
            'crm_id', 'building_id', 'block_id',
            'room', 'rooms_crm_id', 'floor', 'floors_total', 'number', 'wc_count',
            'area_total', 'area_living', 'area_kitchen', 'area_given',
            'area_balconies', 'area_rooms', 'area_rooms_total',
            'price', 'price_per_meter', 'finishing_id', 'building_type_id', 'plan_url',
            'block_name', 'block_district_id', 'block_district_name',
            'block_builder_id', 'block_builder_name',
            'block_lat', 'block_lng', 'block_is_city',
            'building_deadline_at',
            'is_deleted', 'last_seen_at', 'updated_at',
        ]);
    }

    /**
     * Map a raw feed row to the apartments table record array.
     * Extracted so it can be reused by both stream and array-based paths.
     *
     * @param  array<string, mixed> $row
     * @return array<string, mixed>
     */
    private function buildApartmentRecord(array $row, Carbon $syncAt): array
    {
        [$lat, $lng] = $this->extractCoordinates($row['block_geometry'] ?? null);

        $room      = isset($row['room']) ? (int) $row['room'] : null;
        $isCityRaw = strtolower((string) ($row['block_iscity'] ?? 'true'));

        return [
            'id'                   => (string) ($row['_id'] ?? ''),
            'crm_id'               => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
            'building_id'          => (string) ($row['building_id'] ?? ''),
            'block_id'             => (string) ($row['block_id'] ?? ''),
            'room'                 => $room,
            'rooms_crm_id'         => ($room !== null && $room >= 0 && $room <= 10) ? $room : null,
            'floor'                => isset($row['floor']) ? (int) $row['floor'] : null,
            'floors_total'         => isset($row['floors']) ? (int) $row['floors'] : null,
            'number'               => isset($row['number']) ? (string) $row['number'] : null,
            'wc_count'             => isset($row['wc_count']) ? (int) $row['wc_count'] : null,
            'area_total'           => $this->parseDecimal($row['area_total'] ?? null),
            'area_living'          => $this->parseDecimal($row['area_rooms_total'] ?? null),
            'area_kitchen'         => $this->parseDecimal($row['area_kitchen'] ?? null),
            'area_given'           => $this->parseDecimal($row['area_given'] ?? null),
            'area_balconies'       => $this->parseDecimal($row['area_balconies_total'] ?? null),
            'area_rooms'           => isset($row['area_rooms']) ? (string) $row['area_rooms'] : null,
            'area_rooms_total'     => $this->parseDecimal($row['area_rooms_total'] ?? null),
            'price'                => isset($row['price']) ? (int) $row['price'] : null,
            'price_per_meter'      => null, // calculated later if needed
            'finishing_id'         => isset($row['finishing']) ? (string) $row['finishing'] : null,
            'building_type_id'     => isset($row['building_type']) ? (string) $row['building_type'] : null,
            'plan_url'             => $this->extractPlanUrl($row['plan'] ?? null),
            'block_name'           => isset($row['block_name']) ? (string) $row['block_name'] : null,
            'block_district_id'    => isset($row['block_district']) ? (string) $row['block_district'] : null,
            'block_district_name'  => isset($row['block_district_name']) ? (string) $row['block_district_name'] : null,
            'block_builder_id'     => isset($row['block_builder']) ? (string) $row['block_builder'] : null,
            'block_builder_name'   => isset($row['block_builder_name']) ? (string) $row['block_builder_name'] : null,
            'block_lat'            => $lat,
            'block_lng'            => $lng,
            'block_is_city'        => $isCityRaw === 'true',
            'building_deadline_at' => $this->parseDate($row['building_deadline'] ?? null),
            'is_deleted'           => false,
            'last_seen_at'         => $syncAt,
            'updated_at'           => now(),
            'created_at'           => now(),
        ];
    }

    // =========================================================================
    // Reference-table upsert methods (array-based, wrapped in transaction)
    // =========================================================================

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertRegions(array $rows): void
    {
        $this->upsertChunked('regions', $rows, function (array $row): array {
            return [
                'id'         => (string) ($row['_id'] ?? ''),
                'crm_id'     => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                'name'       => (string) ($row['name'] ?? ''),
                'updated_at' => now(),
                'created_at' => now(),
            ];
        }, 'id');
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertSubways(array $rows): void
    {
        $this->upsertChunked('subways', $rows, function (array $row): array {
            return [
                'id'         => (string) ($row['_id'] ?? ''),
                'crm_id'     => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                'name'       => (string) ($row['name'] ?? ''),
                'updated_at' => now(),
                'created_at' => now(),
            ];
        }, 'id');
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertBuilders(array $rows): void
    {
        $this->upsertChunked('builders', $rows, function (array $row): array {
            return [
                'id'         => (string) ($row['_id'] ?? ''),
                'crm_id'     => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                'name'       => (string) ($row['name'] ?? ''),
                'updated_at' => now(),
                'created_at' => now(),
            ];
        }, 'id');
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertFinishings(array $rows): void
    {
        $this->upsertChunked('finishings', $rows, function (array $row): array {
            return [
                'id'         => (string) ($row['_id'] ?? ''),
                'crm_id'     => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                'name'       => (string) ($row['name'] ?? ''),
                'updated_at' => now(),
                'created_at' => now(),
            ];
        }, 'id');
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertBuildingTypes(array $rows): void
    {
        $this->upsertChunked('building_types', $rows, function (array $row): array {
            return [
                'id'         => (string) ($row['_id'] ?? ''),
                'crm_id'     => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                'name'       => (string) ($row['name'] ?? ''),
                'updated_at' => now(),
                'created_at' => now(),
            ];
        }, 'id');
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertRooms(array $rows): void
    {
        $this->upsertChunked('rooms', $rows, function (array $row): array {
            return [
                'crm_id'     => (int) ($row['crm_id'] ?? 0),
                'feed_id'    => isset($row['_id']) ? (string) $row['_id'] : null,
                'name'       => (string) ($row['name'] ?? ''),
                'updated_at' => now(),
                'created_at' => now(),
            ];
        }, 'crm_id');
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertBlocks(array $rows): void
    {
        foreach (array_chunk($rows, self::CHUNK_SIZE) as $chunk) {
            $records = [];
            $pivots  = [];

            foreach ($chunk as $row) {
                $id = (string) ($row['_id'] ?? '');
                if (empty($id)) {
                    continue;
                }

                [$lat, $lng] = $this->extractCoordinates($row['geometry'] ?? null);

                $records[] = [
                    'id'            => $id,
                    'crm_id'        => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                    'name'          => trim((string) ($row['name'] ?? '')),
                    'description'   => isset($row['description']) ? (string) $row['description'] : null,
                    'address'       => $this->extractAddress($row['address'] ?? null),
                    'district_id'   => isset($row['district']) ? (string) $row['district'] : null,
                    'district_name' => null,
                    'builder_id'    => isset($row['builder']) ? (string) $row['builder'] : null,
                    'builder_name'  => null,
                    'lat'           => $lat,
                    'lng'           => $lng,
                    'location'      => $lat !== null && $lng !== null
                        ? DB::raw("ST_GeomFromText('POINT({$lng} {$lat})', 4326)")
                        : DB::raw("ST_GeomFromText('POINT(0 0)', 4326)"),
                    'geometry_json' => isset($row['geometry'])
                        ? json_encode($row['geometry'])
                        : null,
                    'is_city'       => true,
                    'status'        => 1,
                    'deadline_at'   => $this->parseDate($row['deadline'] ?? null),
                    'images'        => isset($row['renderer'])
                        ? json_encode((array) $row['renderer'])
                        : null,
                    'updated_at'    => now(),
                    'created_at'    => now(),
                ];

                foreach ((array) ($row['subway'] ?? []) as $sub) {
                    $subId = isset($sub['subway_id']) ? (string) $sub['subway_id'] : null;
                    if ($subId) {
                        $pivots[] = [
                            'block_id'    => $id,
                            'subway_id'   => $subId,
                            'travel_time' => isset($sub['distance_time']) ? (int) $sub['distance_time'] : null,
                            'travel_type' => isset($sub['distance_type']) ? (int) $sub['distance_type'] : null,
                        ];
                    }
                }
            }

            if (!empty($records)) {
                DB::table('blocks')->upsert($records, ['id'], [
                    'crm_id', 'name', 'description', 'address',
                    'district_id', 'district_name', 'builder_id', 'builder_name',
                    'lat', 'lng', 'location', 'geometry_json',
                    'is_city', 'status', 'deadline_at', 'images', 'updated_at',
                ]);
                $this->stats['blocks']['upserted'] += count($records);
            }

            if (!empty($pivots)) {
                DB::table('block_subway')->upsert($pivots, ['block_id', 'subway_id'], [
                    'travel_time', 'travel_type',
                ]);
                $this->stats['block_subway']['upserted'] += count($pivots);
            }
        }
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertBuildings(array $rows): void
    {
        $this->upsertChunked('buildings', $rows, function (array $row): array {
            return [
                'id'               => (string) ($row['_id'] ?? ''),
                'crm_id'           => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                'block_id'         => isset($row['block_id']) ? (string) $row['block_id'] : null,
                'name'             => isset($row['name']) ? (string) $row['name'] : null,
                'building_type_id' => isset($row['building_type']) ? (string) $row['building_type'] : null,
                'floors_total'     => isset($row['floors']) ? (int) $row['floors'] : null,
                'deadline_at'      => $this->parseDate($row['deadline'] ?? null),
                'queue'            => isset($row['queue']) ? (int) $row['queue'] : null,
                'height'           => isset($row['height']) ? (float) $row['height'] : null,
                'status'           => 1,
                'banks'            => isset($row['building_bank'])
                    ? json_encode((array) $row['building_bank'])
                    : null,
                'updated_at'       => now(),
                'created_at'       => now(),
            ];
        }, 'id');
    }

    /**
     * Array-based upsert — kept for unit tests and manual calls.
     * For production syncs, the streaming path is used.
     *
     * @param array<int, array<string, mixed>> $rows
     */
    public function upsertApartments(array $rows, Carbon $syncAt): void
    {
        foreach (array_chunk($rows, self::CHUNK_SIZE) as $chunk) {
            $records = [];
            foreach ($chunk as $row) {
                $id = (string) ($row['_id'] ?? '');
                if (empty($id)) {
                    continue;
                }
                $records[] = $this->buildApartmentRecord($row, $syncAt);
            }

            if (!empty($records)) {
                $this->upsertApartmentChunk($records);
                $this->stats['apartments']['upserted'] += count($records);
            }
        }
    }

    // =========================================================================
    // Soft-delete
    // =========================================================================

    /**
     * Refresh materialized aggregate columns on the blocks table.
     *
     * Executed once after every full sync (after soft-deletes are applied)
     * via a single multi-table UPDATE + LEFT JOIN — O(blocks) scan instead of
     * the previous O(blocks × 5) correlated subquery approach in the controller.
     *
     * Columns updated:
     *   price_from           — MIN(price) from active apartments
     *   units_count          — COUNT of active apartments
     *   min_area             — MIN(area_total) from active apartments (column existed before this migration)
     *   nearest_deadline_at  — MIN(building_deadline_at) from active apartments
     *
     * Blocks with zero active apartments receive NULL values
     * (BlockController excludes them via WHERE units_count > 0).
     */
    private function updateBlockAggregates(): void
    {
        $startedAt = microtime(true);

        // Single multi-table UPDATE: one pass over apartments → update all blocks.
        // Replaces 100+ correlated subqueries per API request (5 subq × 20 blocks/page).
        DB::statement("
            UPDATE blocks b
            LEFT JOIN (
                SELECT
                    block_id,
                    MIN(price)                AS agg_price_from,
                    COUNT(*)                  AS agg_units_count,
                    MIN(area_total)           AS agg_min_area,
                    MIN(building_deadline_at) AS agg_nearest_deadline
                FROM apartments
                WHERE is_deleted = 0
                GROUP BY block_id
            ) agg ON agg.block_id = b.id
            SET
                b.price_from           = agg.agg_price_from,
                b.units_count          = agg.agg_units_count,
                b.min_area             = agg.agg_min_area,
                b.nearest_deadline_at  = agg.agg_nearest_deadline
        ");

        $elapsed = round(microtime(true) - $startedAt, 2);

        Log::channel('feed')->info("FeedSyncService: block aggregates refreshed in {$elapsed}s");
    }

    /**
     * Mark apartments that were NOT seen in this sync as soft-deleted.
     * Threshold: 5 minutes before $syncAt (compensates for clock skew / slow runs).
     */
    private function markDeletedApartments(Carbon $syncAt): int
    {
        $threshold = $syncAt->copy()->subMinutes(5);

        $affected = DB::table('apartments')
            ->where('is_deleted', false)
            ->where(function ($q) use ($threshold) {
                $q->whereNull('last_seen_at')
                  ->orWhere('last_seen_at', '<', $threshold);
            })
            ->update(['is_deleted' => true, 'updated_at' => now()]);

        Log::channel('feed')->info("FeedSyncService: soft-deleted {$affected} apartments");

        return $affected;
    }

    // =========================================================================
    // Generic chunked upsert (reference tables)
    // =========================================================================

    /**
     * Upsert rows in CHUNK_SIZE batches using a transform callable.
     *
     * @param string                            $table
     * @param array<int, array<string, mixed>>  $rows
     * @param callable(array): array            $transform
     * @param string                            $uniqueKey
     */
    private function upsertChunked(string $table, array $rows, callable $transform, string $uniqueKey): void
    {
        foreach (array_chunk($rows, self::CHUNK_SIZE) as $chunk) {
            $records = [];
            foreach ($chunk as $row) {
                $record = $transform($row);
                // Allow 0 as a valid PK (studio apartments have crm_id = 0)
                if (isset($record[$uniqueKey]) && $record[$uniqueKey] !== '' && $record[$uniqueKey] !== null) {
                    $records[] = $record;
                }
            }

            if (!empty($records)) {
                $updateCols = array_diff(array_keys($records[0]), [$uniqueKey, 'created_at']);
                DB::table($table)->upsert($records, [$uniqueKey], $updateCols);
                $this->stats[$table]['upserted'] = ($this->stats[$table]['upserted'] ?? 0) + count($records);
            }
        }
    }

    // =========================================================================
    // Tmp file management
    // =========================================================================

    /**
     * Delete the tmp apartments file. Silently ignores missing files.
     */
    private function cleanupTmpFile(string $path): void
    {
        if (file_exists($path)) {
            @unlink($path);
            Log::channel('feed')->info('FeedSyncService: tmp file removed', ['path' => $path]);
        }
    }

    // =========================================================================
    // Data extraction helpers
    // =========================================================================

    /**
     * Extract [lat, lng] from a GeoJSON geometry or raw coordinates array.
     *
     * @param  mixed $geometry
     * @return array{0: float|null, 1: float|null}
     */
    private function extractCoordinates(mixed $geometry): array
    {
        if (empty($geometry)) {
            return [null, null];
        }

        if (is_array($geometry) && isset($geometry['coordinates'])) {
            $coords = $geometry['coordinates'];

            // GeoJSON Point: [lng, lat]
            if (isset($coords[0], $coords[1]) && is_numeric($coords[0]) && is_numeric($coords[1])) {
                return [(float) $coords[1], (float) $coords[0]];
            }

            // GeoJSON Polygon: [[[lng, lat], ...]] — use first point as centroid
            if (isset($coords[0][0][0]) && is_numeric($coords[0][0][0])) {
                return [(float) $coords[0][0][1], (float) $coords[0][0][0]];
            }
        }

        // Raw flat array [lng, lat]
        if (is_array($geometry) && count($geometry) >= 2 && is_numeric($geometry[0])) {
            return [(float) $geometry[1], (float) $geometry[0]];
        }

        return [null, null];
    }

    /**
     * Extract address string (can be array or string in the feed).
     */
    private function extractAddress(mixed $address): ?string
    {
        if (is_null($address)) {
            return null;
        }
        if (is_string($address)) {
            return $address;
        }
        if (is_array($address)) {
            if (isset($address[0]) && is_string($address[0])) {
                return implode(', ', array_filter($address, 'is_string'));
            }
            if (isset($address['housing'])) {
                return (string) $address['housing'];
            }
        }
        return null;
    }

    /**
     * Extract first image URL from plan field.
     */
    private function extractPlanUrl(mixed $plan): ?string
    {
        if (is_null($plan)) {
            return null;
        }
        if (is_string($plan)) {
            return $plan;
        }
        if (is_array($plan) && isset($plan[0])) {
            return (string) $plan[0];
        }
        return null;
    }

    /**
     * Safely parse a decimal value (avoids PHP float precision issues).
     */
    private function parseDecimal(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $val = (float) $value;
        return $val > 0 ? number_format($val, 2, '.', '') : null;
    }

    /**
     * Parse ISO date string → Y-m-d, or null on failure.
     */
    private function parseDate(mixed $value): ?string
    {
        if (empty($value)) {
            return null;
        }
        try {
            return Carbon::parse((string) $value)->toDateString();
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Summarise downloaded data arrays into a count map (for dry-run logging).
     *
     * @param  array<string, array> $data
     * @return array<string, int>
     */
    private function summarizeData(array $data): array
    {
        return array_map('count', $data);
    }
}
