<?php

namespace App\Services\Feed;

use Illuminate\Support\Facades\Log;

/**
 * File-based storage manager for the feed analysis pipeline.
 *
 * All data lives in storage/feed/ — no database involved.
 *
 * Directory layout:
 *
 *   storage/feed/
 *   ├── raw/
 *   │   ├── manifest.json                        ← index of all downloads
 *   │   └── {md5_of_url}/
 *   │       ├── {date}_{time}.json               ← raw JSON payload
 *   │       └── {date}_{time}.meta.json          ← download metadata
 *   └── analysis/
 *       ├── {md5_of_url}_schema.json             ← per-endpoint schema report
 *       ├── {md5_of_url}_relationships.json      ← per-endpoint entity graph
 *       ├── report.json                          ← combined schema (all endpoints)
 *       └── relationships.json                   ← combined entity graph
 */
final class FeedFileStorage
{
    private string $base;
    private string $rawDir;
    private string $analysisDir;

    public function __construct()
    {
        $this->base        = storage_path('feed');
        $this->rawDir      = $this->base . '/raw';
        $this->analysisDir = $this->base . '/analysis';

        $this->ensureDirectories();
    }

    // =========================================================================
    // Raw payload storage
    // =========================================================================

    /**
     * Save a downloaded feed payload to disk.
     *
     * Creates:
     *   storage/feed/raw/{hash}/{date}_{time}.json
     *   storage/feed/raw/{hash}/{date}_{time}.meta.json
     *
     * @return string  Absolute path to the saved JSON file
     */
    public function saveRaw(FeedFetchResult $result): string
    {
        $hash      = md5($result->url);
        $dir       = $this->rawDir . '/' . $hash;
        $timestamp = now()->format('Y-m-d_H-i-s');

        $this->mkdir($dir);

        $jsonPath = "{$dir}/{$timestamp}.json";
        $metaPath = "{$dir}/{$timestamp}.meta.json";

        // Save raw payload
        file_put_contents($jsonPath, $result->body);

        // Save metadata sidecar
        $meta = [
            'url'              => $result->url,
            'label'            => $result->label,
            'checksum'         => $result->checksum(),
            'payload_bytes'    => $result->sizeBytes(),
            'payload_human'    => $this->humanSize($result->sizeBytes()),
            'http_status'      => $result->httpStatus,
            'download_seconds' => $result->downloadSeconds,
            'saved_at'         => now()->toIso8601String(),
            'json_path'        => $jsonPath,
        ];

        file_put_contents($metaPath, json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        // Update manifest
        $this->appendManifest($meta);

        Log::channel('feed')->info("FeedFileStorage: raw saved → {$jsonPath}", [
            'bytes' => $result->sizeBytes(),
            'url'   => $result->url,
        ]);

        return $jsonPath;
    }

    /**
     * Load the raw JSON string from a file path.
     */
    public function loadRaw(string $path): string
    {
        if (!file_exists($path)) {
            throw new \RuntimeException("Raw feed file not found: {$path}");
        }

        return file_get_contents($path);
    }

    /**
     * Get the latest raw file path for a given URL.
     * Returns null if no files exist for this endpoint.
     */
    public function getLatestRawPath(string $url): ?string
    {
        $hash = md5($url);
        $dir  = $this->rawDir . '/' . $hash;

        if (!is_dir($dir)) {
            return null;
        }

        $files = glob("{$dir}/*.json");
        $files = array_filter($files, fn($f) => !str_ends_with($f, '.meta.json'));

        if (empty($files)) {
            return null;
        }

        // Sort by filename (which contains timestamp) → newest last
        natsort($files);

        return end($files);
    }

    /**
     * Get latest raw file path for all endpoints that have been collected.
     *
     * @return array<int, array{url:string, label:string, path:string, meta:array}>
     */
    public function getAllLatestRawFiles(): array
    {
        $manifest = $this->loadManifest();
        $result   = [];
        $seen     = [];

        // Manifest is appended (newest entries at the end when sorted by saved_at)
        // Group by URL and keep the most recent
        $byUrl = [];
        foreach ($manifest as $entry) {
            $url = $entry['url'] ?? '';
            if (!$url) continue;

            $byUrl[$url] = $entry; // later entries overwrite earlier = newest
        }

        foreach ($byUrl as $url => $entry) {
            $path = $entry['json_path'] ?? null;

            if ($path && file_exists($path)) {
                $result[] = [
                    'url'   => $url,
                    'label' => $entry['label'] ?? md5($url),
                    'path'  => $path,
                    'meta'  => $entry,
                ];
            }
        }

        return $result;
    }

    /**
     * List all raw files for a given URL (all historical snapshots).
     *
     * @return array<int, array{path:string, saved_at:string, bytes:int, checksum:string}>
     */
    public function listRawHistory(string $url): array
    {
        $hash  = md5($url);
        $dir   = $this->rawDir . '/' . $hash;
        $files = [];

        if (!is_dir($dir)) {
            return $files;
        }

        $metas = glob("{$dir}/*.meta.json") ?: [];
        natsort($metas);

        foreach ($metas as $metaPath) {
            $meta = json_decode(file_get_contents($metaPath), true) ?: [];
            $files[] = [
                'path'     => $meta['json_path'] ?? '',
                'saved_at' => $meta['saved_at'] ?? '',
                'bytes'    => $meta['payload_bytes'] ?? 0,
                'checksum' => $meta['checksum'] ?? '',
            ];
        }

        return $files;
    }

    // =========================================================================
    // Analysis output
    // =========================================================================

    /**
     * Save an analysis artifact to storage/feed/analysis/{name}.json
     *
     * @param  array<string,mixed> $data
     * @return string  Absolute path to saved file
     */
    public function saveAnalysis(string $name, array $data): string
    {
        $path = $this->analysisDir . '/' . ltrim($name, '/');

        // Ensure subdirectory exists (e.g. schema/report.json)
        $this->mkdir(dirname($path));

        file_put_contents(
            $path,
            json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        Log::channel('feed')->info("FeedFileStorage: analysis saved → {$path}");

        return $path;
    }

    /**
     * Load an analysis artifact.
     *
     * @return array<string,mixed>|null
     */
    public function loadAnalysis(string $name): ?array
    {
        $path = $this->analysisDir . '/' . ltrim($name, '/');

        if (!file_exists($path)) {
            return null;
        }

        return json_decode(file_get_contents($path), true);
    }

    /**
     * Return the absolute path for an analysis file without loading it.
     */
    public function analysisPath(string $name): string
    {
        return $this->analysisDir . '/' . ltrim($name, '/');
    }

    // =========================================================================
    // Manifest
    // =========================================================================

    /**
     * Append an entry to storage/feed/raw/manifest.json
     */
    private function appendManifest(array $entry): void
    {
        $manifest   = $this->loadManifest();
        $manifest[] = $entry;

        file_put_contents(
            $this->rawDir . '/manifest.json',
            json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }

    /**
     * Load the manifest (list of all downloads).
     *
     * @return array<int, array<string,mixed>>
     */
    public function loadManifest(): array
    {
        $path = $this->rawDir . '/manifest.json';

        if (!file_exists($path)) {
            return [];
        }

        return json_decode(file_get_contents($path), true) ?: [];
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function ensureDirectories(): void
    {
        $this->mkdir($this->rawDir);
        $this->mkdir($this->analysisDir);
    }

    private function mkdir(string $path): void
    {
        if (!is_dir($path)) {
            mkdir($path, 0775, true);
        }
    }

    private function humanSize(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }
}
