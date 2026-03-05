<?php

namespace App\Console\Commands;

use App\Services\Feed\FeedFileStorage;
use App\Services\Feed\FeedRelationshipAnalyzer;
use App\Services\Feed\FeedSchemaMapper;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Artisan command: php artisan feed:inspect
 *
 * Reads raw JSON files collected by feed:collect and produces:
 *
 *   storage/feed/analysis/
 *   ├── {md5_url}_schema.json         ← per-endpoint schema
 *   ├── {md5_url}_relationships.json  ← per-endpoint entity graph
 *   ├── report.json                   ← combined report (all endpoints)
 *   └── relationships.json            ← combined entity graph
 *
 * Pipeline:
 *   FeedFileStorage (read raw) →
 *   FeedSchemaMapper (recursive traverse) →
 *   FeedRelationshipAnalyzer (entity graph) →
 *   FeedFileStorage (write JSON)
 *
 * NO database. NO Eloquent. Pure file I/O + in-memory analysis.
 *
 * Usage:
 *   php artisan feed:inspect                           # all latest raw files
 *   php artisan feed:inspect --url=https://...         # specific endpoint
 *   php artisan feed:inspect --file=/abs/path.json     # specific raw file
 *   php artisan feed:inspect --no-relationships        # skip relationship analysis
 *   php artisan feed:inspect --dump-entities           # print entity list to console
 *   php artisan feed:inspect --dump-fields             # print top 50 fields
 */
class FeedInspectCommand extends Command
{
    protected $signature = 'feed:inspect
        {--url=                : Inspect latest raw file for a specific URL}
        {--file=               : Inspect a specific raw JSON file (absolute path)}
        {--no-relationships    : Skip relationship analysis}
        {--dump-entities       : Print detected entities to console}
        {--dump-fields         : Print top 50 fields to console (sorted by depth)}
        {--dump-enums          : Print enum candidate fields}
        {--sample-size=        : Override array sample size for this run}';

    protected $description = 'Analyze collected raw feed JSON → schema report + entity graph in storage/feed/analysis/';

    // =========================================================================
    // Entry point
    // =========================================================================

    public function handle(
        FeedFileStorage $storage,
        FeedSchemaMapper $mapper,
        FeedRelationshipAnalyzer $relAnalyzer,
    ): int {
        $this->printBanner();

        // ── Override sample size if provided ──────────────────────────────────
        if ($sampleSize = $this->option('sample-size')) {
            config(['feed.schema.array_sample_size' => (int) $sampleSize]);
        }

        // ── Resolve target files ───────────────────────────────────────────────
        $targets = $this->resolveTargets($storage);

        if (empty($targets)) {
            $this->error('No raw feed files found.');
            $this->line('  Run first: <comment>php artisan feed:collect</comment>');
            return self::FAILURE;
        }

        // ── Process each target ────────────────────────────────────────────────
        $exitCode     = self::SUCCESS;
        $allSchemas   = [];
        $allRelations = [];
        $allPaths     = [];

        foreach ($targets as $index => $target) {
            $total = count($targets);
            $num   = $index + 1;

            $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            $this->info(" Inspecting [{$num}/{$total}]");
            $this->line("  URL:  {$target['url']}");
            $this->line("  File: {$target['path']}");
            $this->newLine();

            try {
                [$schema, $relationships, $schemaPath, $relPath] =
                    $this->inspectTarget($target, $storage, $mapper, $relAnalyzer);

                $allSchemas[]   = $schema;
                $allRelations[] = $relationships;
                $allPaths[]     = ['schema' => $schemaPath, 'rel' => $relPath];

                $this->renderSchemaStats($schema, $target['url']);

                if ($this->option('dump-entities')) {
                    $this->dumpEntities($schema);
                }

                if ($this->option('dump-fields')) {
                    $this->dumpFields($schema);
                }

                if ($this->option('dump-enums')) {
                    $this->dumpEnums($schema);
                }

            } catch (\Throwable $e) {
                $exitCode = self::FAILURE;
                $this->error("  ✗ FAILED: " . $e->getMessage());
                Log::channel('feed')->error("feed:inspect failed for {$target['url']}: " . $e->getMessage(), [
                    'file'      => $target['path'],
                    'exception' => $e,
                ]);
            }

            $this->newLine();
        }

        // ── Write combined reports ─────────────────────────────────────────────
        if (count($allSchemas) > 0) {
            $this->writeCombinedReports($storage, $allSchemas, $allRelations);
        }

        // ── Final summary ──────────────────────────────────────────────────────
        $this->info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        $this->info(' Output files:');
        foreach ($allPaths as $p) {
            $this->line("  <info>✓</info> " . $p['schema']);
            if ($p['rel']) {
                $this->line("  <info>✓</info> " . $p['rel']);
            }
        }
        $this->line("  <info>✓</info> " . $storage->analysisPath('report.json'));
        $this->line("  <info>✓</info> " . $storage->analysisPath('relationships.json'));

        return $exitCode;
    }

