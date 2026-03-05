<?php

namespace App\Services\Feed;

/**
 * Pure in-memory recursive JSON schema mapper.
 *
 * NO database. NO Eloquent. NO side effects.
 *
 * Input:  decoded JSON array (from feed payload)
 * Output: complete schema report as a PHP array → serialized to JSON by caller
 *
 * What it discovers:
 *  - Every unique dot-notation field path
 *  - Value type at each path (string|int|float|bool|array|object|null|mixed)
 *  - Occurrence count (how many times this path was seen)
 *  - Null count (how often it was null vs present)
 *  - Example value (first non-null scalar)
 *  - Nesting depth
 *  - Entities: paths where an array-of-objects lives (these become DB tables later)
 *  - ID fields: paths that look like identifiers (id, *_id, *Id)
 *  - Enum candidates: string fields with ≤ N distinct values
 *
 * Config used:
 *   feed.schema.max_depth          (default: 10)
 *   feed.schema.array_sample_size  (default: 20)
 *   feed.schema.example_max_length (default: 200)
 *   feed.schema.enum_threshold     (default: 20, max distinct values to be considered enum)
 */
final class FeedSchemaMapper
{
    private int $maxDepth;
    private int $arraySampleSize;
    private int $exampleMaxLen;
    private int $enumThreshold;

    /**
     * fieldMap: path → field descriptor
     *
     * @var array<string, array{
     *   type: string,
     *   occurrences: int,
     *   null_count: int,
     *   example: string|null,
     *   depth: int,
     *   types_seen: array<string, int>,
     *   distinct_values: array<string, int>
     * }>
     */
    private array $fieldMap = [];

    /**
     * Entity registry: paths that are arrays-of-objects.
     * key = path (e.g. "projects[]"), value = occurrence count
     *
     * @var array<string, int>
     */
    private array $entities = [];

    public function __construct()
    {
        $cfg = config('feed.schema', []);

        $this->maxDepth        = (int) ($cfg['max_depth']          ?? 10);
        $this->arraySampleSize = (int) ($cfg['array_sample_size']  ?? 20);
        $this->exampleMaxLen   = (int) ($cfg['example_max_length'] ?? 200);
        $this->enumThreshold   = (int) ($cfg['enum_threshold']     ?? 20);
    }

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Analyze a decoded JSON payload and return the complete schema report.
     *
     * @param  array<string,mixed> $data       Full decoded JSON
     * @param  string              $sourceUrl  Endpoint URL (for metadata only)
     * @return array<string,mixed>             Schema report array
     */
    public function analyze(array $data, string $sourceUrl): array
    {
        $this->fieldMap = [];
        $this->entities = [];

        $startedAt = microtime(true);

        // ── Traverse ──────────────────────────────────────────────────────────
        if (array_is_list($data)) {
            // Root is a list — treat root as an entity
            $this->registerEntity('[]', count($data));
            $sample = array_slice($data, 0, $this->arraySampleSize);
            foreach ($sample as $item) {
                if (is_array($item) && !array_is_list($item)) {
                    $this->traverseObject($item, '[]', 1);
                }
            }
        } else {
            $this->traverseObject($data, '', 0);
        }

        $elapsed = round(microtime(true) - $startedAt, 4);

        // ── Post-processing ───────────────────────────────────────────────────
        $this->resolveTypes();

        return $this->buildReport($data, $sourceUrl, $elapsed);
    }

    // =========================================================================
    // Traversal
    // =========================================================================

    /**
     * Traverse an associative array (JSON object).
     *
     * @param array<string,mixed> $object
     */
    private function traverseObject(array $object, string $path, int $depth): void
    {
        if ($depth > $this->maxDepth) {
            return;
        }

        foreach ($object as $key => $value) {
            $childPath = $path === '' ? (string) $key : $path . '.' . $key;
            $this->traverseValue($value, $childPath, $depth + 1);
        }
    }

    /**
     * Traverse a sequential array (JSON list).
     * Samples up to arraySampleSize items and recurses into each.
     *
     * @param array<int,mixed> $list
     */
    private function traverseList(array $list, string $path, int $depth): void
    {
        if ($depth > $this->maxDepth) {
            return;
        }

        $itemCount  = count($list);
        $arrayPath  = $path . '[]';
        $sample     = array_slice($list, 0, $this->arraySampleSize);

        foreach ($sample as $item) {
            $this->traverseValue($item, $arrayPath, $depth + 1);
        }

        // If the array contains objects → it's an entity
        $firstItem = $list[0] ?? null;
        if (is_array($firstItem) && !array_is_list($firstItem)) {
            $this->registerEntity($arrayPath, $itemCount);
        }
    }

