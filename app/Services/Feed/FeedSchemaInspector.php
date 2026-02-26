<?php

namespace App\Services\Feed;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Recursive JSON schema inspector.
 *
 * Traverses the entire decoded feed payload and builds a field map:
 *   path → type, occurrences, example_value, depth, null_count
 *
 * Results are upserted into feed_schema_analysis.
 * Duplicate paths (same source_url + path) have occurrences summed
 * so the table accumulates data across multiple runs.
 *
 * Output format example:
 *   path="projects[].id"                     type="int"     depth=2  occurrences=47
 *   path="projects[].developer.name"         type="string"  depth=3  occurrences=47
 *   path="projects[].buildings[].apartments[].area"  type="float"   depth=5
 *
 * Config: config/feed.schema.*
 *
 * PERFORMANCE NOTE:
 *   For large feeds (50k+ apartments), array_sample_size limits how many
 *   array items are recursed into. This trades completeness for speed.
 *   Increase FEED_SCHEMA_ARRAY_SAMPLE in .env for more thorough analysis.
 */
final class FeedSchemaInspector
{
    private int $maxDepth;
    private int $arraySampleSize;
    private int $exampleMaxLength;

    /**
     * Internal accumulator: path → [type, occurrences, null_count, example, depth]
     *
     * @var array<string, array{type:string, occurrences:int, null_count:int, example:mixed, depth:int}>
     */
    private array $fieldMap = [];

