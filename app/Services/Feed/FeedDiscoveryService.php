<?php

namespace App\Services\Feed;

use Illuminate\Support\Facades\Log;

/**
 * Feed endpoint discovery engine.
 *
 * NO database. NO Eloquent. Pure HTTP discovery.
 *
 * Responsibilities:
 *  1. Fetch the primary endpoint
 *  2. Detect pagination → download ALL pages
 *  3. Detect embedded sub-endpoint URLs in the response
 *  4. Probe known entity names appended to the base URL
 *  5. Detect Moscow/region filter parameter
 *  6. Save every raw file with a descriptive name
 *  7. Return a complete collection manifest
 *
 * Known entity probes (tried in order):
 *   blocks, buildings, apartments, builders, regions,
 *   subways, finishings, buildingtypes, complexes, developers, …
 *
 * Pagination patterns detected:
 *   - $.pagination.{next,current_page,total_pages,next_page_url}
 *   - $.meta.{current_page,last_page,next_page_url}
 *   - $.links.{next}
 *   - $.next_page_url | $.next | $.nextPage
 *   - Query-param probing: ?page=2, ?p=2
 */
final class FeedDiscoveryService
{
    // Entity names to probe as sub-endpoints
    private const KNOWN_ENTITIES = [
        'blocks', 'buildings', 'apartments', 'flats', 'units',
        'builders', 'developers', 'companies',
        'regions', 'districts', 'cities',
        'subways', 'metro', 'metros', 'subway_stations',
        'finishings', 'finishing', 'decoration',
        'buildingtypes', 'building_types', 'house_types', 'object_types',
        'complexes', 'projects', 'newbuildings', 'newbuild',
        'sections', 'sections_types',
        'amenities', 'advantages',
        'promotions', 'specials',
    ];

    // Known pagination key patterns (JSON dot-notation)
    private const PAGINATION_HINTS = [
        'pagination.next_page',
        'pagination.next_page_url',
        'pagination.current_page',
        'pagination.total_pages',
        'pagination.last_page',
        'meta.current_page',
        'meta.last_page',
        'meta.next_page_url',
        'links.next',
        'next_page_url',
        'next_page',
        'nextPage',
        'nextPageUrl',
        'has_next_page',
        'hasNextPage',
        'total_pages',
        'totalPages',
        'last_page',
        'lastPage',
        'current_page',
        'currentPage',
    ];

    // Query parameters to try for page navigation
    private const PAGE_PARAMS = ['page', 'p', 'pg', 'offset', 'Page', 'PAGE'];

    private FeedClient $client;
    private FeedFileStorage $storage;

    /** @var array<string, mixed> Collected discovery metadata */
    private array $discoveryLog = [];

