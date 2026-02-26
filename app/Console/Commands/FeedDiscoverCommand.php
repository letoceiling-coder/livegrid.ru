<?php

namespace App\Console\Commands;

use App\Services\Feed\FeedDiscoveryService;
use App\Services\Feed\FeedFileStorage;
use App\Services\Feed\FeedRelationshipAnalyzer;
use App\Services\Feed\FeedReportBuilder;
use App\Services\Feed\FeedSchemaMapper;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Artisan command: php artisan feed:discover
 *
 * Full pipeline:
 *   1. Discover all endpoints (primary + pagination + sub-endpoints)
 *   2. Verify completeness (counts, region filter)
 *   3. Deep schema inspection (--sample-size=500)
 *   4. Relationship analysis
 *   5. Build comprehensive report.json
 *   6. Print production-ready summary to console
 *
 * No database writes. No Eloquent. No business-logic migrations.
 * All output goes to storage/feed/{raw,analysis}/.
 */
class FeedDiscoverCommand extends Command
{
    protected $signature = 'feed:discover
        {--url=             : Override primary URL from config}
        {--max-pages=50     : Maximum paginated pages to download per endpoint}
        {--sample-size=500  : Array sample size for schema analysis (higher = more accurate)}
        {--no-probe         : Skip probing known sub-endpoint names (/blocks, /buildings, …)}
        {--no-region        : Skip region filter detection}
        {--no-relationships : Skip relationship graph analysis}
        {--dry-run          : Show plan without downloading}';

    protected $description =
        'Full feed discovery: endpoints → pagination → schema → relationships → report.json';

    public function __construct(
        private readonly FeedDiscoveryService  $discovery,
        private readonly FeedFileStorage       $storage,
        private readonly FeedSchemaMapper      $schemaMapper,
        private readonly FeedRelationshipAnalyzer $relationshipAnalyzer,
        private readonly FeedReportBuilder     $reportBuilder,
    ) {
        parent::__construct();
    }

    // =========================================================================
    // Entry point
    // =========================================================================

