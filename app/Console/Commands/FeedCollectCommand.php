<?php

namespace App\Console\Commands;

use App\Services\Feed\FeedClient;
use App\Services\Feed\FeedFileStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Artisan command: php artisan feed:collect
 *
 * Downloads all configured feed endpoints and saves raw JSON to:
 *   storage/feed/raw/{md5_of_url}/{date}_{time}.json
 *
 * Does NOT analyze or process the data — purely collect + store.
 * Run feed:inspect after this command to analyze the collected files.
 *
 * IMPORTANT: Run this on server 85.198.64.93.
 * Feed endpoints are not accessible from local machines.
 *
 * Usage:
 *   php artisan feed:collect                          # all configured endpoints
 *   php artisan feed:collect --url=https://...        # single endpoint
 *   php artisan feed:collect --force                  # re-download even if already collected today
 *   php artisan feed:collect --dry-run                # validate config, no download
 *   php artisan feed:collect --list                   # show collected snapshots
 */
class FeedCollectCommand extends Command
{
    protected $signature = 'feed:collect
        {--url=       : Download a specific URL (overrides config)}
        {--force      : Re-download even if a snapshot already exists for today}
        {--dry-run    : Validate config without downloading}
        {--list       : List all collected raw snapshots and exit}';

    protected $description = 'Download raw feed JSON to storage/feed/raw/';

    // =========================================================================
    // Entry point
    // =========================================================================

    public function handle(FeedClient $client, FeedFileStorage $storage): int
    {
        $this->printBanner();

        // ── --list: show history and exit ─────────────────────────────────────
        if ($this->option('list')) {
            return $this->listSnapshots($storage);
        }

        // ── Resolve endpoints ─────────────────────────────────────────────────
        $endpoints = $this->resolveEndpoints();

        if (empty($endpoints)) {
            $this->error('No feed endpoints configured.');
            $this->line('  Set FEED_ENDPOINT_PRIMARY in .env or use --url=https://...');
            return self::FAILURE;
        }

        // ── Dry-run ────────────────────────────────────────────────────────────
        if ($this->option('dry-run')) {
            $this->warn('[DRY-RUN] Would download the following endpoints:');
            foreach ($endpoints as $url) {
                $this->line("  → {$url}");
            }
            return self::SUCCESS;
        }

        // ── Download each endpoint ─────────────────────────────────────────────
        $exitCode  = self::SUCCESS;
        $successes = 0;
        $failures  = 0;

        foreach ($endpoints as $index => $url) {
            $total = count($endpoints);
            $num   = $index + 1;

            $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            $this->info(" Collecting [{$num}/{$total}]");
            $this->line("  URL: {$url}");

            // Skip if already collected today (unless --force)
            if (!$this->option('force')) {
                $latest = $storage->getLatestRawPath($url);
                if ($latest && $this->isFromToday($latest)) {
                    $this->warn("  ⏭  Already collected today: " . basename($latest));
                    $this->line("  Use --force to re-download.");
                    $successes++;
                    continue;
                }
            }

            try {
                $result = $this->downloadEndpoint($client, $url);
                $path   = $storage->saveRaw($result);
                $successes++;

                $this->info("  <info>✓ Saved:</info> {$path}");
                $this->line("  Size:    {$result->payloadHumanSize()}");
                $this->line("  Time:    {$result->downloadSeconds}s");
                $this->line("  HTTP:    {$result->httpStatus}");
                $this->line("  SHA-1:   {$result->checksum()}");

            } catch (\Throwable $e) {
                $failures++;
                $exitCode = self::FAILURE;

                $this->error("  ✗ FAILED: " . $e->getMessage());

                Log::channel('feed')->error("feed:collect failed for {$url}: " . $e->getMessage(), [
                    'exception' => $e,
                ]);
            }

            $this->newLine();
        }

        // ── Summary ────────────────────────────────────────────────────────────
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->info(" DONE — {$successes} succeeded, {$failures} failed");

        if ($successes > 0) {
            $this->line('');
            $this->line('  Next step: <comment>php artisan feed:inspect</comment>');
        }

        return $exitCode;
    }

    // =========================================================================
    // Download
    // =========================================================================

    /**
     * Download a single endpoint and return the result DTO.
     */
    private function downloadEndpoint(FeedClient $client, string $url): \App\Services\Feed\FeedFetchResult
    {
        $this->line('  <comment>→ Downloading...</comment>');

        $result = $client->fetch($url);

        // Validate that response is valid JSON before saving
        try {
            $result->decoded();
        } catch (\JsonException $e) {
            throw new \RuntimeException(
                "Feed returned invalid JSON (HTTP {$result->httpStatus}): " . $e->getMessage()
            );
        }

        return $result;
    }

    // =========================================================================
    // --list subcommand
    // =========================================================================

    private function listSnapshots(FeedFileStorage $storage): int
    {
        $manifest = $storage->loadManifest();

        if (empty($manifest)) {
            $this->warn('No snapshots collected yet. Run: php artisan feed:collect');
            return self::SUCCESS;
        }

        $this->info(' Collected snapshots (manifest):');
        $this->newLine();

        // Group by URL
        $byUrl = [];
        foreach ($manifest as $entry) {
            $url = $entry['url'] ?? 'unknown';
            $byUrl[$url][] = $entry;
        }

        foreach ($byUrl as $url => $entries) {
            $this->line("  <comment>{$url}</comment>");
            $rows = [];

            foreach (array_reverse($entries) as $entry) {
                $rows[] = [
                    basename($entry['json_path'] ?? ''),
                    $entry['payload_human'] ?? '',
                    $entry['checksum'] ?? '',
                    $entry['http_status'] ?? '',
                    $entry['saved_at'] ?? '',
                ];
            }

            $this->table(['File', 'Size', 'SHA-1', 'HTTP', 'Saved at'], $rows);
            $this->newLine();
        }

        return self::SUCCESS;
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Check if a file path's timestamp corresponds to today's date.
     * Files are named: 2026-02-26_03-00-00.json
     */
    private function isFromToday(string $path): bool
    {
        $filename = basename($path, '.json');
        $today    = now()->format('Y-m-d');

        return str_starts_with($filename, $today);
    }

    /**
     * Resolve endpoints from --url option or config.
     * @return string[]
     */
    private function resolveEndpoints(): array
    {
        $urlOpt = $this->option('url');

        if ($urlOpt) {
            return [(string) $urlOpt];
        }

        return array_values(array_filter(
            (array) config('feed.endpoints', [])
        ));
    }

    private function printBanner(): void
    {
        $this->newLine();
        $this->line('<info>╔══════════════════════════════════════════╗</info>');
        $this->line('<info>║       LIVEGRID — Feed Collector          ║</info>');
        $this->line('<info>╚══════════════════════════════════════════╝</info>');
        $this->newLine();
    }
}