    /**
     * Traverse a single value at a known path.
     */
    private function traverseValue(mixed $value, string $path, int $depth): void
    {
        $type = $this->detectType($value);

        $this->recordField($path, $type, $value, $depth);

        if (!is_array($value)) {
            return;
        }

        if (array_is_list($value)) {
            $this->traverseList($value, $path, $depth);
        } else {
            $this->traverseObject($value, $path, $depth);
        }
    }

    // =========================================================================
    // Field recording
    // =========================================================================

    /**
     * Record a single field observation into the field map.
     */
    private function recordField(string $path, string $type, mixed $value, int $depth): void
    {
        if (!isset($this->fieldMap[$path])) {
            $this->fieldMap[$path] = [
                'type'           => $type,
                'occurrences'    => 0,
                'null_count'     => 0,
                'example'        => null,
                'depth'          => $depth,
                'types_seen'     => [],
                'distinct_values'=> [],
            ];
        }

        $f = &$this->fieldMap[$path];
        $f['occurrences']++;
        $f['types_seen'][$type] = ($f['types_seen'][$type] ?? 0) + 1;

        if ($value === null) {
            $f['null_count']++;
        }

        // Capture example (first non-null scalar)
        if ($f['example'] === null && $value !== null && !is_array($value)) {
            $f['example'] = mb_substr($this->scalarToString($value), 0, $this->exampleMaxLen);
        }

        // Track distinct values for enum candidate detection (scalars only)
        if (!is_array($value) && $value !== null) {
            $strVal = mb_substr($this->scalarToString($value), 0, 100);
            // Only track if we haven't exceeded the threshold (saves memory)
            if (count($f['distinct_values']) <= $this->enumThreshold) {
                $f['distinct_values'][$strVal] = ($f['distinct_values'][$strVal] ?? 0) + 1;
            }
        }
    }

    /**
     * Register a path as an entity (array-of-objects = future DB table).
     */
    private function registerEntity(string $arrayPath, int $count): void
    {
        // Keep the highest count seen for this entity path
        if (!isset($this->entities[$arrayPath]) || $count > $this->entities[$arrayPath]) {
            $this->entities[$arrayPath] = $count;
        }
    }

    // =========================================================================
    // Post-processing
    // =========================================================================

    /**
     * Resolve each field's final type.
     * If multiple types were observed → 'mixed'.
     * If only one type → use it.
     * Exception: null + one_other → keep the other type, flag is_nullable.
     */
    private function resolveTypes(): void
    {
        foreach ($this->fieldMap as &$f) {
            $typesSeen  = $f['types_seen'];
            $nonNull    = array_filter($typesSeen, fn($t) => $t !== 'null', ARRAY_FILTER_USE_KEY);

            if (count($nonNull) === 1) {
                $f['type'] = array_key_first($nonNull);
            } elseif (count($nonNull) > 1) {
                $f['type'] = 'mixed';
            }
            // If only null was seen, type stays 'null'
        }
    }

    // =========================================================================
    // Report builder
    // =========================================================================