    public function handle(): int
    {
        $this->banner();

        // ── Resolve primary URL ───────────────────────────────────────────────
        // config('feed.endpoints') is a numeric array (array_filter of env vars)
        $primaryUrl = $this->option('url')
            ?: config('feed.endpoints.primary')                       // legacy named key
            ?: collect(config('feed.endpoints', []))->first();        // numeric array fallback

        if (!$primaryUrl) {
            $this->error('No feed endpoint configured.');
            $this->line('  Set FEED_ENDPOINT_PRIMARY in .env  or use --url=https://...');
            return self::FAILURE;
        }

        $this->info("Primary endpoint: <fg=cyan>{$primaryUrl}</>");
        $this->newLine();

        if ($this->option('dry-run')) {
            $this->warn('[DRY-RUN] No data will be downloaded.');
            $this->info("  Would discover endpoints at: {$primaryUrl}");
            $this->info("  Max pages   : " . $this->option('max-pages'));
            $this->info("  Sample size : " . $this->option('sample-size'));
            $this->info("  Probe subs  : " . ($this->option('no-probe') ? 'NO' : 'YES'));
            $this->info("  Region check: " . ($this->option('no-region') ? 'NO' : 'YES'));
            return self::SUCCESS;
        }

        // ── STEP 1: Discover all endpoints ────────────────────────────────────
        $this->section('STEP 1 — Endpoint Discovery');

        $manifest = $this->discovery->discover($primaryUrl, [
            'max_pages'       => (int) $this->option('max-pages'),
            'probe_entities'  => !$this->option('no-probe'),
            'detect_region'   => !$this->option('no-region'),
        ]);

        $this->printDiscoverySummary($manifest);

        if (empty($manifest['collected_files'])) {
            $this->error('No files collected. Cannot proceed.');
            return self::FAILURE;
        }

        // ── STEP 2: Verify completeness ───────────────────────────────────────
        $this->section('STEP 2 — Completeness Verification');

        $completeness = $this->verifyCompleteness($manifest);
        $this->printCompleteness($completeness);

        // ── STEP 3: Deep schema inspection ────────────────────────────────────
        $this->section('STEP 3 — Deep Schema Inspection');

        $sampleSize = (int) $this->option('sample-size');
        config(['feed.schema.array_sample_size' => $sampleSize]);
        $this->info("  Array sample size: <fg=yellow>{$sampleSize}</>");

        $schemaReportsByUrl = [];

        foreach ($manifest['collected_files'] as $file) {
            $url  = $file['url']  ?? '';
            $path = $file['path'] ?? '';
            $label= $file['label'] ?? md5($url);

            if (!$path || !file_exists($path)) {
                $this->warn("  [SKIP] File not found: {$path}");
                continue;
            }

            // Skip page_N files during schema analysis — schema is the same across pages
            if (preg_match('/^page_\d+$/', $label) && isset($schemaReportsByUrl[$this->stripPageParam($url)])) {
                continue;
            }

            $this->line("  Inspecting <fg=yellow>{$label}</> ...");

            try {
                $rawJson = $this->storage->loadRaw($path);
                $decoded = json_decode($rawJson, true, 512, JSON_THROW_ON_ERROR);
            } catch (\Throwable $e) {
                $this->warn("  [SKIP] Cannot decode {$label}: {$e->getMessage()}");
                Log::channel('feed')->warning("feed:discover schema skip [{$label}]: {$e->getMessage()}");
                continue;
            }

            $schemaReport = $this->schemaMapper->analyze($decoded, $url);
            $schemaReportsByUrl[$url] = $schemaReport;

            // Save per-endpoint schema
            $slug = preg_replace('/[^a-z0-9_]/', '_', strtolower($label));
            $this->storage->saveAnalysis("schema_{$slug}.json", $schemaReport);

            $stats = $schemaReport['stats'] ?? [];
            $this->info(sprintf(
                '  <fg=green>✓</> %s — %d fields, %d entities, depth %d',
                $label,
                $stats['total_fields']   ?? 0,
                $stats['total_entities'] ?? 0,
                $stats['max_depth']      ?? 0,
            ));
        }

        $this->newLine();

        if (empty($schemaReportsByUrl)) {
            $this->error('Schema analysis produced no results.');
            return self::FAILURE;
        }

        // ── STEP 4: Relationship analysis ─────────────────────────────────────
        $graphsByUrl = [];

        if (!$this->option('no-relationships')) {
            $this->section('STEP 4 — Relationship Analysis');

            foreach ($schemaReportsByUrl as $url => $schemaReport) {
                $this->line("  Analyzing relationships for: <fg=cyan>{$url}</>");

                $graph = $this->relationshipAnalyzer->analyze($schemaReport, $url);
                $graphsByUrl[$url] = $graph;

                $slug = preg_replace('/[^a-z0-9_]/', '_', strtolower(
                    parse_url($url, PHP_URL_HOST) . parse_url($url, PHP_URL_PATH)
                ));
                $this->storage->saveAnalysis("graph_{$slug}.json", $graph);

                $entityCount = count($graph['entities'] ?? []);
                $relCount    = count($graph['relationships'] ?? []);
                $this->info("  <fg=green>✓</> {$entityCount} entities, {$relCount} relationships");
            }

            $this->newLine();
        } else {
            $this->warn('  Relationship analysis skipped (--no-relationships).');
        }

        // ── STEP 5: Build comprehensive report.json ───────────────────────────
        $this->section('STEP 5 — Building report.json');

        $report     = $this->reportBuilder->build($manifest, $schemaReportsByUrl, $graphsByUrl);
        $reportPath = $this->storage->saveAnalysis('report.json', $report);

        $this->info("  <fg=green>✓</> Report saved: <fg=cyan>{$reportPath}</>");
        $this->newLine();

        // ── STEP 6: Console summary ───────────────────────────────────────────
        $this->section('STEP 6 — Summary');

        $this->printFullSummary($report);

        return self::SUCCESS;
    }

    // =========================================================================
    // Completeness verification (Step 2)
    // =========================================================================