    public function __construct(FeedClient $client, FeedFileStorage $storage)
    {
        $this->client  = $client;
        $this->storage = $storage;
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Run full discovery for a primary endpoint.
     *
     * @param  string $primaryUrl
     * @param  array{max_pages:int, probe_entities:bool, detect_region:bool} $options
     * @return array<string,mixed>  Collection manifest
     */
    public function discover(string $primaryUrl, array $options = []): array
    {
        $maxPages     = (int)  ($options['max_pages']       ?? 50);
        $probeEntities= (bool) ($options['probe_entities']  ?? true);
        $detectRegion = (bool) ($options['detect_region']   ?? true);

        $this->discoveryLog = [
            'primary_url'        => $primaryUrl,
            'started_at'         => now()->toIso8601String(),
            'collected_files'    => [],
            'discovered_endpoints'=> [],
            'pagination_info'    => [],
            'region_filter'      => null,
            'errors'             => [],
        ];

        Log::channel('feed')->info("FeedDiscoveryService: starting discovery for {$primaryUrl}");

        // ── Step 1: Fetch primary URL ─────────────────────────────────────────
        $primary = $this->fetchAndSave($primaryUrl, 'primary');

        if ($primary === null) {
            return $this->finalizeLog();
        }

        $decoded = $primary['decoded'];

        // ── Step 2: Detect and follow pagination ──────────────────────────────
        $paginationInfo = $this->detectPagination($decoded, $primaryUrl);

        if ($paginationInfo) {
            Log::channel('feed')->info('FeedDiscoveryService: pagination detected', $paginationInfo);
            $this->discoveryLog['pagination_info'][$primaryUrl] = $paginationInfo;

            $this->downloadAllPages($primaryUrl, $paginationInfo, $decoded, $maxPages);
        }

        // ── Step 3: Detect region filter ──────────────────────────────────────
        if ($detectRegion) {
            $regionInfo = $this->detectRegionFilter($decoded, $primaryUrl);
            if ($regionInfo) {
                $this->discoveryLog['region_filter'] = $regionInfo;
                Log::channel('feed')->info('FeedDiscoveryService: region filter detected', $regionInfo);

                // Download Moscow-filtered version if different URL
                if (!empty($regionInfo['moscow_url']) && $regionInfo['moscow_url'] !== $primaryUrl) {
                    $this->fetchAndSave($regionInfo['moscow_url'], 'primary_moscow');
                }
            }
        }

        // ── Step 4: Detect embedded sub-endpoint URLs ─────────────────────────
        $embeddedUrls = $this->detectEmbeddedUrls($decoded, $primaryUrl);
        foreach ($embeddedUrls as $label => $url) {
            $this->fetchAndSave($url, "embedded_{$label}");
        }

        // ── Step 5: Probe known entity sub-endpoints ──────────────────────────
        if ($probeEntities) {
            $this->probeKnownEntities($primaryUrl);
        }

        return $this->finalizeLog();
    }

    // =========================================================================
    // Fetch and save
    // =========================================================================

    /**
     * Fetch a URL and save the raw file.
     * Returns decoded payload + metadata, or null on failure.
     *
     * @return array{result: FeedFetchResult, decoded: array, path: string}|null
     */
    private function fetchAndSave(string $url, string $label): ?array
    {
        try {
            $result  = $this->client->fetch($url);
            $decoded = $result->decoded();
            $path    = $this->storage->saveRaw($result);

            $entry = [
                'url'      => $url,
                'label'    => $label,
                'path'     => $path,
                'bytes'    => $result->sizeBytes(),
                'human'    => $result->payloadHumanSize(),
                'checksum' => $result->checksum(),
                'http'     => $result->httpStatus,
                'seconds'  => $result->downloadSeconds,
            ];

            $this->discoveryLog['collected_files'][] = $entry;
            $this->discoveryLog['discovered_endpoints'][] = $url;

            Log::channel('feed')->info("FeedDiscoveryService: [{$label}] saved {$result->payloadHumanSize()}", [
                'url' => $url, 'bytes' => $result->sizeBytes(),
            ]);

            return compact('result', 'decoded', 'path');

        } catch (\Throwable $e) {
            $this->discoveryLog['errors'][] = [
                'url'     => $url,
                'label'   => $label,
                'error'   => $e->getMessage(),
            ];
            Log::channel('feed')->warning("FeedDiscoveryService: [{$label}] FAILED: " . $e->getMessage());
            return null;
        }
    }

    // =========================================================================
    // Pagination detection
    // =========================================================================

    /**
     * Detect whether the response contains pagination markers.
     *
     * Returns pagination info array, or null if not paginated.
     *
     * @param  array<string,mixed> $decoded
     * @return array{type:string, current_page:int, total_pages:int|null, next_url:string|null, page_param:string}|null
     */
    public function detectPagination(array $decoded, string $url): ?array
    {
        // ── Pattern: next URL in response body ───────────────────────────────
        $nextUrl = $this->extractNestedKey($decoded, [
            'pagination.next_page_url', 'pagination.next', 'meta.next_page_url',
            'links.next', 'next_page_url', 'next', 'nextPage', 'nextPageUrl',
        ]);

        if (is_string($nextUrl) && filter_var($nextUrl, FILTER_VALIDATE_URL)) {
            $currentPage = (int) ($this->extractNestedKey($decoded, [
                'pagination.current_page', 'meta.current_page', 'current_page', 'page',
            ]) ?? 1);

            $totalPages = (int) ($this->extractNestedKey($decoded, [
                'pagination.total_pages', 'pagination.last_page', 'meta.last_page',
                'meta.total_pages', 'total_pages', 'last_page', 'pageCount',
            ]) ?? 0) ?: null;

            return [
                'type'         => 'next_url',
                'current_page' => $currentPage,
                'total_pages'  => $totalPages,
                'next_url'     => $nextUrl,
                'page_param'   => $this->guessPageParam($nextUrl),
            ];
        }

        // ── Pattern: current_page + total_pages numeric ───────────────────────
        $currentPage = $this->extractNestedKey($decoded, [
            'pagination.current_page', 'meta.current_page', 'current_page', 'page',
        ]);
        $totalPages = $this->extractNestedKey($decoded, [
            'pagination.total_pages', 'pagination.last_page', 'meta.last_page',
            'total_pages', 'last_page', 'pages', 'pageCount',
        ]);

        if (is_numeric($currentPage) && is_numeric($totalPages) && (int) $totalPages > 1) {
            $pageParam = $this->guessPageParamFromUrl($url) ?? 'page';

            return [
                'type'         => 'numeric',
                'current_page' => (int) $currentPage,
                'total_pages'  => (int) $totalPages,
                'next_url'     => null,
                'page_param'   => $pageParam,
            ];
        }

        // ── Pattern: has_next_page boolean ───────────────────────────────────
        $hasNext = $this->extractNestedKey($decoded, ['has_next_page', 'hasNextPage', 'has_more', 'hasMore']);
        if ($hasNext === true || $hasNext === 1) {
            $pageParam = $this->guessPageParamFromUrl($url) ?? 'page';

            return [
                'type'         => 'has_next',
                'current_page' => 1,
                'total_pages'  => null,
                'next_url'     => null,
                'page_param'   => $pageParam,
            ];
        }

        // ── Pattern: probe page=2 — see if response is different ─────────────
        // (done lazily during download — not here to avoid extra requests)

        return null;
    }

    /**
     * Download all remaining pages of a paginated endpoint.
     *
     * @param  array<string,mixed> $firstPageDecoded
     */
    private function downloadAllPages(
        string $baseUrl,
        array $paginationInfo,
        array $firstPageDecoded,
        int $maxPages
    ): void {
        $pageParam   = $paginationInfo['page_param'];
        $totalPages  = $paginationInfo['total_pages'];
        $nextUrl     = $paginationInfo['next_url'];
        $currentPage = $paginationInfo['current_page'] ?? 1;

        // Count total items from first page for logging
        $totalItems = $this->countRootItems($firstPageDecoded);

        Log::channel('feed')->info("FeedDiscoveryService: downloading paginated feed", [
            'total_pages'  => $totalPages ?? 'unknown',
            'page_param'   => $pageParam,
            'total_items'  => $totalItems,
            'max_pages'    => $maxPages,
        ]);

        // ── next_url type: follow the chain ───────────────────────────────────
        if ($paginationInfo['type'] === 'next_url') {
            $page = 2;
            $url  = $nextUrl;

            while ($url && $page <= $maxPages) {
                $result = $this->fetchAndSave($url, "page_{$page}");
                if (!$result) break;

                $nextUrl = $this->extractNestedKey($result['decoded'], [
                    'pagination.next_page_url', 'pagination.next',
                    'meta.next_page_url', 'links.next',
                    'next_page_url', 'next', 'nextPage',
                ]);

                $url = is_string($nextUrl) && filter_var($nextUrl, FILTER_VALIDATE_URL)
                    ? $nextUrl
                    : null;

                $page++;
            }

            return;
        }

        // ── numeric type: page=2, page=3, … page=N ────────────────────────────
        $limit = $totalPages ? min($totalPages, $maxPages) : $maxPages;

        for ($page = 2; $page <= $limit; $page++) {
            $url = $this->buildPageUrl($baseUrl, $pageParam, $page);
            $result = $this->fetchAndSave($url, "page_{$page}");

            if (!$result) break; // Stop on first failure

            // Verify we got actual items (some APIs return empty last page)
            $items = $this->countRootItems($result['decoded']);
            if ($items === 0) {
                Log::channel('feed')->info("FeedDiscoveryService: page {$page} returned 0 items — stopping");
                break;
            }
        }
    }

    // =========================================================================
    // Region filter detection
    // =========================================================================

    /**
     * Detect whether the feed supports region/city filtering.
     * Checks common query parameters and response fields.
     *
     * @param  array<string,mixed> $decoded
     * @return array{param:string, moscow_url:string}|null
     */
    public function detectRegionFilter(array $decoded, string $baseUrl): ?array
    {
        // Check if response already mentions a region
        $regionKeys = ['region', 'city', 'city_id', 'region_id', 'location', 'area'];
        foreach ($regionKeys as $key) {
            if (isset($decoded[$key])) {
                return [
                    'detected_key' => $key,
                    'value'        => $decoded[$key],
                    'moscow_url'   => null, // same endpoint already filtered
                    'note'         => "Feed already returns region-specific data (key: {$key})",
                ];
            }
        }

        // Try appending ?region=moscow or ?city=moscow
        $regionParams = ['region' => 'moscow', 'city' => 'moscow', 'city_id' => '1', 'region_id' => '1'];

        foreach ($regionParams as $param => $value) {
            $testUrl = $this->appendQueryParam($baseUrl, $param, $value);

            try {
                $response = $this->client->fetch($testUrl);
                $testDecoded = $response->decoded();

                // Compare item count — if different, filter works
                $baseCount = $this->countRootItems($decoded);
                $testCount = $this->countRootItems($testDecoded);

                if ($testCount !== $baseCount && $testCount > 0) {
                    return [
                        'detected_key' => $param,
                        'value'        => $value,
                        'moscow_url'   => $testUrl,
                        'base_count'   => $baseCount,
                        'moscow_count' => $testCount,
                        'note'         => "Filter ?{$param}={$value} returns {$testCount} items vs base {$baseCount}",
                    ];
                }
            } catch (\Throwable) {
                // Silently skip — parameter not supported
            }
        }

        return null;
    }

    // =========================================================================
    // Sub-endpoint discovery
    // =========================================================================

    /**
     * Extract any URL strings embedded in root-level fields of the response.
     * These often point to related entity endpoints.
     *
     * @param  array<string,mixed> $decoded
     * @return array<string, string>  [label => url]
     */
    public function detectEmbeddedUrls(array $decoded, string $baseUrl): array
    {
        $found   = [];
        $baseHost= parse_url($baseUrl, PHP_URL_HOST) ?? '';

        $urlPattern = '/https?:\/\/[^\s"\'<>]+/';

        $scan = function (mixed $value, string $path) use (&$scan, &$found, $baseHost, $urlPattern): void {
            if (is_string($value) && strlen($value) > 10) {
                if (preg_match($urlPattern, $value, $match)) {
                    $url      = $match[0];
                    $urlHost  = parse_url($url, PHP_URL_HOST) ?? '';
                    $urlPath  = parse_url($url, PHP_URL_PATH) ?? '';

                    // Only same-host URLs, not the current endpoint itself
                    if ($urlHost === $baseHost && !isset($found[$urlPath])) {
                        $label = preg_replace('/[^a-z0-9_]/', '_', strtolower(trim($urlPath, '/')));
                        $found[$label] = $url;
                    }
                }
            } elseif (is_array($value)) {
                foreach (array_slice($value, 0, 3) as $k => $v) {
                    $scan($v, "{$path}.{$k}");
                }
            }
        };

        foreach ($decoded as $key => $value) {
            $scan($value, (string) $key);
        }

        return $found;
    }

    /**
     * Probe known entity names as sub-endpoints of the base URL.
     * Tries /blocks, /buildings, /apartments, etc.
     *
     * If a probe returns a valid JSON array/object with items, saves it.
     */
    private function probeKnownEntities(string $primaryUrl): void
    {
        $baseUrl = $this->extractBaseUrl($primaryUrl);

        Log::channel('feed')->info("FeedDiscoveryService: probing known entities at {$baseUrl}");

        foreach (self::KNOWN_ENTITIES as $entity) {
            $url = rtrim($baseUrl, '/') . '/' . $entity;

            // Skip if already downloaded
            if (in_array($url, $this->discoveryLog['discovered_endpoints'], true)) {
                continue;
            }

            try {
                $result  = $this->client->fetch($url);
                $decoded = $result->decoded();

                // Only save if response contains actual data (not an error page)
                if ($this->isUsefulPayload($decoded, $result->httpStatus)) {
                    $count = $this->countRootItems($decoded);
                    Log::channel('feed')->info("FeedDiscoveryService: found entity [{$entity}] — {$count} items");

                    $this->fetchAndSave($url, $entity);
                }
            } catch (\Throwable) {
                // Silently skip — endpoint doesn't exist
            }
        }
    }

    // =========================================================================
    // Helpers: URL manipulation
    // =========================================================================

    /**
     * Extract the base URL (scheme + host + path without last segment if it looks like a resource ID).
     */
    private function extractBaseUrl(string $url): string
    {
        $parts = parse_url($url);
        $base  = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');
        $path  = $parts['path'] ?? '';

        // If path ends with a version like /v1, /v2, /api/v1 — keep it
        // If path ends with a file extension — remove
        $path = preg_replace('/\.[a-z]{2,4}$/i', '', $path);

        return $base . $path;
    }

    private function appendQueryParam(string $url, string $param, string $value): string
    {
        $sep = str_contains($url, '?') ? '&' : '?';
        return $url . $sep . urlencode($param) . '=' . urlencode($value);
    }

    private function buildPageUrl(string $baseUrl, string $pageParam, int $page): string
    {
        // Remove existing page param if present
        $url = preg_replace('/([?&])' . preg_quote($pageParam, '/') . '=\d+/', '', $baseUrl);
        $url = rtrim($url ?? $baseUrl, '?&');
        return $this->appendQueryParam($url, $pageParam, (string) $page);
    }

    private function guessPageParam(string $nextUrl): string
    {
        parse_str(parse_url($nextUrl, PHP_URL_QUERY) ?? '', $params);

        foreach (self::PAGE_PARAMS as $param) {
            if (isset($params[$param])) {
                return $param;
            }
        }

        return 'page';
    }

    private function guessPageParamFromUrl(string $url): ?string
    {
        parse_str(parse_url($url, PHP_URL_QUERY) ?? '', $params);

        foreach (self::PAGE_PARAMS as $param) {
            if (isset($params[$param])) {
                return $param;
            }
        }

        return null;
    }

    // =========================================================================
    // Helpers: data inspection
    // =========================================================================

    /**
     * Extract a value from a decoded array using a dot-notation path.
     * Returns null if the path doesn't exist.
     */
    private function extractNestedKey(array $decoded, array $paths): mixed
    {
        foreach ($paths as $path) {
            $keys = explode('.', $path);
            $val  = $decoded;

            foreach ($keys as $key) {
                if (!is_array($val) || !array_key_exists($key, $val)) {
                    $val = null;
                    break;
                }
                $val = $val[$key];
            }

            if ($val !== null) {
                return $val;
            }
        }

        return null;
    }

    /**
     * Count items in the root of a decoded payload.
     * Handles both root list and root object with a main array key.
     */
    public function countRootItems(array $decoded): int
    {
        // Root is a plain list
        if (array_is_list($decoded)) {
            return count($decoded);
        }

        // Root is an object: find the largest array value
        $max = 0;
        foreach ($decoded as $value) {
            if (is_array($value) && array_is_list($value)) {
                $max = max($max, count($value));
            }
        }

        return $max;
    }

    /**
     * Check if a decoded payload looks like real data (not an error or empty response).
     */
    private function isUsefulPayload(array $decoded, int $httpStatus): bool
    {
        if ($httpStatus < 200 || $httpStatus >= 300) {
            return false;
        }

        if (empty($decoded)) {
            return false;
        }

        // Error responses often have "error", "message", "detail" keys and nothing else
        $rootKeys = array_keys($decoded);
        $errorKeys = ['error', 'message', 'detail', 'status', 'code'];

        if (count($rootKeys) <= 2 && count(array_intersect($rootKeys, $errorKeys)) > 0) {
            return false;
        }

        // Must have at least some data
        return $this->countRootItems($decoded) > 0
            || count($decoded) > 2;
    }

    // =========================================================================
    // Finalize
    // =========================================================================

    private function finalizeLog(): array
    {
        $totalBytes = 0;
        foreach ($this->discoveryLog['collected_files'] as $f) {
            $totalBytes += $f['bytes'] ?? 0;
        }

        $this->discoveryLog['finished_at']   = now()->toIso8601String();
        $this->discoveryLog['total_files']   = count($this->discoveryLog['collected_files']);
        $this->discoveryLog['total_bytes']   = $totalBytes;
        $this->discoveryLog['total_size_mb'] = round($totalBytes / (1024 * 1024), 3);
        $this->discoveryLog['total_endpoints']= count(array_unique($this->discoveryLog['discovered_endpoints']));

        // Save the discovery log itself
        $this->storage->saveAnalysis('discovery_log.json', $this->discoveryLog);

        return $this->discoveryLog;
    }
}