    /**
     * Assemble the final report array from fieldMap + entities.
     *
     * @param  array<string,mixed> $data
     * @return array<string,mixed>
     */
    private function buildReport(array $data, string $sourceUrl, float $elapsed): array
    {
        // ── Stats ─────────────────────────────────────────────────────────────
        $typeDistribution = [];
        $maxDepth = 0;

        foreach ($this->fieldMap as $f) {
            $typeDistribution[$f['type']] = ($typeDistribution[$f['type']] ?? 0) + 1;
            if ($f['depth'] > $maxDepth) {
                $maxDepth = $f['depth'];
            }
        }

        arsort($typeDistribution);

        // ── Fields (clean output — remove internal tracking keys) ─────────────
        $fields = [];
        foreach ($this->fieldMap as $path => $f) {
            $isNullable  = $f['null_count'] > 0;
            $totalSeen   = $f['occurrences'];
            $nullRatio   = $totalSeen > 0 ? round($f['null_count'] / $totalSeen, 4) : 0;
            $isIdField   = $this->detectIsIdField($path);
            $enumValues  = $this->extractEnumValues($f);

            $fields[$path] = [
                'type'              => $f['type'],
                'depth'             => $f['depth'],
                'occurrences'       => $f['occurrences'],
                'null_count'        => $f['null_count'],
                'null_ratio'        => $nullRatio,
                'is_nullable'       => $isNullable,
                'is_always_present' => $f['null_count'] === 0,
                'is_id_field'       => $isIdField,
                'example'           => $f['example'],
                'enum_values'       => $enumValues,
            ];
        }

        // ── Entities (array-of-objects detected) ──────────────────────────────
        $entities = $this->buildEntityDescriptors($fields);

        // ── Special field groups ───────────────────────────────────────────────
        $idFields      = array_keys(array_filter($fields, fn($f) => $f['is_id_field']));
        $nullableFields= array_keys(array_filter($fields, fn($f) => $f['is_nullable']));
        $alwaysPresent = array_keys(array_filter($fields, fn($f) => $f['is_always_present']));
        $enumCandidates= array_keys(array_filter($fields, fn($f) => !empty($f['enum_values'])));

        // ── Root structure ─────────────────────────────────────────────────────
        $rootKeys = array_is_list($data) ? [] : array_keys($data);

        return [
            'meta' => [
                'generated_at'       => now()->toIso8601String(),
                'source_url'         => $sourceUrl,
                'analysis_seconds'   => $elapsed,
                'max_depth_reached'  => $maxDepth,
                'array_sample_size'  => $this->arraySampleSize,
            ],
            'stats' => [
                'total_fields'       => count($this->fieldMap),
                'total_entities'     => count($entities),
                'max_depth'          => $maxDepth,
                'id_fields_count'    => count($idFields),
                'nullable_fields'    => count($nullableFields),
                'enum_candidates'    => count($enumCandidates),
                'type_distribution'  => $typeDistribution,
                'root_is_list'       => array_is_list($data),
                'root_keys'          => $rootKeys,
            ],
            'entities'         => $entities,
            'fields'           => $fields,
            'id_fields'        => $idFields,
            'nullable_fields'  => $nullableFields,
            'always_present'   => $alwaysPresent,
            'enum_candidates'  => $enumCandidates,
        ];
    }

    /**
     * Build entity descriptors from the field map and entity registry.
     *
     * An entity descriptor includes:
     *   - The entity path (e.g. "projects[].buildings[]")
     *   - Estimated item count (from the largest sample seen)
     *   - Its direct fields (one level deep)
     *   - ID field (if found)
     *   - Foreign key fields (fields ending in _id pointing to other entities)
     *   - Parent entity (inferred from path nesting)
     *
     * @param  array<string, array<string,mixed>> $fields  Cleaned fields map
     * @return array<string, array<string,mixed>>
     */
    private function buildEntityDescriptors(array $fields): array
    {
        $descriptors = [];

        foreach ($this->entities as $entityPath => $itemCount) {
            // Direct fields of this entity: paths that are exactly one level deeper
            // e.g. entity="projects[]" → direct fields start with "projects[]."
            $directFields = $this->getDirectFields($entityPath, $fields);

            // Find the primary key field
            $idField = $this->findEntityIdField($entityPath, $directFields);

            // Find foreign key fields
            $foreignKeys = $this->findForeignKeyFields($entityPath, $directFields);

            // Infer parent (entity path without the last "[].segment[]" part)
            $parent = $this->inferParentEntity($entityPath);

            $descriptors[$entityPath] = [
                'path'         => $entityPath,
                'item_count'   => $itemCount,
                'id_field'     => $idField,
                'parent'       => $parent,
                'direct_fields'=> $directFields,
                'foreign_keys' => $foreignKeys,
            ];
        }

        // Sort by depth (shallowest first = root entities first)
        uasort($descriptors, fn($a, $b) =>
            substr_count($a['path'], '[') <=> substr_count($b['path'], '[')
        );

        return $descriptors;
    }

    /**
     * Get field paths that are exactly one level deeper than an entity path.
     *
     * Entity: "projects[]"
     * One-level-deeper fields: "projects[].id", "projects[].name", "projects[].developer_id"
     * NOT: "projects[].developer.name" (two levels deeper)
     *
     * @return array<string, array<string,mixed>>
     */
    private function getDirectFields(string $entityPath, array $allFields): array
    {
        $prefix = $entityPath === '[]' ? '' : $entityPath . '.';
        $result = [];

        foreach ($allFields as $path => $descriptor) {
            if (!str_starts_with($path, $prefix) && $prefix !== '') {
                continue;
            }

            if ($prefix === '' && str_contains($path, '.') && !str_starts_with($path, '[].')) {
                continue;
            }

            $rest = substr($path, strlen($prefix));

            // Exactly one level deep: no dots and no brackets in the remainder
            if (!str_contains($rest, '.') && !str_contains($rest, '[')) {
                $result[$path] = $descriptor;
            }
        }

        return $result;
    }