    // =========================================================================
    // Core inspection
    // =========================================================================

    /**
     * Run schema mapper + relationship analyzer for one target.
     *
     * @return array{0:array, 1:array|null, 2:string, 3:string|null}
     *   [schema, relationships, schemaFilePath, relFilePath]
     */
    private function inspectTarget(
        array $target,
        FeedFileStorage $storage,
        FeedSchemaMapper $mapper,
        FeedRelationshipAnalyzer $relAnalyzer,
    ): array {
        $url = $target['url'];

        // ── Load raw JSON ─────────────────────────────────────────────────────
        $this->line('  <comment>→ Loading raw JSON...</comment>');
        $raw     = $storage->loadRaw($target['path']);
        $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        $rawSize = strlen($raw);

        $this->line(sprintf(
            '  Payload: %s  (%s bytes)',
            $this->humanSize($rawSize),
            number_format($rawSize)
        ));

        // ── Schema analysis ────────────────────────────────────────────────────
        $this->line('  <comment>→ Building schema map (recursive traversal)...</comment>');
        $startMs = microtime(true);
        $schema  = $mapper->analyze($decoded, $url);
        $elapsed = round((microtime(true) - $startMs) * 1000);

        $this->line(sprintf(
            '  Schema:  %d unique paths, %d entities — in %dms',
            $schema['stats']['total_fields'] ?? 0,
            $schema['stats']['total_entities'] ?? 0,
            $elapsed,
        ));

        // Add raw file metadata to schema report
        $schema['meta']['raw_file']         = $target['path'];
        $schema['meta']['raw_bytes']        = $rawSize;
        $schema['meta']['raw_human_size']   = $this->humanSize($rawSize);

        // Save per-endpoint schema
        $schemaName = md5($url) . '_schema.json';
        $schemaPath = $storage->saveAnalysis($schemaName, $schema);

        // ── Relationship analysis ──────────────────────────────────────────────
        $relPath      = null;
        $relationships = null;

        if (!$this->option('no-relationships')) {
            $this->line('  <comment>→ Analyzing entity relationships...</comment>');
            $relationships = $relAnalyzer->analyze($schema, $url);

            $relName = md5($url) . '_relationships.json';
            $relPath = $storage->saveAnalysis($relName, $relationships);

            $totalRels = count($relationships['relationships'] ?? []);
            $entities  = count($relationships['entities'] ?? []);
            $this->line("  Graph:   {$entities} entities, {$totalRels} relationships");
        }

        return [$schema, $relationships, $schemaPath, $relPath];
    }

    /**
     * Write the combined report and relationships files.
     *
     * @param array<int, array<string,mixed>> $schemas
     * @param array<int, array<string,mixed>|null> $relations
     */
    private function writeCombinedReports(
        FeedFileStorage $storage,
        array $schemas,
        array $relations,
    ): void {
        $this->line('  <comment>→ Writing combined reports...</comment>');

        // Combined schema report
        $combined = [
            'meta' => [
                'generated_at'   => now()->toIso8601String(),
                'endpoint_count' => count($schemas),
            ],
            'endpoints' => [],
        ];

        foreach ($schemas as $schema) {
            $url = $schema['meta']['source_url'] ?? 'unknown';
            $combined['endpoints'][$url] = $schema;
        }

        $storage->saveAnalysis('report.json', $combined);

        // Combined relationships
        $combinedRel = [
            'meta' => [
                'generated_at'   => now()->toIso8601String(),
                'endpoint_count' => count($relations),
            ],
            'endpoints' => [],
        ];

        foreach ($relations as $rel) {
            if (!$rel) continue;
            $url = $rel['meta']['source_url'] ?? 'unknown';
            $combinedRel['endpoints'][$url] = $rel;
        }

        $storage->saveAnalysis('relationships.json', $combinedRel);
    }

    // =========================================================================
    // Console rendering
    // =========================================================================

    private function renderSchemaStats(array $schema, string $url): void
    {
        $stats = $schema['stats'] ?? [];

        $this->table([], [
            ['Total field paths',  $stats['total_fields']       ?? 0],
            ['Entities detected',  $stats['total_entities']     ?? 0],
            ['Max nesting depth',  $stats['max_depth']          ?? 0],
            ['ID fields',          $stats['id_fields_count']    ?? 0],
            ['Nullable fields',    $stats['nullable_fields']    ?? 0],
            ['Enum candidates',    $stats['enum_candidates']    ?? 0],
            ['Analysis time',      ($schema['meta']['analysis_seconds'] ?? 0) . 's'],
        ]);

        $dist = $stats['type_distribution'] ?? [];
        if (!empty($dist)) {
            $this->line('  <comment>Type distribution:</comment>');
            $max = max(array_values($dist));
            foreach ($dist as $type => $count) {
                $bar = str_repeat('█', min((int)($count / $max * 25), 25));
                $this->line(sprintf('    %-8s %5d  %s', $type, $count, $bar));
            }
            $this->newLine();
        }
    }

