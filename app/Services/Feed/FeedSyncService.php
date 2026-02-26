<?php

namespace App\Services\Feed;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * FeedSyncService — production-ready feed synchronization.
 *
 * Algorithm:
 *  1. Download all JSON endpoints (reference tables first, then hierarchy)
 *  2. Upsert each entity in DB::transaction() in chunks of 1000
 *  3. For apartments: set last_seen_at = now() on every upserted row
 *  4. After sync: mark apartments not seen in last 5 minutes as is_deleted=true
 *  5. Log: total imported / updated / soft-deleted / duration
 */
class FeedSyncService
{
    private const CHUNK_SIZE = 1000;

    /** Collected stats for logging */
    private array $stats = [
        'regions'       => ['upserted' => 0],
        'subways'       => ['upserted' => 0],
        'builders'      => ['upserted' => 0],
        'finishings'    => ['upserted' => 0],
        'building_types' => ['upserted' => 0],
        'rooms'         => ['upserted' => 0],
        'blocks'        => ['upserted' => 0],
        'block_subway'  => ['upserted' => 0],
        'buildings'     => ['upserted' => 0],
        'apartments'    => ['upserted' => 0, 'soft_deleted' => 0],
    ];

    public function __construct(
        private readonly FeedClient $client,
        private readonly FeedFileStorage $storage,
    ) {}

    /**
     * Main entry point. Pass $dryRun=true to validate without writing.
     *
     * @throws Throwable
     */
    public function sync(bool $dryRun = false): array
    {
        $startedAt = microtime(true);
        $syncAt    = Carbon::now();

        Log::channel('feed')->info('FeedSyncService: starting sync', [
            'dry_run' => $dryRun,
        ]);

        try {
            $data = $this->downloadAllEndpoints();

            if ($dryRun) {
                Log::channel('feed')->info('FeedSyncService: dry-run complete', $this->summarizeData($data));
                return ['dry_run' => true, 'summary' => $this->summarizeData($data)];
            }

            DB::transaction(function () use ($data, $syncAt) {
                $this->upsertRegions($data['regions'] ?? []);
                $this->upsertSubways($data['subways'] ?? []);
                $this->upsertBuilders($data['builders'] ?? []);
                $this->upsertFinishings($data['finishings'] ?? []);
                $this->upsertBuildingTypes($data['building_types'] ?? []);
                $this->upsertRooms($data['rooms'] ?? []);
                $this->upsertBlocks($data['blocks'] ?? []);
                $this->upsertBuildings($data['buildings'] ?? []);
                $this->upsertApartments($data['apartments'] ?? [], $syncAt);
            });

            // Soft-delete apartments not seen in current sync (outside transaction for safety)
            $softDeleted = $this->markDeletedApartments($syncAt);
            $this->stats['apartments']['soft_deleted'] = $softDeleted;

        } catch (Throwable $e) {
            Log::channel('feed')->error('FeedSyncService: sync failed', [
                'error'   => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);
            throw $e;
        }

        $duration = round(microtime(true) - $startedAt, 2);
        $this->stats['duration_seconds'] = $duration;

        Log::channel('feed')->info('FeedSyncService: sync complete', $this->stats);

        return $this->stats;
    }

    // ── Download ─────────────────────────────────────────────────────────────

    /**
     * Download all feed endpoints and return raw decoded arrays.
     *
     * @return array<string, array>
     */
    private function downloadAllEndpoints(): array
    {
        $endpoints = config('feed.endpoints', []);
        $primary   = is_array($endpoints) ? ($endpoints[0] ?? '') : (string) $endpoints;

        // Derive base URL from primary
        $base = rtrim(preg_replace('/[^\/]+\.json$/', '', $primary), '/');

        $map = [
            'regions'       => "{$base}/regions.json",
            'subways'       => "{$base}/subways.json",
            'builders'      => "{$base}/builders.json",
            'finishings'    => "{$base}/finishings.json",
            'building_types' => "{$base}/buildingtypes.json",
            'rooms'         => "{$base}/rooms.json",
            'blocks'        => "{$base}/blocks.json",
            'buildings'     => "{$base}/buildings.json",
            'apartments'    => "{$base}/apartments.json",
        ];

        $result = [];
        foreach ($map as $key => $url) {
            try {
                $fetchResult = $this->client->fetch($url);
                $decoded     = $fetchResult->decoded();
                // Feed returns a root-level array
                $result[$key] = is_array($decoded) ? array_values($decoded) : [];

                Log::channel('feed')->info("FeedSyncService: downloaded {$key}", [
                    'url'   => $url,
                    'count' => count($result[$key]),
                    'size'  => $fetchResult->payloadHumanSize(),
                ]);
            } catch (Throwable $e) {
                Log::channel('feed')->warning("FeedSyncService: failed to download {$key}", [
                    'url'   => $url,
                    'error' => $e->getMessage(),
                ]);
                $result[$key] = [];
            }
        }

        return $result;
    }

    // ── Upsert methods ───────────────────────────────────────────────────────

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
                    'id'           => $id,
                    'crm_id'       => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                    'name'         => trim((string) ($row['name'] ?? '')),
                    'description'  => isset($row['description']) ? (string) $row['description'] : null,
                    'address'      => $this->extractAddress($row['address'] ?? null),
                    'district_id'  => isset($row['district']) ? (string) $row['district'] : null,
                    'district_name' => null, // not present in blocks.json directly
                    'builder_id'   => isset($row['builder']) ? (string) $row['builder'] : null,
                    'builder_name' => null,
                    'lat'          => $lat,
                    'lng'          => $lng,
                    'location'     => $lat !== null && $lng !== null
                        ? DB::raw("ST_GeomFromText('POINT({$lng} {$lat})', 4326)")
                        : DB::raw("ST_GeomFromText('POINT(0 0)', 4326)"),
                    'geometry_json' => isset($row['geometry'])
                        ? json_encode($row['geometry'])
                        : null,
                    'is_city'      => true, // Moscow feed — all are city
                    'status'       => 1,
                    'deadline_at'  => $this->parseDate($row['deadline'] ?? null),
                    'images'       => isset($row['renderer'])
                        ? json_encode((array) $row['renderer'])
                        : null,
                    'updated_at'   => now(),
                    'created_at'   => now(),
                ];

