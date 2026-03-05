<?php

namespace App\Services\Feed;

/**
 * Entity relationship graph builder.
 *
 * NO database. NO Eloquent. Pure analysis of the schema report.
 *
 * Input:  schema report produced by FeedSchemaMapper::analyze()
 * Output: relationship graph array → serialized to JSON by caller
 *
 * What it discovers:
 *  1. Entity hierarchy — nesting (projects → buildings → apartments)
 *     detected purely from path depth:
 *     "projects[]" is parent of "projects[].buildings[]"
 *
 *  2. Foreign key references — cross-entity links via _id fields:
 *     "buildings[].project_id" → likely references "projects[].id"
 *     Matched by comparing FK hint to entity names (plural/singular).
 *
 *  3. Shared ID patterns — entities whose IDs appear as FK in another entity
 *     (confirms the reference direction).
 *
 *  4. Relationship cardinality guess:
 *     - Nested entity → one-to-many (parent has many children)
 *     - FK from A to B → many-to-one (many A rows per B)
 *
 * Output structure (relationships.json):
 * {
 *   "meta": { "generated_at": "...", "source_url": "..." },
 *   "entities": {
 *     "projects[]": {
 *       "path": "projects[]",
 *       "name": "projects",
 *       "id_field": "projects[].id",
 *       "parent": null,
 *       "children": ["projects[].buildings[]"],
 *       "item_count": 47
 *     }, ...
 *   },
 *   "relationships": [
 *     {
 *       "from":        "projects[].buildings[]",
 *       "to":          "projects[]",
 *       "type":        "many_to_one",
 *       "via":         "nesting",
 *       "confidence":  1.0,
 *       "note":        "buildings[] is nested inside projects[]"
 *     }, ...
 *   ],
 *   "hierarchy": { ... tree structure ... },
 *   "suggested_tables": [ ... ordered list for migration planning ... ]
 * }
 */
final class FeedRelationshipAnalyzer
{
    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Build the full relationship graph from a schema report.
     *
     * @param  array<string,mixed> $schemaReport  Output of FeedSchemaMapper::analyze()
     * @param  string              $sourceUrl
     * @return array<string,mixed>                Relationship graph
     */
    public function analyze(array $schemaReport, string $sourceUrl): array
    {
        $rawEntities   = $schemaReport['entities']  ?? [];
        $fields        = $schemaReport['fields']    ?? [];

        if (empty($rawEntities)) {
            return [
                'meta'             => $this->meta($sourceUrl),
                'entities'         => [],
                'relationships'    => [],
                'hierarchy'        => null,
                'suggested_tables' => [],
                'note'             => 'No entities detected in schema. Feed may be a flat list.',
            ];
        }

        // ── Step 1: Build entity nodes ────────────────────────────────────────
        $entities = $this->buildEntityNodes($rawEntities);

        // ── Step 2: Detect nesting relationships (hierarchy) ──────────────────
        $nestingRels = $this->detectNestingRelationships($entities);

        // ── Step 3: Detect FK relationships ───────────────────────────────────
        $fkRels = $this->detectForeignKeyRelationships($entities);

        // ── Step 4: Merge + deduplicate relationships ─────────────────────────
        $relationships = $this->mergeRelationships($nestingRels, $fkRels);

        // ── Step 5: Attach children to entity nodes ───────────────────────────
        $entities = $this->attachChildren($entities, $relationships);

        // ── Step 6: Build hierarchy tree ──────────────────────────────────────
        $hierarchy = $this->buildHierarchyTree($entities);

        // ── Step 7: Suggest table creation order (topological sort) ──────────
        $suggestedTables = $this->buildTableCreationOrder($entities, $relationships);

        return [
            'meta'             => $this->meta($sourceUrl),
            'entities'         => $entities,
            'relationships'    => $relationships,
            'hierarchy'        => $hierarchy,
            'suggested_tables' => $suggestedTables,
        ];
    }

    // =========================================================================
    // Entity node building
    // =========================================================================

