<?php

namespace App\Services\Feed;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * HTTP client for fetching real-estate feed data.
 *
 * Responsibilities:
 *  - Execute HTTP GET to feed endpoints
 *  - Apply configured auth (bearer / basic / query param)
 *  - Retry on transient failures with exponential back-off
 *  - Stream large responses directly to disk (sink) to avoid OOM
 *  - Log each attempt with status code and timing
 *
 * Configuration: config/feed.php
 *
 * IMPORTANT: Feed endpoints are only reachable from IP 85.198.64.93.
 * Running this locally will result in a connection error or 403.
 */
class FeedClient
{
    /** @var array{timeout:int, retry_times:int, retry_sleep_ms:int, verify_ssl:bool} */
    private array $httpConfig;

    /** @var array{mode:string, token:?string, username:?string, password:?string, param:string} */
    private array $authConfig;

    public function __construct()
    {
        $this->httpConfig = config('feed.http');
        $this->authConfig = config('feed.auth');
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Download a feed endpoint into memory and return a result DTO.
     * Use for small endpoints (< 20 MB). For large files use downloadToFile().
     *
     * @param  string $url  Full endpoint URL
     * @return FeedFetchResult
     *
     * @throws \RuntimeException  If all retry attempts fail
     */
    public function fetch(string $url): FeedFetchResult
    {
        $label         = $this->labelFromUrl($url);
        $attempt       = 0;
        $lastException = null;

        $retryTimes = $this->httpConfig['retry_times'];
        $sleepMs    = $this->httpConfig['retry_sleep_ms'];

        while ($attempt <= $retryTimes) {
            $attempt++;

            try {
                Log::channel('feed')->info("FeedClient: fetching [{$label}] attempt {$attempt}/{$retryTimes}", [
                    'url' => $url,
                ]);

                $startedAt = microtime(true);
                $response  = $this->buildRequest($url)->get($url);
                $elapsed   = round(microtime(true) - $startedAt, 3);

                Log::channel('feed')->info("FeedClient: [{$label}] HTTP {$response->status()} in {$elapsed}s", [
                    'url'            => $url,
                    'status'         => $response->status(),
                    'content_type'   => $response->header('Content-Type'),
                    'content_length' => $response->header('Content-Length') ?? strlen($response->body()),
                    'elapsed_sec'    => $elapsed,
                ]);

                if ($response->failed()) {
                    throw new \RuntimeException(
                        "Feed [{$label}] returned HTTP {$response->status()}: " . substr($response->body(), 0, 200)
                    );
                }

                return new FeedFetchResult(
                    url:             $url,
                    label:           $label,
                    body:            $response->body(),
                    httpStatus:      $response->status(),
                    downloadSeconds: $elapsed,
                );

            } catch (RequestException|\RuntimeException $e) {
                $lastException = $e;

                Log::channel('feed')->warning(
                    "FeedClient: [{$label}] attempt {$attempt} failed: " . $e->getMessage(),
                    ['url' => $url, 'attempt' => $attempt]
                );

                if ($attempt <= $retryTimes) {
                    $waitMs = $sleepMs * (2 ** ($attempt - 1)); // exponential back-off
                    Log::channel('feed')->info("FeedClient: [{$label}] retrying in {$waitMs}ms...");
                    usleep($waitMs * 1000);
                }
            }
        }

        $msg = "FeedClient: [{$label}] all {$retryTimes} attempts failed: " . $lastException?->getMessage();
        Log::channel('feed')->error($msg, ['url' => $url]);

        throw new \RuntimeException($msg, 0, $lastException);
    }

    /**
     * Stream-download a feed endpoint directly to a local file.
     *
     * Uses Guzzle's `sink` option — response body is written to disk in chunks
     * without ever loading the full content into PHP memory.
     * Ideal for large endpoints (apartments.json = 153 MB).
     *
     * @param  string $url        Full endpoint URL
     * @param  string $targetPath Absolute path where the file will be saved
     * @return float              Elapsed download time in seconds
     *
     * @throws \RuntimeException  If all retry attempts fail or directory can't be created
     */
    public function downloadToFile(string $url, string $targetPath): float
    {
        $label         = $this->labelFromUrl($url);
        $attempt       = 0;
        $lastException = null;

        $retryTimes = $this->httpConfig['retry_times'];
        $sleepMs    = $this->httpConfig['retry_sleep_ms'];

        // Ensure target directory exists
        $dir = dirname($targetPath);
        if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new \RuntimeException("FeedClient: cannot create directory [{$dir}]");
        }

        while ($attempt <= $retryTimes) {
            $attempt++;

            try {
                Log::channel('feed')->info(
                    "FeedClient: streaming [{$label}] attempt {$attempt}/{$retryTimes} → disk",
                    ['url' => $url, 'target' => $targetPath]
                );

                $startedAt = microtime(true);

                // sink = Guzzle streams response bytes directly to file, O(1) memory
                $response = $this->buildRequest($url)
                    ->withOptions(['sink' => $targetPath])
                    ->get($url);

                $elapsed   = round(microtime(true) - $startedAt, 3);
                $sizeBytes = file_exists($targetPath) ? filesize($targetPath) : 0;
                $sizeMb    = round($sizeBytes / 1024 / 1024, 2);

                if ($response->failed()) {
                    @unlink($targetPath);
                    throw new \RuntimeException(
                        "Feed [{$label}] returned HTTP {$response->status()}"
                    );
                }

                Log::channel('feed')->info(
                    "FeedClient: [{$label}] streamed {$sizeMb} MB in {$elapsed}s",
                    [
                        'url'         => $url,
                        'target'      => $targetPath,
                        'size_mb'     => $sizeMb,
                        'elapsed_sec' => $elapsed,
                    ]
                );

                return $elapsed;

            } catch (RequestException|\RuntimeException $e) {
                $lastException = $e;
                @unlink($targetPath); // remove partial file before retry

                Log::channel('feed')->warning(
                    "FeedClient: [{$label}] stream attempt {$attempt} failed: " . $e->getMessage(),
                    ['url' => $url, 'attempt' => $attempt]
                );

                if ($attempt <= $retryTimes) {
                    $waitMs = $sleepMs * (2 ** ($attempt - 1));
                    Log::channel('feed')->info("FeedClient: [{$label}] retrying in {$waitMs}ms...");
                    usleep($waitMs * 1000);
                }
            }
        }

        $msg = "FeedClient: [{$label}] all {$retryTimes} stream attempts failed: "
             . $lastException?->getMessage();
        Log::channel('feed')->error($msg, ['url' => $url]);

        throw new \RuntimeException($msg, 0, $lastException);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Build a configured PendingRequest with auth applied.
     * Mutates $url if query-param auth is used.
     */
    private function buildRequest(string &$url): PendingRequest
    {
        $client = Http::timeout($this->httpConfig['timeout'])
            ->withOptions([
                'verify' => $this->httpConfig['verify_ssl'],
            ])
            ->withHeaders([
                'Accept'     => 'application/json',
                'User-Agent' => 'Livegrid-FeedAnalyzer/1.0 (+https://livegrid.ru)',
            ]);

        $client = match ($this->authConfig['mode']) {
            'bearer' => $client->withToken($this->authConfig['token'] ?? ''),
            'basic'  => $client->withBasicAuth(
                $this->authConfig['username'] ?? '',
                $this->authConfig['password'] ?? ''
            ),
            default  => $client,
        };

        // Append token as query parameter if needed
        if ($this->authConfig['mode'] === 'query' && $this->authConfig['token']) {
            $separator = str_contains($url, '?') ? '&' : '?';
            $url .= $separator . $this->authConfig['param'] . '=' . $this->authConfig['token'];
        }

        return $client;
    }

    /**
     * Extract a short human-readable label from a URL.
     * "https://feeds.example.com/api/moscow/apartments.json" → "feeds.example.com/.../apartments.json"
     */
    private function labelFromUrl(string $url): string
    {
        $parsed = parse_url($url);
        $host   = $parsed['host'] ?? $url;
        $path   = $parsed['path'] ?? '';
        $last   = basename($path) ?: '';

        return $last ? "{$host}/.../{$last}" : $host;
    }
}