    public function __construct()
    {
        $cfg = config('feed.schema', []);

        $this->maxDepth        = (int)  ($cfg['max_depth']          ?? 10);
        $this->arraySampleSize = (int)  ($cfg['array_sample_size']   ?? 5);
        $this->exampleMaxLength= (int)  ($cfg['example_max_length']  ?? 200);
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Inspect the full decoded payload and persist results.
     *
     * @param  string              $sourceUrl  Feed endpoint URL (FK reference)
     * @param  array<string,mixed> $data       Decoded JSON payload
     * @param  bool                $reset      Truncate existing rows for this URL first
     * @return int                 Number of unique field paths discovered
     */
    public function inspect(string $sourceUrl, array $data, bool $reset = false): int
    {
        $this->fieldMap = [];

        Log::channel('feed')->info('FeedSchemaInspector: starting recursive traversal', [
            'source_url'        => $sourceUrl,
            'reset'             => $reset,
            'max_depth'         => $this->maxDepth,
            'array_sample_size' => $this->arraySampleSize,
        ]);

        // Traverse
        $this->traverse($data, '', 0);

        $uniquePaths = count($this->fieldMap);

        Log::channel('feed')->info("FeedSchemaInspector: traversal complete — {$uniquePaths} unique paths found");

        // Persist
        if ($reset) {
            DB::table('feed_schema_analysis')
                ->where('source_url', $sourceUrl)
                ->delete();
        }

        $this->persistFieldMap($sourceUrl);

        Log::channel('feed')->info("FeedSchemaInspector: {$uniquePaths} paths written to feed_schema_analysis");

        return $uniquePaths;
    }

    /**
     * Return the in-memory field map (available after inspect() call).
     *
     * @return array<string, array{type:string, occurrences:int, null_count:int, example:mixed, depth:int}>
     */
    public function getFieldMap(): array
    {
        return $this->fieldMap;
    }

    // =========================================================================
    // Core traversal algorithm
    // =========================================================================

    /**
     * Recursively walk a JSON value at a given dot-notation path.
     *
     * @param  mixed  $value  Current value (scalar, array, or null)
     * @param  string $path   Accumulated dot-notation path (empty = root)
     * @param  int    $depth  Current recursion depth
     */
    private function traverse(mixed $value, string $path, int $depth): void
    {
        // Guard: max depth
        if ($depth > $this->maxDepth) {
            return;
        }

        $type = $this->detectType($value);

        // Register this field
        $this->recordField($path, $type, $value, $depth);

        // Recurse into objects and arrays
        if (is_array($value)) {
            if ($this->isSequentialArray($value)) {
                // Sequential array (list): e.g. projects[]
                $this->traverseArray($value, $path, $depth);
            } else {
                // Associative array (object): e.g. developer.name
                $this->traverseObject($value, $path, $depth);
            }
        }
    }

    /**
     * Traverse an associative array (JSON object).
     *
     * @param  array<string,mixed> $object
     */
    private function traverseObject(array $object, string $path, int $depth): void
    {
        foreach ($object as $key => $val) {
            $childPath = $path === '' ? (string) $key : $path . '.' . $key;
            $this->traverse($val, $childPath, $depth + 1);
        }
    }

    /**
     * Traverse a sequential array (JSON list), sampling up to array_sample_size items.
     *
     * Why sample? A feed with 50k apartments would take minutes to fully traverse
     * and produce no extra insight — apartment #1 and apartment #50k have the same schema.
     *
     * @param  array<int,mixed> $list
     */
    private function traverseArray(array $list, string $path, int $depth): void
    {
        $sample = array_slice($list, 0, $this->arraySampleSize);
        $arrayPath = $path !== '' ? $path . '[]' : '[]';

        foreach ($sample as $item) {
            // Each item contributes to the path "path[]"
            if (is_array($item)) {
                if ($this->isSequentialArray($item)) {
                    $this->traverseArray($item, $arrayPath, $depth + 1);
                } else {
                    $this->traverseObject($item, $arrayPath, $depth + 1);
                }
            }
            // Scalar items inside arrays are tracked at the parent path level
        }
    }

    // =========================================================================
    // Field recording
    // =========================================================================

    /**
     * Record a field path into the in-memory accumulator.
     * If path already exists, merge types and increment counters.
     *
     * @param mixed $value
     */
    private function recordField(string $path, string $type, mixed $value, int $depth): void
    {
        if ($path === '') {
            $path = '__root__';
        }

        if (!isset($this->fieldMap[$path])) {
            $this->fieldMap[$path] = [
                'type'        => $type,
                'occurrences' => 0,
                'null_count'  => 0,
                'example'     => null,
                'depth'       => $depth,
            ];
        }

        $entry = &$this->fieldMap[$path];
        $entry['occurrences']++;

        if ($value === null) {
            $entry['null_count']++;
        }

        // Merge type: if different types observed → mark as "mixed"
        if ($entry['type'] !== $type && $entry['type'] !== 'mixed') {
            $entry['type'] = 'mixed';
        }

        // Store first non-null example
        if ($entry['example'] === null && $value !== null && !is_array($value)) {
            $entry['example'] = $this->formatExample($value);
        }
    }

    // =========================================================================
    // DB persistence
    // =========================================================================

    /**
     * Upsert all discovered fields into feed_schema_analysis.
     * Uses chunked inserts for performance with large schemas.
     */
    private function persistFieldMap(string $sourceUrl): void
    {
        $now   = now()->toDateTimeString();
        $rows  = [];

        foreach ($this->fieldMap as $path => $entry) {
            $rows[] = [
                'source_url'       => $sourceUrl,
                'path'             => $path,
                'type'             => $entry['type'],
                'occurrences'      => $entry['occurrences'],
                'null_count'       => $entry['null_count'],
                'example_value'    => is_string($entry['example'])
                    ? mb_substr($entry['example'], 0, 255)
                    : null,
                'depth'            => $entry['depth'],
                'is_always_present'=> false, // Updated in post-processing pass
                'created_at'       => $now,
                'updated_at'       => $now,
            ];
        }

        // Chunk upserts to avoid hitting max_allowed_packet on large schemas
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('feed_schema_analysis')->upsert(
                $chunk,
                ['source_url', 'path'],                          // unique keys
                ['type', 'occurrences', 'null_count', 'example_value', 'updated_at'] // columns to update on duplicate
            );
        }

        // Post-processing: mark fields that always appear (null_count == 0)
        DB::table('feed_schema_analysis')
            ->where('source_url', $sourceUrl)
            ->where('null_count', 0)
            ->update(['is_always_present' => true, 'updated_at' => $now]);
    }

    // =========================================================================
    // Type detection
    // =========================================================================

    /**
     * Determine the JSON value type as a string label.
     * Returns: string | int | float | bool | array | object | null
     */
    private function detectType(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }

        if (is_bool($value)) {
            return 'bool';
        }

        if (is_int($value)) {
            return 'int';
        }

        if (is_float($value)) {
            return 'float';
        }

        if (is_string($value)) {
            return 'string';
        }

        if (is_array($value)) {
            return $this->isSequentialArray($value) ? 'array' : 'object';
        }

        return 'unknown';
    }

    /**
     * Check if an array is a sequential list (0,1,2…) vs associative object.
     */
    private function isSequentialArray(array $arr): bool
    {
        if (empty($arr)) {
            return true;
        }

        return array_is_list($arr);
    }

    /**
     * Format a scalar value as a string example, truncated to max length.
     */
    private function formatExample(mixed $value): string
    {
        $str = match (true) {
            is_bool($value) => $value ? 'true' : 'false',
            default         => (string) $value,
        };

        return mb_substr($str, 0, $this->exampleMaxLength);
    }
}