    /**
     * Convert raw entity descriptors from schema report into graph nodes.
     *
     * @param  array<string, array<string,mixed>> $rawEntities
     * @return array<string, array<string,mixed>>
     */
    private function buildEntityNodes(array $rawEntities): array
    {
        $nodes = [];

        foreach ($rawEntities as $path => $entity) {
            $name      = $this->pathToName($path);
            $tableName = $this->pathToTableName($path);
            $parent    = $entity['parent'] ?? null;

            $nodes[$path] = [
                'path'         => $path,
                'name'         => $name,
                'table_name'   => $tableName,    // suggested DB table name
                'id_field'     => $entity['id_field'] ?? null,
                'parent'       => $parent,
                'children'     => [],            // populated later
                'item_count'   => $entity['item_count'] ?? 0,
                'direct_fields'=> $entity['direct_fields'] ?? [],
                'foreign_keys' => $entity['foreign_keys'] ?? [],
                'depth'        => substr_count($path, '[]'),
            ];
        }

        return $nodes;
    }

    // =========================================================================
    // Relationship detection
    // =========================================================================

    /**
     * Detect nesting relationships from path structure.
     *
     * "projects[].buildings[]" → buildings is nested inside projects
     * Relationship: buildings →[many_to_one]→ projects (via nesting)
     *
     * @param  array<string, array<string,mixed>> $entities
     * @return array<int, array<string,mixed>>
     */
    private function detectNestingRelationships(array $entities): array
    {
        $relationships = [];

        foreach ($entities as $path => $entity) {
            $parent = $entity['parent'];

            if ($parent === null) {
                continue;
            }

            if (!isset($entities[$parent])) {
                continue;
            }

            $relationships[] = [
                'from'        => $path,
                'to'          => $parent,
                'type'        => 'many_to_one',
                'via'         => 'nesting',
                'confidence'  => 1.0,
                'note'        => sprintf(
                    '%s is nested inside %s — inferred one-to-many (one %s has many %s)',
                    $this->pathToName($path),
                    $this->pathToName($parent),
                    $this->pathToTableName($parent),
                    $this->pathToTableName($path),
                ),
            ];

            $relationships[] = [
                'from'        => $parent,
                'to'          => $path,
                'type'        => 'one_to_many',
                'via'         => 'nesting',
                'confidence'  => 1.0,
                'note'        => sprintf(
                    'One %s can contain many %s',
                    $this->pathToTableName($parent),
                    $this->pathToTableName($path),
                ),
            ];
        }

        return $relationships;
    }

    /**
     * Detect FK relationships from _id field patterns.
     *
     * For each entity with a foreign_key field:
     *   - Extract the "target_hint" (e.g. "project" from "project_id")
     *   - Try to match it to a known entity (by name, singular/plural)
     *   - Create a relationship if matched
     *
     * @param  array<string, array<string,mixed>> $entities
     * @return array<int, array<string,mixed>>
     */
    private function detectForeignKeyRelationships(array $entities): array
    {
        $relationships = [];

        // Build a lookup: table_name → entity_path
        $tableIndex = [];
        foreach ($entities as $path => $entity) {
            $tableIndex[$entity['table_name']] = $path;
            // Also index singular form
            $singular = $this->toSingular($entity['table_name']);
            if ($singular !== $entity['table_name']) {
                $tableIndex[$singular] = $path;
            }
        }

        foreach ($entities as $fromPath => $entity) {
            foreach ($entity['foreign_keys'] as $fk) {
                $hint       = $fk['target_hint'] ?? '';
                $fieldPath  = $fk['field'] ?? '';
                $fieldName  = $fk['field_name'] ?? '';

                if (empty($hint)) continue;

                // Try to find the referenced entity
                $targetPath = $tableIndex[$hint]
                    ?? $tableIndex[$this->toPlural($hint)]
                    ?? null;

                if ($targetPath === null || $targetPath === $fromPath) {
                    // Could not resolve → record as unresolved reference
                    $relationships[] = [
                        'from'        => $fromPath,
                        'to'          => null,
                        'type'        => 'unresolved_fk',
                        'via'         => 'foreign_key',
                        'field'       => $fieldPath,
                        'field_name'  => $fieldName,
                        'target_hint' => $hint,
                        'confidence'  => 0.5,
                        'note'        => "Field '{$fieldName}' looks like a FK but target entity '{$hint}' not found in schema",
                    ];
                    continue;
                }

                $relationships[] = [
                    'from'        => $fromPath,
                    'to'          => $targetPath,
                    'type'        => 'many_to_one',
                    'via'         => 'foreign_key',
                    'field'       => $fieldPath,
                    'field_name'  => $fieldName,
                    'confidence'  => 0.85,
                    'note'        => sprintf(
                        '%s.%s references %s.id',
                        $this->pathToName($fromPath),
                        $fieldName,
                        $this->pathToName($targetPath),
                    ),
                ];
            }
        }

        return $relationships;
    }