    private function dumpEntities(array $schema): void
    {
        $entities = $schema['entities'] ?? [];

        if (empty($entities)) {
            $this->warn('  No entities detected.');
            return;
        }

        $this->line('  <comment>Detected entities (future DB tables):</comment>');
        $rows = [];
        foreach ($entities as $path => $e) {
            $rows[] = [
                $path,
                $e['item_count'] ?? 0,
                $e['id_field'] ?? '—',
                $e['parent'] ?? '— (root)',
                count($e['direct_fields'] ?? []),
                count($e['foreign_keys'] ?? []),
            ];
        }

        $this->table(
            ['Entity Path', 'Items', 'ID Field', 'Parent', 'Fields', 'FKs'],
            $rows
        );
    }

    private function dumpFields(array $schema): void
    {
        $fields = $schema['fields'] ?? [];

        if (empty($fields)) {
            return;
        }

        // Sort by depth then by path
        uasort($fields, fn($a, $b) =>
            $a['depth'] <=> $b['depth'] ?: strcmp(
                array_search($a, $fields),
                array_search($b, $fields)
            )
        );

        $top  = array_slice($fields, 0, 50, true);
        $rows = [];

        foreach ($top as $path => $f) {
            $rows[] = [
                mb_substr($path, 0, 55),
                $f['type'],
                $f['depth'],
                $f['occurrences'],
                $f['is_nullable'] ? 'nullable' : '',
                $f['is_id_field'] ? '★ id' : '',
                mb_substr((string)($f['example'] ?? ''), 0, 30),
            ];
        }

        $this->line('  <comment>Top 50 fields (by depth):</comment>');
        $this->table(
            ['Path', 'Type', 'Depth', 'Occ.', 'Nullable', 'ID?', 'Example'],
            $rows
        );
    }

    private function dumpEnums(array $schema): void
    {
        $candidates = $schema['enum_candidates'] ?? [];
        $fields     = $schema['fields'] ?? [];

        if (empty($candidates)) {
            $this->warn('  No enum candidate fields found.');
            return;
        }

        $this->line('  <comment>Enum candidate fields (few distinct values):</comment>');
        $rows = [];

        foreach ($candidates as $path) {
            $f      = $fields[$path] ?? [];
            $values = $f['enum_values'] ?? [];
            $valStr = implode(' | ', array_map(
                fn($v, $c) => "{$v}({$c})",
                array_keys($values),
                array_values($values)
            ));
            $rows[] = [
                mb_substr($path, 0, 50),
                $f['type'] ?? '?',
                count($values),
                mb_substr($valStr, 0, 60),
            ];
        }

        $this->table(['Path', 'Type', 'Distinct', 'Values (count)'], $rows);
    }

    // =========================================================================
    // Target resolution
    // =========================================================================

    /**
     * Resolve which raw files to inspect.
     *
     * Priority:
     *   1. --file= (specific absolute path)
     *   2. --url= (latest raw file for that URL)
     *   3. All latest raw files (default)
     *
     * @return array<int, array{url:string, path:string}>
     */
    private function resolveTargets(FeedFileStorage $storage): array
    {
        // Specific file
        if ($filePath = $this->option('file')) {
            if (!file_exists($filePath)) {
                throw new \RuntimeException("File not found: {$filePath}");
            }
            return [['url' => 'file://' . basename($filePath), 'path' => $filePath]];
        }

        // Specific URL
        if ($url = $this->option('url')) {
            $path = $storage->getLatestRawPath($url);
            if (!$path) {
                throw new \RuntimeException("No raw file found for URL: {$url}. Run feed:collect first.");
            }
            return [['url' => $url, 'path' => $path]];
        }

        // All latest raw files
        return $storage->getAllLatestRawFiles();
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private function humanSize(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) return round($bytes / (1024 * 1024), 2) . ' MB';
        if ($bytes >= 1024) return round($bytes / 1024, 1) . ' KB';
        return $bytes . ' B';
    }

    private function printBanner(): void
    {
        $this->newLine();
        $this->line('<info>╔══════════════════════════════════════════╗</info>');
        $this->line('<info>║       LIVEGRID — Feed Inspector          ║</info>');
        $this->line('<info>╚══════════════════════════════════════════╝</info>');
        $this->newLine();
    }
}
