<?php

namespace App\Services\Feed;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Persist feed snapshots to the feed_raw_snapshots table.
 *
 * Responsibilities:
 *  - Insert a new snapshot row per run
 *  - Detect whether the feed content changed since the last snapshot
 *  - Count objects at auto-detected structural paths
 *  - Prune old snapshots based on config('feed.storage.keep_snapshots')
 *
 * The table acts as an audit log: every weekly download is stored
 * so data loss (feed temporarily removing objects) can be detected.
 */
final class FeedStorageService
{
    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Save a raw feed snapshot to the database.
     *
     * @param  FeedFetchResult $result  The downloaded payload
     * @param  array<string,mixed> $decoded  Pre-decoded JSON (avoid double JSON decode)
     * @return int  The inserted snapshot ID
     */
    public function saveSnapshot(FeedFetchResult $result, array $decoded): int
    {
        $checksum = $result->checksum();

        // Check if feed changed since last run
        $isChanged = $this->isChanged($result->url, $checksum);

        // Count objects at known/detected structural paths
        $counts = $this->countObjects($decoded);

        // Build insert payload
        $savePayload = config('feed.storage.save_payload', true);

        $id = DB::table('feed_raw_snapshots')->insertGetId([
            'source_url'       => $result->url,
            'source_hash'      => md5($result->url),
            'source_label'     => $result->label,
            'payload'          => $savePayload ? $result->body : null,
            'checksum'         => $checksum,
            'payload_bytes'    => $result->sizeBytes(),
            'objects_count'    => $counts['objects'],
            'projects_count'   => $counts['projects'],
            'buildings_count'  => $counts['buildings'],
            'apartments_count' => $counts['apartments'],
            'http_status'      => $result->httpStatus,
            'download_seconds' => $result->downloadSeconds,
            'is_changed'       => $isChanged,
            'created_at'       => now(),
        ]);

        Log::channel('feed')->info('FeedStorageService: snapshot saved', [
            'id'               => $id,
            'url'              => $result->url,
            'checksum'         => $checksum,
            'is_changed'       => $isChanged,
            'payload_bytes'    => $result->sizeBytes(),
            'objects_count'    => $counts['objects'],
            'projects_count'   => $counts['projects'],
            'buildings_count'  => $counts['buildings'],
            'apartments_count' => $counts['apartments'],
        ]);

        // Prune old snapshots if limit is configured
        $this->pruneOldSnapshots($result->url);

        return $id;
    }

    /**
     * Retrieve the latest snapshot for a given URL.
     *
     * @return object|null  DB row or null if no snapshots exist
     */
    public function getLatestSnapshot(string $url): ?object
    {
        return DB::table('feed_raw_snapshots')
            ->where('source_hash', md5($url))
            ->orderByDesc('created_at')
            ->first();
    }

    /**
     * Check if the feed has changed since the last run (by checksum).
     */
    public function isChanged(string $url, string $checksum): bool
    {
        $latest = DB::table('feed_raw_snapshots')
            ->where('source_hash', md5($url))
            ->orderByDesc('created_at')
            ->value('checksum');

        return $latest !== $checksum;
    }

    // =========================================================================
    // Object counting
    // =========================================================================

    /**
     * Auto-detect and count objects at structural paths in the decoded JSON.
     *
     * Strategy (applied in order, first match wins):
     *   1. Use configured hints from config('feed.hints')
     *   2. Scan root-level keys for arrays → count items
     *   3. Fall back to counting all top-level items
     *
     * @param  array<string,mixed> $data
     * @return array{objects:int, projects:int, buildings:int, apartments:int}
     */
    public function countObjects(array $data): array
    {
        $counts = [
            'objects'    => 0,
            'projects'   => 0,
            'buildings'  => 0,
            'apartments' => 0,
        ];

        // Configured hints take priority
        $hints = config('feed.hints', []);

        if (!empty($hints['projects_key']) && isset($data[$hints['projects_key']])) {
            $counts['projects'] = count((array) $data[$hints['projects_key']]);
        }

        if (!empty($hints['buildings_key']) && isset($data[$hints['buildings_key']])) {
            $counts['buildings'] = count((array) $data[$hints['buildings_key']]);
        }

        if (!empty($hints['apartments_key']) && isset($data[$hints['apartments_key']])) {
            $counts['apartments'] = count((array) $data[$hints['apartments_key']]);
        }

        // Auto-detect: scan all root keys for arrays
        foreach ($data as $key => $value) {
            if (!is_array($value)) {
                continue;
            }

            $count = count($value);
            $keyLower = strtolower((string) $key);

            // Auto-assign to semantic categories
            if ($counts['projects'] === 0 && $this->matchesKeyPattern($keyLower, ['project', 'complex', 'zhk', 'жк'])) {
                $counts['projects'] = $count;
            } elseif ($counts['buildings'] === 0 && $this->matchesKeyPattern($keyLower, ['building', 'house', 'korpus', 'корпус'])) {
                $counts['buildings'] = $count;
            } elseif ($counts['apartments'] === 0 && $this->matchesKeyPattern($keyLower, ['apartment', 'flat', 'unit', 'квартир', 'object'])) {
                $counts['apartments'] = $count;
            }

            // Track the largest root array as total objects count
            if ($count > $counts['objects']) {
                $counts['objects'] = $count;
            }
        }

        // If root is a plain list (not associative), count it directly
        if (!empty($data) && array_is_list($data)) {
            $counts['objects'] = count($data);
        }

        return $counts;
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Check if a key name matches any of the given pattern fragments.
     */
    private function matchesKeyPattern(string $key, array $patterns): bool
    {
        foreach ($patterns as $pattern) {
            if (str_contains($key, $pattern)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Delete oldest snapshots if we've exceeded the keep_snapshots limit.
     */
    private function pruneOldSnapshots(string $url): void
    {
        $keep = (int) config('feed.storage.keep_snapshots', 0);

        if ($keep <= 0) {
            return; // Keep all
        }

        // Get IDs of all snapshots for this URL, ordered newest first
        $idsToKeep = DB::table('feed_raw_snapshots')
            ->where('source_hash', md5($url))
            ->orderByDesc('created_at')
            ->limit($keep)
            ->pluck('id');

        if ($idsToKeep->count() < $keep) {
            return; // Not yet at limit
        }

        $deleted = DB::table('feed_raw_snapshots')
            ->where('source_hash', md5($url))
            ->whereNotIn('id', $idsToKeep)
            ->delete();

        if ($deleted > 0) {
            Log::channel('feed')->info("FeedStorageService: pruned {$deleted} old snapshots for {$url}");
        }
    }
}
