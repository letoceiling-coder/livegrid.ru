<?php

namespace App\Services\Feed;

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
 *  - Log each attempt with status code and timing
 *  - Return raw response body + metadata DTO
 *
 * Configuration: config/feed.php
 *
 * IMPORTANT: Feed endpoints are only reachable from IP 85.198.64.93.
 * Running this locally will result in a connection error or 403.
 */
final class FeedClient
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
     * Download a feed endpoint and return a result DTO.
     *
     * @param  string $url  Full endpoint URL
     * @return FeedFetchResult
     *
     * @throws \RuntimeException  If all retry attempts fail
     */
    public function fetch(string $url): FeedFetchResult
    {
        $label   = $this->labelFromUrl($url);
        $attempt = 0;
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
                $response  = $this->execute($url);
                $elapsed   = round(microtime(true) - $startedAt, 3);

                Log::channel('feed')->info("FeedClient: [{$label}] HTTP {$response->status()} in {$elapsed}s", [
                    'url'           => $url,
                    'status'        => $response->status(),
                    'content_type'  => $response->header('Content-Type'),
                    'content_length'=> $response->header('Content-Length') ?? strlen($response->body()),
                    'elapsed_sec'   => $elapsed,
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

                Log::channel('feed')->warning("FeedClient: [{$label}] attempt {$attempt} failed: " . $e->getMessage(), [
                    'url'     => $url,
                    'attempt' => $attempt,
                ]);

                if ($attempt <= $retryTimes) {
                    // Exponential back-off: 2s, 4s, 8s…
                    $waitMs = $sleepMs * (2 ** ($attempt - 1));
                    Log::channel('feed')->info("FeedClient: [{$label}] retrying in {$waitMs}ms...");
                    usleep($waitMs * 1000);
                }
            }
        }

        $msg = "FeedClient: [{$label}] all {$retryTimes} attempts failed: " . $lastException?->getMessage();
        Log::channel('feed')->error($msg, ['url' => $url]);

        throw new \RuntimeException($msg, 0, $lastException);
    }

    // =========================================================================
    // Private helpers
    // =========================================================================

    /**
     * Execute a single HTTP GET with auth and timeout.
     */
    private function execute(string $url): Response
    {
        $client = Http::timeout($this->httpConfig['timeout'])
            ->withOptions([
                'verify' => $this->httpConfig['verify_ssl'],
            ])
            ->withHeaders([
                'Accept'     => 'application/json',
                'User-Agent' => 'Livegrid-FeedAnalyzer/1.0 (+https://livegrid.ru)',
            ]);

        // Apply authentication
        $client = match ($this->authConfig['mode']) {
            'bearer' => $client->withToken($this->authConfig['token'] ?? ''),
            'basic'  => $client->withBasicAuth(
                $this->authConfig['username'] ?? '',
                $this->authConfig['password'] ?? ''
            ),
            default  => $client,
        };

        // For query-param auth, append token to URL
        if ($this->authConfig['mode'] === 'query' && $this->authConfig['token']) {
            $separator = str_contains($url, '?') ? '&' : '?';
            $url .= $separator . $this->authConfig['param'] . '=' . $this->authConfig['token'];
        }

        return $client->get($url);
    }

    /**
     * Extract a short human-readable label from a URL.
     * "https://feeds.example.com/api/moscow/v2" → "feeds.example.com/.../v2"
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
