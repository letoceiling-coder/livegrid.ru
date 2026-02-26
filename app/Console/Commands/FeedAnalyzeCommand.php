<?php

namespace App\Console\Commands;

use App\Services\Feed\FeedAnalysisResult;
use App\Services\Feed\FeedAnalyzer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Artisan command: php artisan feed:analyze
 *
 * Downloads and analyzes one or all configured feed endpoints.
 * Produces two database artifacts per endpoint:
 *   - feed_raw_snapshots   (full JSON + metadata)
 *   - feed_schema_analysis (recursive field path map)
 *
 * Usage:
 *   php artisan feed:analyze                           # all endpoints
 *   php artisan feed:analyze --url=https://...         # single endpoint
 *   php artisan feed:analyze --no-schema               # skip schema inspection
 *   php artisan feed:analyze --no-save                 # analyze but don't persist
 *   php artisan feed:analyze --dry-run                 # only validate config
 *
 * IMPORTANT: This command must be run on server 85.198.64.93.
 * Feed endpoints are not accessible from local machines.
 *
 * Scheduled: daily at 03:00 (see App\Console\Kernel).
 */
class FeedAnalyzeCommand extends Command
{
    protected $signature = 'feed:analyze
        {--url=           : Analyze a single specific URL (overrides config)}
        {--no-schema      : Skip schema inspection (only save raw snapshot)}
        {--no-save        : Run analysis but do not persist to database}
        {--dry-run        : Only validate config and connection, no download}
        {--dump-schema    : After analysis, dump top 50 paths to console}
        {--reset-schema   : Truncate existing schema data before inserting}';

    protected $description = 'Download, store, and analyze the real-estate feed JSON structure';

    // =========================================================================
    // Entry point
    // =========================================================================

    public function handle(FeedAnalyzer $analyzer): int
    {
        $this->printBanner();

        // ── Resolve endpoints ─────────────────────────────────────────────────
        $endpoints = $this->resolveEndpoints();

        if (empty($endpoints)) {
            $this->error('No feed endpoints configured.');
            $this->line('  Set FEED_ENDPOINT_PRIMARY in .env or use --url=https://...');
            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->warn('[DRY-RUN] The following endpoints would be analyzed:');
            foreach ($endpoints as $url) {
                $this->line("  ✓ {$url}");
            }
            return self::SUCCESS;
        }

        // ── Override schema options from CLI ──────────────────────────────────
        if ($this->option('reset-schema')) {
            config(['feed.schema.reset_on_each_run' => true]);
        }

        if ($this->option('no-save')) {
            config([
                'feed.storage.save_payload' => false,
                'feed.storage.keep_snapshots' => 0,
            ]);
            $this->warn('[--no-save] Results will not be persisted to the database.');
        }

        // ── Process each endpoint ─────────────────────────────────────────────
        $exitCode = self::SUCCESS;
        $results  = [];

        foreach ($endpoints as $index => $url) {
            $total = count($endpoints);
            $num   = $index + 1;

            $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            $this->info(" Endpoint [{$num}/{$total}]");
            $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            $this->line("  URL: {$url}");
            $this->newLine();

            try {
                $result = $this->runAnalysis($analyzer, $url);
                $results[] = $result;
                $this->renderResult($result);

            } catch (\Throwable $e) {
                $this->error("  FAILED: " . $e->getMessage());
                Log::channel('feed')->error("feed:analyze failed for {$url}: " . $e->getMessage(), [
                    'exception' => $e,
                ]);
                $exitCode = self::FAILURE;
            }

            $this->newLine();
        }

        // ── Final summary (multi-endpoint) ────────────────────────────────────
        if (count($results) > 1) {
            $this->renderSummary($results);
        }

        $this->line(count($results) > 0
            ? '  <info>✓ feed:analyze complete.</info>'
            : '  <error>✗ feed:analyze completed with errors.</error>'
        );

        return $exitCode;
    }

    // =========================================================================
    // Analysis execution
    // =========================================================================

    /**
     * Run the analysis pipeline for a single URL.
     * Conditionally skips schema inspection based on --no-schema flag.
     */
    private function runAnalysis(FeedAnalyzer $analyzer, string $url): FeedAnalysisResult
    {
        if ($this->option('no-schema')) {
            // Temporarily disable schema inspection
            // FeedAnalyzer always runs it; we work around via config
            config(['feed.schema.max_depth' => 0]);
        }

        $this->line('  <comment>→ Downloading feed...</comment>');
        $result = $analyzer->analyze($url);

        return $result;
    }