    /**
     * Find the primary key field for an entity.
     * Looks for: "id", then first field matching /^.*\.id$/ exactly.
     */
    private function findEntityIdField(string $entityPath, array $directFields): ?string
    {
        $prefix = $entityPath === '[]' ? '' : $entityPath . '.';

        // Exact "id" field
        $exactId = $prefix . 'id';
        if (isset($directFields[$exactId])) {
            return $exactId;
        }

        // Any field ending in ".id" (e.g. "projects[].project_id" — less common)
        foreach (array_keys($directFields) as $path) {
            if (str_ends_with($path, '.id') || str_ends_with($path, '_id') && substr_count($path, '.') === substr_count($prefix, '.')) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Find foreign key fields in an entity's direct fields.
     * Heuristic: fields ending in "_id" (or "Id") that are NOT the entity's own "id".
     *
     * @return array<int, array{field:string, target_hint:string}>
     */
    private function findForeignKeyFields(string $entityPath, array $directFields): array
    {
        $fks    = [];
        $prefix = $entityPath === '[]' ? '' : $entityPath . '.';

        foreach (array_keys($directFields) as $path) {
            $fieldName = substr($path, strlen($prefix));

            // Must end in _id or Id, and must not be just "id"
            if ($fieldName === 'id') continue;

            if (str_ends_with($fieldName, '_id') || str_ends_with($fieldName, 'Id')) {
                // Guess the target entity from the field name
                $target = preg_replace('/(_id|Id)$/', '', $fieldName);

                $fks[] = [
                    'field'       => $path,
                    'field_name'  => $fieldName,
                    'target_hint' => $target, // e.g. "project_id" → hint: "project"
                ];
            }
        }

        return $fks;
    }

    /**
     * Infer the parent entity from a nested entity path.
     *
     * "projects[].buildings[]"  → parent: "projects[]"
     * "projects[].buildings[].apartments[]" → parent: "projects[].buildings[]"
     * "projects[]"              → parent: null (root entity)
     */
    private function inferParentEntity(string $entityPath): ?string
    {
        // Remove the last segment: everything after the last "[]." or "[]"
        $pos = strrpos($entityPath, '[]');
        if ($pos === false || $pos === 0) {
            return null;
        }

        // Find the "[]." before the last segment
        $parentEnd = strrpos(substr($entityPath, 0, $pos), '[]');
        if ($parentEnd === false) {
            return null;
        }

        return substr($entityPath, 0, $parentEnd + 2); // +2 for "[]"
    }

    // =========================================================================
    // Type and ID detection
    // =========================================================================

    /**
     * Detect the JSON type of a value.
     * Returns: string | int | float | bool | array | object | null
     */
    private function detectType(mixed $value): string
    {
        return match (true) {
            $value === null  => 'null',
            is_bool($value)  => 'bool',
            is_int($value)   => 'int',
            is_float($value) => 'float',
            is_string($value)=> 'string',
            is_array($value) => array_is_list($value) ? 'array' : 'object',
            default          => 'unknown',
        };
    }

    /**
     * Check if a field path looks like an identifier field.
     *
     * Patterns: ends with ".id", "[]id", ends with "_id", ends with "Id"
     * Case-insensitive final segment check.
     */
    private function detectIsIdField(string $path): bool
    {
        // Get the last segment (after the last '.' or '[]')
        $segment = preg_split('/[\.\[\]]+/', $path);
        $last    = end($segment);

        if ($last === false || $last === '') {
            return false;
        }

        $lower = strtolower($last);

        return $lower === 'id'
            || str_ends_with($lower, '_id')
            || (str_ends_with($last, 'Id') && $last !== 'Id'); // camelCase IDs
    }

    /**
     * Extract enum candidate values if the field has few distinct values.
     *
     * Returns an array of distinct values and their counts,
     * or an empty array if the field has too many distinct values.
     *
     * @return array<string, int>
     */
    private function extractEnumValues(array $fieldEntry): array
    {
        $distinct = $fieldEntry['distinct_values'] ?? [];

        // Not an enum candidate if too many distinct values
        if (count($distinct) > $this->enumThreshold) {
            return [];
        }

        // Not an enum candidate if fewer than 2 distinct values (trivial)
        if (count($distinct) < 2) {
            return [];
        }

        // Not an enum if the type is int/float (likely a real numeric field, not a status)
        // We make an exception if values are small ints (e.g. status: 0|1|2)
        if (($fieldEntry['type'] === 'int' || $fieldEntry['type'] === 'float') && count($distinct) > 10) {
            return [];
        }

        arsort($distinct);
        return $distinct;
    }

    /**
     * Convert a scalar PHP value to a string for display.
     */
    private function scalarToString(mixed $value): string
    {
        return match (true) {
            is_bool($value) => $value ? 'true' : 'false',
            default         => (string) $value,
        };
    }
}