    /**
     * Walk through collected files and verify counts per entity type.
     *
     * @return array<string,mixed>
     */
    private function verifyCompleteness(array $manifest): array
    {
        $completeness = [
            'total_files'     => count($manifest['collected_files']),
            'total_bytes'     => $manifest['total_bytes']   ?? 0,
            'total_mb'        => $manifest['total_size_mb'] ?? 0,
            'endpoints'       => [],
            'entity_counts'   => [],
            'region_filter'   => $manifest['region_filter'] ?? null,
            'pagination'      => $manifest['pagination_info'] ?? [],
        ];

        foreach ($manifest['collected_files'] as $file) {
            $url   = $file['url']   ?? '';
            $path  = $file['path']  ?? '';
            $label = $file['label'] ?? '';
            $bytes = $file['bytes'] ?? 0;

            if (!$path || !file_exists($path)) continue;

            try {
                $raw     = $this->storage->loadRaw($path);
                $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
            } catch (\Throwable) {
                continue;
            }

            $count = $this->countItems($decoded);

            $completeness['endpoints'][] = [
                'label'      => $label,
                'url'        => $url,
                'bytes'      => $bytes,
                'item_count' => $count,
            ];

            // Group by entity label
            if ($count > 0) {
                $clean = preg_replace('/^(page_\d+|embedded_|primary_)/', '', $label);
                $clean = trim($clean, '_');
                if ($clean) {
                    $completeness['entity_counts'][$clean] =
                        ($completeness['entity_counts'][$clean] ?? 0) + $count;
                }
            }
        }

        return $completeness;
    }

    // =========================================================================
    // Output helpers
    // =========================================================================

    private function printDiscoverySummary(array $manifest): void
    {
        $this->info(sprintf(
            '  Collected <fg=green>%d</> files from <fg=green>%d</> unique endpoints  [<fg=yellow>%.2f MB</>]',
            $manifest['total_files']      ?? 0,
            $manifest['total_endpoints']  ?? 0,
            $manifest['total_size_mb']    ?? 0,
        ));

        if (!empty($manifest['pagination_info'])) {
            $this->info('  <fg=yellow>Pagination detected</>:');
            foreach ($manifest['pagination_info'] as $url => $pag) {
                $pages = $pag['total_pages'] ?? 'N/A';
                $param = $pag['page_param']  ?? 'page';
                $this->line("    → [{$pag['type']}] ?{$param}=N  total_pages={$pages}");
            }
        }

        if (!empty($manifest['region_filter'])) {
            $rf = $manifest['region_filter'];
            $this->info('  <fg=yellow>Region filter detected</>: ' . ($rf['note'] ?? ''));
        }

        if (!empty($manifest['errors'])) {
            $this->warn('  <fg=red>Errors during discovery</>:');
            foreach ($manifest['errors'] as $err) {
                $this->line("    ✗ [{$err['label']}] {$err['error']}");
            }
        }

        $this->newLine();
    }

    private function printCompleteness(array $completeness): void
    {
        // Table: endpoint → items
        $rows = [];
        foreach ($completeness['endpoints'] as $ep) {
            $rows[] = [
                $ep['label'],
                number_format($ep['item_count']),
                $this->humanBytes($ep['bytes']),
                $ep['url'],
            ];
        }

        if ($rows) {
            $this->table(['Label', 'Items', 'Size', 'URL'], $rows);
        }

        if (!empty($completeness['entity_counts'])) {
            $this->info('  Entity totals:');
            foreach ($completeness['entity_counts'] as $entity => $count) {
                $this->line("    <fg=cyan>{$entity}</>: <fg=green>" . number_format($count) . '</> items');
            }
        }

        if ($completeness['region_filter']) {
            $this->newLine();
            $rf = $completeness['region_filter'];
            $this->warn('  Region filter: ' . ($rf['note'] ?? json_encode($rf)));
        }

        $this->newLine();
    }