    // =========================================================================
    // Console output rendering
    // =========================================================================

    /**
     * Print analysis result statistics to the console.
     */
    private function renderResult(FeedAnalysisResult $result): void
    {
        $changed = $result->isChanged ? '<comment>YES (changed)</comment>' : '<info>no (same as last run)</info>';

        $this->table([], [
            ['Snapshot ID',    "#<info>{$result->snapshotId}</info>"],
            ['HTTP Status',    $result->httpStatus === 200 ? "<info>{$result->httpStatus}</info>" : "<error>{$result->httpStatus}</error>"],
            ['Download time',  round($result->downloadSeconds, 2) . 's'],
            ['Payload size',   $result->payloadHumanSize()],
            ['Feed changed',   $changed],
            ['', ''],
            ['ЖК / Projects',  $result->projectsCount   ?: '<comment>not detected</comment>'],
            ['Buildings',      $result->buildingsCount  ?: '<comment>not detected</comment>'],
            ['Apartments',     $result->apartmentsCount ?: '<comment>not detected</comment>'],
            ['Total objects',  $result->objectsCount],
            ['', ''],
            ['Unique paths',   $result->uniquePaths],
        ]);

        // Type distribution
        if (!empty($result->typeDistribution)) {
            $this->line('  <comment>Type distribution:</comment>');
            foreach ($result->typeDistribution as $type => $count) {
                $bar = str_repeat('█', min((int)($count / max(array_values($result->typeDistribution)) * 20), 20));
                $this->line(sprintf('    %-8s %5d  %s', $type, $count, $bar));
            }
            $this->newLine();
        }

        // Depth stats
        if (!empty($result->depthStats)) {
            $this->line('  <comment>Fields per depth level:</comment>');
            foreach ($result->depthStats as $depth => $count) {
                $indent = str_repeat('  ', $depth);
                $this->line("    depth {$depth}: {$indent}{$count} field(s)");
            }
            $this->newLine();
        }

        // Schema dump
        if ($this->option('dump-schema')) {
            $this->dumpTopPaths($result->url);
        }
    }

    /**
     * Print a multi-endpoint summary table.
     *
     * @param  FeedAnalysisResult[] $results
     */
    private function renderSummary(array $results): void
    {
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->info(' SUMMARY');
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        $rows = array_map(fn(FeedAnalysisResult $r) => [
            $r->label,
            $r->payloadHumanSize(),
            $r->projectsCount,
            $r->buildingsCount,
            $r->apartmentsCount,
            $r->uniquePaths,
            $r->isChanged ? 'changed' : 'same',
        ], $results);

        $this->table(
            ['Endpoint', 'Size', 'ЖК', 'Buildings', 'Apts', 'Paths', 'Changed'],
            $rows
        );
    }

    /**
     * Dump top 50 discovered schema paths to console (sorted by occurrences desc).
     */
    private function dumpTopPaths(string $url): void
    {
        $paths = \Illuminate\Support\Facades\DB::table('feed_schema_analysis')
            ->where('source_url', $url)
            ->orderByDesc('occurrences')
            ->limit(50)
            ->get(['path', 'type', 'occurrences', 'example_value', 'depth']);

        if ($paths->isEmpty()) {
            return;
        }

        $this->line('  <comment>Top 50 schema paths (by occurrences):</comment>');
        $this->table(
            ['Path', 'Type', 'Occurrences', 'Example', 'Depth'],
            $paths->map(fn($p) => [
                mb_substr($p->path, 0, 60),
                $p->type,
                $p->occurrences,
                mb_substr((string)($p->example_value ?? ''), 0, 40),
                $p->depth,
            ])->toArray()
        );
    }

    // =========================================================================
    // Config helpers
    // =========================================================================

    /**
     * Resolve the list of endpoints to analyze.
     * --url flag takes priority over config.
     *
     * @return string[]
     */
    private function resolveEndpoints(): array
    {
        $urlOption = $this->option('url');

        if ($urlOption) {
            return [(string) $urlOption];
        }

        $configured = array_values(array_filter(
            (array) config('feed.endpoints', [])
        ));

        return $configured;
    }

    // =========================================================================
    // Banner
    // =========================================================================

    private function printBanner(): void
    {
        $this->newLine();
        $this->line('<info>╔══════════════════════════════════════════╗</info>');
        $this->line('<info>║       LIVEGRID — Feed Analyzer           ║</info>');
        $this->line('<info>╚══════════════════════════════════════════╝</info>');
        $this->newLine();
    }
}