                // Collect subway pivot data
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
                // For blocks with POINT column we need raw upsert
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

                [$lat, $lng] = $this->extractCoordinates($row['block_geometry'] ?? null);

                $room     = isset($row['room']) ? (int) $row['room'] : null;
                $isCityRaw = strtolower((string) ($row['block_iscity'] ?? 'true'));

                $records[] = [
                    'id'                    => $id,
                    'crm_id'                => isset($row['crm_id']) ? (int) $row['crm_id'] : null,
                    'building_id'           => (string) ($row['building_id'] ?? ''),
                    'block_id'              => (string) ($row['block_id'] ?? ''),
                    'room'                  => $room,
                    'rooms_crm_id'          => $room !== null && $room >= 0 && $room <= 10 ? $room : null,
                    'floor'                 => isset($row['floor']) ? (int) $row['floor'] : null,
                    'floors_total'          => isset($row['floors']) ? (int) $row['floors'] : null,
                    'number'                => isset($row['number']) ? (string) $row['number'] : null,
                    'wc_count'              => isset($row['wc_count']) ? (int) $row['wc_count'] : null,
                    'area_total'            => $this->parseDecimal($row['area_total'] ?? null),
                    'area_living'           => $this->parseDecimal($row['area_rooms_total'] ?? null),
                    'area_kitchen'          => $this->parseDecimal($row['area_kitchen'] ?? null),
                    'area_given'            => $this->parseDecimal($row['area_given'] ?? null),
                    'area_balconies'        => $this->parseDecimal($row['area_balconies_total'] ?? null),
                    'area_rooms'            => isset($row['area_rooms']) ? (string) $row['area_rooms'] : null,
                    'area_rooms_total'      => $this->parseDecimal($row['area_rooms_total'] ?? null),
                    'price'                 => isset($row['price']) ? (int) $row['price'] : null,
                    'price_per_meter'       => null, // calculated if needed
                    'finishing_id'          => isset($row['finishing']) ? (string) $row['finishing'] : null,
                    'building_type_id'      => isset($row['building_type']) ? (string) $row['building_type'] : null,
                    'plan_url'              => $this->extractPlanUrl($row['plan'] ?? null),
                    'block_name'            => isset($row['block_name']) ? (string) $row['block_name'] : null,
                    'block_district_id'     => isset($row['block_district']) ? (string) $row['block_district'] : null,
                    'block_district_name'   => isset($row['block_district_name']) ? (string) $row['block_district_name'] : null,
                    'block_builder_id'      => isset($row['block_builder']) ? (string) $row['block_builder'] : null,
                    'block_builder_name'    => isset($row['block_builder_name']) ? (string) $row['block_builder_name'] : null,
                    'block_lat'             => $lat,
                    'block_lng'             => $lng,
                    'block_is_city'         => $isCityRaw === 'true',
                    'building_deadline_at'  => $this->parseDate($row['building_deadline'] ?? null),
                    'is_deleted'            => false,
                    'last_seen_at'          => $syncAt,
                    'updated_at'            => now(),
                    'created_at'            => now(),
                ];
            }

            if (!empty($records)) {
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
                $this->stats['apartments']['upserted'] += count($records);
            }
        }
    }

    // ── Soft-delete ───────────────────────────────────────────────────────────

    /**
     * Mark apartments that were NOT seen in the current sync as deleted.
     * Threshold: 5 minutes before $syncAt (to handle clock skew).
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

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Generic chunked upsert using a transform callable.
     *
     * @param string $table
     * @param array<int, array<string, mixed>> $rows
     * @param callable(array): array $transform
     * @param string $uniqueKey
     */
    private function upsertChunked(string $table, array $rows, callable $transform, string $uniqueKey): void
    {
        foreach (array_chunk($rows, self::CHUNK_SIZE) as $chunk) {
            $records = [];
            foreach ($chunk as $row) {
                $record = $transform($row);
                // Use isset + strict check to allow 0 as a valid crm_id (studios)
                if (isset($record[$uniqueKey]) && $record[$uniqueKey] !== '' && $record[$uniqueKey] !== null) {
                    $records[] = $record;
                }
            }

            if (!empty($records)) {
                // Update all columns except the unique key and created_at
                $updateCols = array_diff(array_keys($records[0]), [$uniqueKey, 'created_at']);
                DB::table($table)->upsert($records, [$uniqueKey], $updateCols);
                $this->stats[$table]['upserted'] = ($this->stats[$table]['upserted'] ?? 0) + count($records);
            }
        }
    }

    /**
     * Extract [lat, lng] from a GeoJSON geometry or raw coordinates array.
     *
     * @param mixed $geometry
     * @return array{0: float|null, 1: float|null}
     */
    private function extractCoordinates(mixed $geometry): array
    {
        if (empty($geometry)) {
            return [null, null];
        }

        // GeoJSON Point: {"type":"Point","coordinates":[lng, lat]}
        if (is_array($geometry) && isset($geometry['coordinates'])) {
            $coords = $geometry['coordinates'];

            // Point: [lng, lat]
            if (isset($coords[0]) && is_numeric($coords[0]) && isset($coords[1]) && is_numeric($coords[1])) {
                return [(float) $coords[1], (float) $coords[0]]; // [lat, lng]
            }

            // Polygon: [[[lng, lat], ...]] — use first point
            if (isset($coords[0][0][0]) && is_numeric($coords[0][0][0])) {
                return [(float) $coords[0][0][1], (float) $coords[0][0][0]];
            }
        }

        // Raw flat array [lng, lat, lng, lat, ...]
        if (is_array($geometry) && count($geometry) >= 2 && is_numeric($geometry[0])) {
            return [(float) $geometry[1], (float) $geometry[0]];
        }

        return [null, null];
    }

    /**
     * Extract address string from feed's address field (can be array or object).
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
            // Sequential array of strings
            if (isset($address[0]) && is_string($address[0])) {
                return implode(', ', array_filter($address, 'is_string'));
            }
            // Object with 'housing' (building/house number suffix)
            if (isset($address['housing'])) {
                return (string) $address['housing'];
            }
        }
        return null;
    }

    /**
     * Extract first URL from plan field (can be array or string).
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
     * Parse a decimal value from string (e.g. "62.5" → 62.50).
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
     * Parse ISO date string or null.
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
     * Return a summary of downloaded data counts (for dry-run).
     *
     * @param array<string, array> $data
     * @return array<string, int>
     */
    private function summarizeData(array $data): array
    {
        return array_map('count', $data);
    }
}