    /**
     * Merge nesting and FK relationships, remove exact duplicates.
     *
     * @param  array<int, array<string,mixed>> ...$groups
     * @return array<int, array<string,mixed>>
     */
    private function mergeRelationships(array ...$groups): array
    {
        $all  = array_merge(...$groups);
        $seen = [];
        $out  = [];

        foreach ($all as $rel) {
            $key = ($rel['from'] ?? '') . '|' . ($rel['to'] ?? '') . '|' . $rel['via'];
            if (isset($seen[$key])) continue;
            $seen[$key] = true;
            $out[]      = $rel;
        }

        // Sort: nesting relationships first (higher confidence), then FK
        usort($out, fn($a, $b) => ($b['confidence'] <=> $a['confidence'])
            ?: ($a['via'] <=> $b['via'])
        );

        return array_values($out);
    }

    /**
     * Attach child entity paths to each entity's 'children' array.
     *
     * @param  array<string, array<string,mixed>> $entities
     * @param  array<int, array<string,mixed>>    $relationships
     * @return array<string, array<string,mixed>>
     */
    private function attachChildren(array $entities, array $relationships): array
    {
        foreach ($relationships as $rel) {
            if ($rel['via'] !== 'nesting' || $rel['type'] !== 'one_to_many') {
                continue;
            }

            $parentPath = $rel['from'] ?? null;
            $childPath  = $rel['to']   ?? null;

            if ($parentPath && $childPath && isset($entities[$parentPath])) {
                if (!in_array($childPath, $entities[$parentPath]['children'], true)) {
                    $entities[$parentPath]['children'][] = $childPath;
                }
            }
        }

        return $entities;
    }

    // =========================================================================
    // Hierarchy tree
    // =========================================================================

    /**
     * Build a nested hierarchy tree from root entities down to leaves.
     *
     * Returns null if no clear root entity exists.
     *
     * @param  array<string, array<string,mixed>> $entities
     * @return array<string,mixed>|null
     */
    private function buildHierarchyTree(array $entities): ?array
    {
        // Root entities = entities with no parent
        $roots = array_filter($entities, fn($e) => $e['parent'] === null);

        if (empty($roots)) {
            return null;
        }

        $buildNode = function (string $path) use ($entities, &$buildNode): array {
            $entity = $entities[$path];
            $node   = [
                'path'       => $path,
                'name'       => $entity['name'],
                'table_name' => $entity['table_name'],
                'item_count' => $entity['item_count'],
                'children'   => [],
            ];

            foreach ($entity['children'] as $childPath) {
                if (isset($entities[$childPath])) {
                    $node['children'][] = $buildNode($childPath);
                }
            }

            return $node;
        };

        if (count($roots) === 1) {
            $rootPath = array_key_first($roots);
            return $buildNode($rootPath);
        }

        // Multiple roots → return a "forest" wrapper
        return [
            'type'  => 'forest',
            'roots' => array_map(
                fn($path) => $buildNode($path),
                array_keys($roots)
            ),
        ];
    }

    // =========================================================================
    // Table creation order (topological sort)
    // =========================================================================