    private function printFullSummary(array $report): void
    {
        $meta     = $report['meta']      ?? [];
        $entities = $report['entities']  ?? [];
        $rels     = $report['relationships'] ?? [];
        $filter   = $report['filter_candidates'] ?? [];
        $search   = $report['search_candidates'] ?? [];
        $indexes  = $report['index_recommendations'] ?? [];

        // ── Entities ─────────────────────────────────────────────────────────
        $this->info('  <fg=yellow>Entities detected</>:');
        foreach ($entities as $ent) {
            $this->line(sprintf(
                '    <fg=cyan>%-25s</> count=<fg=green>%s</>  fields=<fg=green>%d</>  id=%s',
                ($ent['table_name'] ?? 'unknown'),
                number_format($ent['count'] ?? 0),
                $ent['fields_count'] ?? 0,
                $ent['id_field'] ?? '?',
            ));
        }
        $this->newLine();

        // ── Suggested DB tables ───────────────────────────────────────────────
        $order = $rels['suggested_table_order'] ?? [];
        if ($order) {
            $this->info('  <fg=yellow>Suggested table creation order</>:');
            foreach ($order as $i => $tbl) {
                $this->line('    ' . ($i + 1) . '. ' . $tbl);
            }
            $this->newLine();
        }

        // ── Primary keys ──────────────────────────────────────────────────────
        $this->info('  <fg=yellow>Suggested primary keys</>:');
        foreach ($entities as $ent) {
            $id = $ent['id_field'] ? $this->lastSegment($ent['id_field']) : 'id';
            $this->line("    {$ent['table_name']}.{$id}");
        }
        $this->newLine();

        // ── Foreign keys ──────────────────────────────────────────────────────
        $fks = $rels['foreign_keys'] ?? [];
        if ($fks) {
            $this->info('  <fg=yellow>Detected foreign keys</>:');
            foreach ($fks as $fk) {
                $from = $fk['from_entity'] ?? '';
                $col  = $fk['fk_field']    ?? '';
                $to   = $fk['to_entity']   ?? '';
                $toId = $fk['to_id_field'] ?? 'id';
                $conf = $fk['confidence']  ?? '';
                $this->line("    <fg=cyan>{$from}</>.{$col} → <fg=green>{$to}</>.{$toId}  [confidence={$conf}]");
            }
            $this->newLine();
        }

        // ── Suggested indexes for filtering ───────────────────────────────────
        $filterIndexes = array_filter($indexes, fn($i) => str_contains($i['type'], 'filter'));
        if ($filterIndexes) {
            $this->info('  <fg=yellow>Suggested filter indexes</>:');
            foreach ($filterIndexes as $idx) {
                $this->line("    {$idx['table']}.{$idx['column']}  [{$idx['type']}]");
            }
            $this->newLine();
        }

        // ── Full-text fields ──────────────────────────────────────────────────
        $textFields = $search['text_fields'] ?? [];
        if ($textFields) {
            $this->info('  <fg=yellow>Suggested FULLTEXT fields</>:');
            foreach (array_slice($textFields, 0, 10) as $tf) {
                $this->line("    {$tf['path']}");
            }
            $this->newLine();
        }

        // ── Geo fields ────────────────────────────────────────────────────────
        $geoFields = $search['geo_fields'] ?? [];
        if ($geoFields) {
            $this->info('  <fg=yellow>Suggested geo / SPATIAL fields</>:');
            foreach (array_slice($geoFields, 0, 10) as $gf) {
                $this->line("    {$gf['path']}  [type={$gf['type']}]");
            }
            $this->newLine();
        }

        // ── Filter availability ───────────────────────────────────────────────
        $this->info('  <fg=yellow>Filter candidates</>:');
        foreach (['price', 'area', 'rooms', 'region', 'metro', 'finishings', 'completion_date'] as $f) {
            $avail = ($filter[$f] ?? false) ? '<fg=green>YES</>' : '<fg=red>NO</>';
            $this->line("    {$f}: {$avail}");
        }
        $this->newLine();

        // ── Report location ───────────────────────────────────────────────────
        $reportPath = $this->storage->analysisPath('report.json');
        $this->info("  <fg=green>Full report</> → <fg=cyan>{$reportPath}</>");
        $this->newLine();

        $this->info('  <fg=green>✓ Discovery complete.</>');
        $this->newLine();
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function countItems(array $decoded): int
    {
        if (array_is_list($decoded)) {
            return count($decoded);
        }

        // Find the largest list value
        $max = 0;
        foreach ($decoded as $v) {
            if (is_array($v) && array_is_list($v)) {
                $max = max($max, count($v));
            }
        }

        return $max;
    }

    private function stripPageParam(string $url): string
    {
        return preg_replace('/([?&])(page|p|pg)=\d+/', '', $url) ?? $url;
    }

    private function lastSegment(string $path): string
    {
        $clean = str_replace(['[]', '[*]'], '', $path);
        $parts = array_filter(explode('.', $clean));
        return (string) (end($parts) ?: $path);
    }

    private function humanBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return round($bytes / (1024 * 1024), 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }

    private function section(string $title): void
    {
        $this->newLine();
        $this->info("╔─ {$title} " . str_repeat('─', max(0, 45 - strlen($title))) . '╗');
        $this->newLine();
    }

    private function banner(): void
    {
        $this->newLine();
        $this->info('╔══════════════════════════════════════════════╗');
        $this->info('║   LIVEGRID — Feed Discovery & Analysis       ║');
        $this->info('║   NO DB · NO MIGRATIONS · RAW + ANALYSIS     ║');
        $this->info('╚══════════════════════════════════════════════╝');
        $this->newLine();
    }
}