    /**
     * Suggest the order in which DB tables should be created (parent before child).
     *
     * Uses Kahn's topological sort algorithm on the entity dependency graph.
     *
     * @param  array<string, array<string,mixed>> $entities
     * @param  array<int, array<string,mixed>>    $relationships
     * @return array<int, array{table_name:string, path:string, reason:string}>
     */
    private function buildTableCreationOrder(array $entities, array $relationships): array
    {
        // Build adjacency list: "parent → [children]"
        $deps = []; // entity_path → [entity_paths it depends on (parents)]

        foreach ($entities as $path => $_) {
            $deps[$path] = [];
        }

        foreach ($relationships as $rel) {
            if ($rel['type'] === 'many_to_one' && $rel['to'] !== null && isset($entities[$rel['from']])) {
                $deps[$rel['from']][] = $rel['to'];
            }
        }

        // Deduplicate
        foreach ($deps as &$d) {
            $d = array_values(array_unique($d));
        }

        // Kahn's algorithm
        $inDegree = array_fill_keys(array_keys($entities), 0);

        foreach ($deps as $path => $parents) {
            foreach ($parents as $parent) {
                if (isset($inDegree[$parent])) {
                    // parent must come before child → child depends on parent
                    // We actually want: parent has higher priority
                    // In-degree for topological sort: count dependencies
                }
            }
            $inDegree[$path] = count($deps[$path]);
        }

        $queue  = [];
        $result = [];

        foreach ($inDegree as $path => $deg) {
            if ($deg === 0) {
                $queue[] = $path;
            }
        }

        while (!empty($queue)) {
            // Pick shallowest (lowest depth) entity from queue
            usort($queue, fn($a, $b) =>
                ($entities[$a]['depth'] ?? 0) <=> ($entities[$b]['depth'] ?? 0)
            );

            $path = array_shift($queue);
            $e    = $entities[$path];

            $result[] = [
                'table_name' => $e['table_name'],
                'path'       => $path,
                'depth'      => $e['depth'],
                'id_field'   => $e['id_field'],
                'item_count' => $e['item_count'],
                'reason'     => $e['parent']
                    ? "Depends on parent entity: {$this->pathToTableName($e['parent'])}"
                    : 'Root entity — create first',
            ];

            // Reduce in-degree for entities that depended on this one
            foreach ($entities as $childPath => $_) {
                if (in_array($path, $deps[$childPath] ?? [], true)) {
                    $inDegree[$childPath]--;
                    if ($inDegree[$childPath] === 0) {
                        $queue[] = $childPath;
                    }
                }
            }
        }

        // If any entities weren't processed (cycle), append them at the end
        foreach ($entities as $path => $e) {
            $alreadyAdded = in_array($path, array_column($result, 'path'), true);
            if (!$alreadyAdded) {
                $result[] = [
                    'table_name' => $e['table_name'],
                    'path'       => $path,
                    'depth'      => $e['depth'],
                    'id_field'   => $e['id_field'],
                    'item_count' => $e['item_count'],
                    'reason'     => 'Circular dependency detected — verify manually',
                ];
            }
        }

        return $result;
    }

    // =========================================================================
    // Naming helpers
    // =========================================================================

    /**
     * Convert an entity path to a short name.
     * "projects[].buildings[]" → "buildings"
     * "[]" → "items"
     */
    private function pathToName(string $path): string
    {
        if ($path === '[]') {
            return 'items';
        }

        // Take the last non-empty segment before "[]"
        preg_match_all('/([a-zA-Z_][a-zA-Z0-9_]*)\[\]/', $path, $matches);

        if (!empty($matches[1])) {
            return end($matches[1]);
        }

        return $path;
    }

    /**
     * Convert an entity path to a snake_case table name.
     * "projects[].buildings[]" → "buildings"
     * "projects[]" → "projects"
     */
    private function pathToTableName(string $path): string
    {
        if ($path === null || $path === '') {
            return '';
        }

        $name = $this->pathToName($path);

        // Convert camelCase to snake_case
        $snake = strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $name));

        return $snake;
    }

    /**
     * Naive plural → singular conversion for FK matching.
     * Only handles common English patterns.
     */
    private function toSingular(string $word): string
    {
        if (str_ends_with($word, 'ies')) {
            return substr($word, 0, -3) . 'y';
        }
        if (str_ends_with($word, 'ses') || str_ends_with($word, 'xes') || str_ends_with($word, 'zes')) {
            return substr($word, 0, -2);
        }
        if (str_ends_with($word, 's') && !str_ends_with($word, 'ss')) {
            return substr($word, 0, -1);
        }
        return $word;
    }

    /**
     * Naive singular → plural (for reverse FK matching).
     */
    private function toPlural(string $word): string
    {
        if (str_ends_with($word, 'y')) {
            return substr($word, 0, -1) . 'ies';
        }
        if (str_ends_with($word, 's')) {
            return $word; // already plural
        }
        return $word . 's';
    }

    private function meta(string $sourceUrl): array
    {
        return [
            'generated_at' => now()->toIso8601String(),
            'source_url'   => $sourceUrl,
        ];
    }
}
