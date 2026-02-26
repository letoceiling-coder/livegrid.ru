<?php

namespace App\Services\Feed;

/**
 * Assembles the comprehensive analysis report.json.
 *
 * NO database. NO HTTP. Pure in-memory analysis of collected schemas.
 *
 * Input:
 *   - Collection manifest from FeedDiscoveryService::discover()
 *   - Schema reports from FeedSchemaMapper::analyze() (one per endpoint)
 *   - Relationship graphs from FeedRelationshipAnalyzer::analyze() (one per endpoint)
 *
 * FeedSchemaMapper output structure (per endpoint):
 *   {
 *     meta:   { generated_at, source_url, … },
 *     stats:  { total_fields, total_entities, max_depth, type_distribution, … },
 *     entities: { "path[]": { path, item_count, id_field, parent, direct_fields, foreign_keys } },
 *     fields:   { "path": { type, depth, occurrences, null_count, null_ratio,
 *                            is_nullable, is_always_present, is_id_field,
 *                            example, enum_values } },
 *     id_fields, nullable_fields, always_present, enum_candidates
 *   }
 *
 * FeedRelationshipAnalyzer output structure (per endpoint):
 *   {
 *     meta:   { generated_at, source_url },
 *     entities: { "path[]": { path, name, table_name, id_field, parent,
 *                              children, item_count, direct_fields, foreign_keys, depth } },
 *     relationships: [ { from, to, type, via, confidence, note } ],
 *     hierarchy: { … tree … },
 *     suggested_tables: [ … ordered for migration … ]
 *   }
 *
 * Output (storage/feed/analysis/report.json):
 *  {
 *    meta, entities, relationships,
 *    filter_candidates, search_candidates, index_recommendations, data_quality
 *  }
 */
final class FeedReportBuilder
{
    // ── Heuristic keyword sets ────────────────────────────────────────────────

    private const PRICE_KEYWORDS = [
        'price', 'cost', 'amount', 'sum',
        'цена', 'стоимость', 'сумма',
        'price_from', 'price_to', 'price_min', 'price_max',
        'price_base', 'price_sale',
    ];

    private const AREA_KEYWORDS = [
        'area', 'square', 'space', 'footage',
        'площадь', 'метраж',
        'total_area', 'living_area', 'kitchen_area',
        'area_total', 'area_living', 'area_kitchen',
    ];

    private const ROOMS_KEYWORDS = [
        'rooms', 'room_count', 'rooms_count', 'bedrooms', 'flat_type',
        'комнат', 'комнатность', 'studio',
    ];

    private const REGION_KEYWORDS = [
        'region', 'city', 'district', 'municipality',
        'region_id', 'city_id', 'district_id',
        'регион', 'город', 'район', 'okrug',
    ];

    private const METRO_KEYWORDS = [
        'metro', 'subway', 'station', 'metro_id', 'subway_id',
        'метро', 'станция', 'nearest_metro',
    ];

    private const FINISHING_KEYWORDS = [
        'finishing', 'decoration', 'finish', 'interior',
        'отделка', 'ремонт', 'finishing_type',
    ];

    private const DATE_KEYWORDS = [
        'date', 'deadline', 'handover', 'completion', 'delivery', 'quarter',
        'срок', 'квартал', 'delivery_year', 'delivery_quarter', 'built_year',
    ];

    private const TEXT_KEYWORDS = [
        'description', 'text', 'about', 'info', 'content',
        'name', 'title', 'address', 'location',
        'описание', 'название', 'адрес',
    ];

    private const GEO_KEYWORDS = [
        'lat', 'latitude', 'lng', 'lon', 'longitude',
        'coords', 'coordinates', 'geo', 'gps',
        'latitude_center', 'longitude_center',
    ];

    // =========================================================================
    // Public API
    // =========================================================================

    /**
     * Build the full report.json.
     *
     * @param  array<string,mixed>                 $collectionMeta       FeedDiscoveryService::discover()
     * @param  array<string, array<string,mixed>>  $schemaReportsByUrl   url → FeedSchemaMapper::analyze()
     * @param  array<string, array<string,mixed>>  $graphsByUrl          url → FeedRelationshipAnalyzer::analyze()
     * @return array<string,mixed>
     */
    public function build(
        array $collectionMeta,
        array $schemaReportsByUrl,
        array $graphsByUrl
    ): array {
        // Merge all field maps from all endpoints into one flat map
        $mergedFields = $this->mergeFields($schemaReportsByUrl);

        // Build per-entity stats from relationship graphs + schema data
        $entities = $this->buildEntities($schemaReportsByUrl, $graphsByUrl);

        // Consolidate relationship info
        $relationships = $this->consolidateRelationships($graphsByUrl);

        // Filter / search / index candidates
        $filterCandidates = $this->detectFilterCandidates($mergedFields);
        $searchCandidates = $this->detectSearchCandidates($mergedFields);
        $indexRecs        = $this->buildIndexRecommendations(
            $entities, $relationships, $filterCandidates, $searchCandidates, $graphsByUrl
        );

        // Data quality
        $dataQuality = $this->buildDataQuality($mergedFields, $schemaReportsByUrl);

        return [
            'meta' => [
                'generated_at'           => now()->toIso8601String(),
                'downloaded_at'          => $collectionMeta['started_at'] ?? null,
                'total_size_mb'          => $collectionMeta['total_size_mb'] ?? 0,
                'total_endpoints'        => $collectionMeta['total_endpoints'] ?? 0,
                'total_files'            => $collectionMeta['total_files'] ?? 0,
                'total_entities_detected'=> count($entities),
                'total_fields_analyzed'  => count($mergedFields),
                'primary_url'            => $collectionMeta['primary_url'] ?? null,
                'region_filter'          => $collectionMeta['region_filter'] ?? null,
                'pagination_info'        => $collectionMeta['pagination_info'] ?? [],
                'errors'                 => $collectionMeta['errors'] ?? [],
                'endpoints_analyzed'     => array_keys($schemaReportsByUrl),
            ],
            'entities'             => array_values($entities),
            'relationships'        => $relationships,
            'filter_candidates'    => $filterCandidates,
            'search_candidates'    => $searchCandidates,
            'index_recommendations'=> $indexRecs,
            'data_quality'         => $dataQuality,
        ];
    }

    // =========================================================================
    // Entity analysis
    // =========================================================================

    /**
     * Build per-entity stats combining relationship graphs and schema field data.
     *
     * @return array<string, array<string,mixed>>
     */
    private function buildEntities(array $schemaReportsByUrl, array $graphsByUrl): array
    {
        $entities = [];

        foreach ($graphsByUrl as $url => $graph) {
            $graphEntities = $graph['entities'] ?? [];

            foreach ($graphEntities as $entityPath => $node) {
                $name      = $node['name']       ?? $this->pathToName($entityPath);
                $tableName = $node['table_name'] ?? $this->toSnakeCase($name);
                $key       = $tableName;

                // Init entry if first time seeing this entity
                if (!isset($entities[$key])) {
                    $entities[$key] = [
                        'name'              => $name,
                        'table_name'        => $tableName,
                        'path'              => $entityPath,
                        'source_url'        => $url,
                        'count'             => 0,
                        'id_field'          => null,
                        'parent'            => null,
                        'children'          => [],
                        'fields_count'      => 0,
                        'nullable_fields'   => [],
                        'required_fields'   => [],
                        'enum_candidates'   => [],
                        'geo_fields'        => [],
                        'text_fields'       => [],
                        'numeric_fields'    => [],
                        'date_fields'       => [],
                        'foreign_keys'      => [],
                        'suggested_fk_columns' => [],
                    ];
                }

                // Populate from graph node
                $entities[$key]['count']    = max($entities[$key]['count'], $node['item_count'] ?? 0);
                $entities[$key]['id_field'] = $node['id_field'] ?? $entities[$key]['id_field'];
                $entities[$key]['parent']   = $node['parent']   ?? $entities[$key]['parent'];
                $entities[$key]['children'] = array_unique(array_merge(
                    $entities[$key]['children'], $node['children'] ?? []
                ));

                // Foreign keys from graph
                $fks = $node['foreign_keys'] ?? [];
                foreach ($fks as $fk) {
                    $col = is_array($fk) ? ($fk['column'] ?? $fk['field'] ?? (string) $fk) : (string) $fk;
                    $entities[$key]['foreign_keys'][] = $col;
                }
                $entities[$key]['foreign_keys'] = array_unique($entities[$key]['foreign_keys']);

                // Fields from schema report
                if (isset($schemaReportsByUrl[$url])) {
                    $fields = $schemaReportsByUrl[$url]['fields'] ?? [];
                    $this->enrichEntityFromFields($entities[$key], $entityPath, $fields);
                }
            }
        }

        // Fallback: entities detected from well-known file labels in collection
        // (when relationship graph found nothing — e.g. very flat/unknown feed)
        foreach ($schemaReportsByUrl as $url => $report) {
            $schemaEntities = $report['entities'] ?? [];
            foreach ($schemaEntities as $entityPath => $ent) {
                $name  = $this->pathToName($entityPath);
                $tname = $this->toSnakeCase($name);

                if (isset($entities[$tname])) continue;

                $entities[$tname] = [
                    'name'              => $name,
                    'table_name'        => $tname,
                    'path'              => $entityPath,
                    'source_url'        => $url,
                    'count'             => $ent['item_count'] ?? 0,
                    'id_field'          => $ent['id_field'] ?? null,
                    'parent'            => $ent['parent'] ?? null,
                    'children'          => [],
                    'fields_count'      => count($ent['direct_fields'] ?? []),
                    'nullable_fields'   => [],
                    'required_fields'   => [],
                    'enum_candidates'   => [],
                    'geo_fields'        => [],
                    'text_fields'       => [],
                    'numeric_fields'    => [],
                    'date_fields'       => [],
                    'foreign_keys'      => array_keys($ent['foreign_keys'] ?? []),
                    'suggested_fk_columns' => [],
                ];

                $fields = $report['fields'] ?? [];
                $this->enrichEntityFromFields($entities[$tname], $entityPath, $fields);
            }
        }

        // Sort by count descending
        uasort($entities, fn($a, $b) => ($b['count'] ?? 0) <=> ($a['count'] ?? 0));

        return $entities;
    }

    /**
     * Enrich an entity entry with data from the flat field map.
     *
     * @param  array<string,mixed> &$entity
     * @param  string              $entityPath  e.g. "apartments[]"
     * @param  array<string,mixed> $fields      flat path → field meta
     */
    private function enrichEntityFromFields(array &$entity, string $entityPath, array $fields): void
    {
        // Normalize path for prefix matching
        // Entity "apartments[]" → fields start with "apartments[]."
        $prefix  = rtrim($entityPath, '.') . '.';
        $counted = 0;
        $maxOcc  = 0;

        foreach ($fields as $path => $meta) {
            if (!str_starts_with($path, $prefix)) continue;
            $counted++;

            // Track max occurrence for required field detection
            $maxOcc = max($maxOcc, $meta['occurrences'] ?? 0);
        }

        $entity['fields_count'] = max($entity['fields_count'], $counted);

        foreach ($fields as $path => $meta) {
            if (!str_starts_with($path, $prefix)) continue;

            $field = $this->lastSegment($path);
            $type  = strtolower((string) ($meta['type'] ?? ''));

            // Nullable
            if ($meta['is_nullable'] ?? false) {
                $entity['nullable_fields'][] = $field;
            }

            // Required (≥95% occurrence, never null)
            $occ = $meta['occurrences'] ?? 0;
            if ($maxOcc > 0 && $occ >= $maxOcc * 0.95 && !($meta['is_nullable'] ?? false)) {
                $entity['required_fields'][] = $field;
            }

            // Enum candidates
            $enumVals = $meta['enum_values'] ?? [];
            if (!empty($enumVals)) {
                $entity['enum_candidates'][] = [
                    'field'  => $field,
                    'values' => array_keys((array) $enumVals),
                ];
            }

            // Geo fields
            if ($this->keywordMatch($field, self::GEO_KEYWORDS)) {
                $entity['geo_fields'][] = $field;
            }

            // Text fields
            if ($type === 'string' && $this->keywordMatch($field, self::TEXT_KEYWORDS)) {
                $entity['text_fields'][] = $field;
            }

            // Numeric fields
            if (in_array($type, ['int', 'integer', 'float', 'double'])) {
                $entity['numeric_fields'][] = $field;
            }

            // Date fields
            if ($this->keywordMatch($field, self::DATE_KEYWORDS)) {
                $entity['date_fields'][] = $field;
            }
        }

        // Deduplicate
        $entity['nullable_fields'] = array_unique($entity['nullable_fields']);
        $entity['required_fields'] = array_unique($entity['required_fields']);
        $entity['geo_fields']      = array_unique($entity['geo_fields']);
        $entity['text_fields']     = array_unique($entity['text_fields']);
        $entity['numeric_fields']  = array_unique($entity['numeric_fields']);
        $entity['date_fields']     = array_unique($entity['date_fields']);
    }

    // =========================================================================
    // Relationship consolidation
    // =========================================================================

    /**
     * Consolidate relationship graphs from all endpoints into a single summary.
     */
    private function consolidateRelationships(array $graphsByUrl): array
    {
        $hierarchy    = [];
        $foreignKeys  = [];
        $confidence   = [];
        $suggestedTables = [];

        foreach ($graphsByUrl as $url => $graph) {
            // Hierarchy from nesting relationships
            foreach ($graph['relationships'] ?? [] as $rel) {
                $type = $rel['type'] ?? '';
                $via  = $rel['via']  ?? '';

                if ($via === 'nesting' && $type === 'one_to_many') {
                    $key = ($rel['from'] ?? '') . '→' . ($rel['to'] ?? '');
                    if (!isset($hierarchy[$key])) {
                        $hierarchy[$key] = [
                            'parent'      => $rel['from'] ?? '',
                            'child'       => $rel['to']   ?? '',
                            'cardinality' => 'one_to_many',
                            'source_url'  => $url,
                            'note'        => $rel['note'] ?? '',
                        ];
                    }
                }

                if ($via === 'foreign_key') {
                    $key = ($rel['from'] ?? '') . '.' . ($rel['fk_field'] ?? '') . '→' . ($rel['to'] ?? '');
                    if (!isset($foreignKeys[$key])) {
                        $foreignKeys[$key] = [
                            'from_entity'  => $rel['from']     ?? '',
                            'fk_field'     => $rel['fk_field'] ?? '',
                            'to_entity'    => $rel['to']       ?? '',
                            'to_id_field'  => $rel['to_id']    ?? 'id',
                            'confidence'   => $rel['confidence'] ?? 0.5,
                            'note'         => $rel['note']      ?? '',
                        ];

                        $confidence[] = [
                            'relation'   => $key,
                            'confidence' => $rel['confidence'] ?? 0.5,
                            'reason'     => $rel['note'] ?? '',
                        ];
                    }
                }
            }

            // Suggested table order (from topological sort)
            foreach ($graph['suggested_tables'] ?? [] as $tbl) {
                $name = is_array($tbl) ? ($tbl['table_name'] ?? $tbl['name'] ?? '') : (string) $tbl;
                if ($name && !in_array($name, $suggestedTables)) {
                    $suggestedTables[] = $name;
                }
            }
        }

        return [
            'hierarchy'        => array_values($hierarchy),
            'foreign_keys'     => array_values($foreignKeys),
            'confidence_scores'=> $confidence,
            'suggested_table_order' => $suggestedTables,
        ];
    }

    // =========================================================================
    // Filter / search candidates
    // =========================================================================

    /**
     * Detect fields suitable for user-facing filters.
     *
     * @param  array<string, array<string,mixed>> $fields  Merged flat field map
     */
    private function detectFilterCandidates(array $fields): array
    {
        return [
            'price'       => $this->hasKeywordMatch($fields, self::PRICE_KEYWORDS),
            'area'        => $this->hasKeywordMatch($fields, self::AREA_KEYWORDS),
            'rooms'       => $this->hasKeywordMatch($fields, self::ROOMS_KEYWORDS),
            'region'      => $this->hasKeywordMatch($fields, self::REGION_KEYWORDS),
            'metro'       => $this->hasKeywordMatch($fields, self::METRO_KEYWORDS),
            'finishings'  => $this->hasKeywordMatch($fields, self::FINISHING_KEYWORDS),
            'completion_date' => $this->hasKeywordMatch($fields, self::DATE_KEYWORDS),

            // Concrete field paths
            'price_fields'    => $this->matchingPaths($fields, self::PRICE_KEYWORDS),
            'area_fields'     => $this->matchingPaths($fields, self::AREA_KEYWORDS),
            'rooms_fields'    => $this->matchingPaths($fields, self::ROOMS_KEYWORDS),
            'region_fields'   => $this->matchingPaths($fields, self::REGION_KEYWORDS),
            'metro_fields'    => $this->matchingPaths($fields, self::METRO_KEYWORDS),
            'finishing_fields'=> $this->matchingPaths($fields, self::FINISHING_KEYWORDS),
            'date_fields'     => $this->matchingPaths($fields, self::DATE_KEYWORDS),
        ];
    }

    /**
     * Detect fields suitable for full-text search and geo indexing.
     *
     * @return array{text_fields:array, geo_fields:array}
     */
    private function detectSearchCandidates(array $fields): array
    {
        $textFields = [];
        $geoFields  = [];

        foreach ($fields as $path => $meta) {
            $field = $this->lastSegment($path);
            $type  = strtolower((string) ($meta['type'] ?? ''));

            if ($type === 'string') {
                $exLen = strlen((string) ($meta['example'] ?? ''));
                if ($exLen > 30 || $this->keywordMatch($field, self::TEXT_KEYWORDS)) {
                    $textFields[] = [
                        'path'        => $path,
                        'field'       => $field,
                        'example_len' => $exLen,
                        'occurrences' => $meta['occurrences'] ?? 0,
                    ];
                }
            }

            if (in_array($type, ['float', 'int', 'integer', 'string', 'double'])) {
                if ($this->keywordMatch($field, self::GEO_KEYWORDS)) {
                    $geoFields[] = [
                        'path'        => $path,
                        'field'       => $field,
                        'type'        => $type,
                        'example'     => $meta['example'] ?? null,
                        'occurrences' => $meta['occurrences'] ?? 0,
                    ];
                }
            }
        }

        usort($textFields, fn($a, $b) => ($b['occurrences'] ?? 0) <=> ($a['occurrences'] ?? 0));
        usort($geoFields,  fn($a, $b) => ($b['occurrences'] ?? 0) <=> ($a['occurrences'] ?? 0));

        return [
            'text_fields' => array_slice($textFields, 0, 30),
            'geo_fields'  => array_slice($geoFields,  0, 20),
        ];
    }

    // =========================================================================
    // Index recommendations
    // =========================================================================

    /**
     * @return array<int, array{table:string, column:string, type:string, reason:string}>
     */
    private function buildIndexRecommendations(
        array $entities,
        array $relationships,
        array $filterCandidates,
        array $searchCandidates,
        array $graphsByUrl
    ): array {
        $recs = [];

        // ── Primary keys ─────────────────────────────────────────────────────
        foreach ($entities as $entity) {
            $table = $entity['table_name'] ?? '';
            $id    = $entity['id_field']   ?? null;
            $idCol = $id ? $this->lastSegment($id) : 'id';

            if ($table) {
                $recs[] = [
                    'table'  => $table,
                    'column' => $idCol,
                    'type'   => 'PRIMARY KEY',
                    'reason' => "primary key of {$table}",
                ];
            }
        }

        // ── Hierarchy FKs ─────────────────────────────────────────────────────
        foreach ($relationships['hierarchy'] ?? [] as $h) {
            $parent = $this->toSnakeCase($this->pathToName($h['parent'] ?? ''));
            $child  = $this->toSnakeCase($this->pathToName($h['child']  ?? ''));

            if ($parent && $child) {
                $recs[] = [
                    'table'  => $child,
                    'column' => "{$parent}_id",
                    'type'   => 'INDEX (FK)',
                    'reason' => "foreign key → {$parent}.id (nested hierarchy)",
                ];
            }
        }

        // ── Explicit FK references ────────────────────────────────────────────
        foreach ($relationships['foreign_keys'] ?? [] as $fk) {
            $fromTable = $this->toSnakeCase($this->pathToName($fk['from_entity'] ?? ''));
            $fkCol     = $this->lastSegment($fk['fk_field'] ?? '');

            if ($fromTable && $fkCol) {
                $recs[] = [
                    'table'  => $fromTable,
                    'column' => $fkCol,
                    'type'   => 'INDEX (FK)',
                    'reason' => "FK → {$fk['to_entity']}",
                ];
            }
        }

        // ── Entity FK columns ────────────────────────────────────────────────
        foreach ($entities as $entity) {
            $table = $entity['table_name'] ?? '';
            foreach ($entity['foreign_keys'] ?? [] as $fkCol) {
                if ($fkCol) {
                    $recs[] = [
                        'table'  => $table,
                        'column' => is_string($fkCol) ? $this->lastSegment($fkCol) : 'fk',
                        'type'   => 'INDEX (FK)',
                        'reason' => 'entity-level foreign key',
                    ];
                }
            }
        }

        // ── Filter fields ─────────────────────────────────────────────────────
        $filterPaths = array_unique(array_merge(
            $filterCandidates['price_fields']    ?? [],
            $filterCandidates['area_fields']     ?? [],
            $filterCandidates['rooms_fields']    ?? [],
            $filterCandidates['region_fields']   ?? [],
            $filterCandidates['metro_fields']    ?? [],
            $filterCandidates['finishing_fields']?? [],
            $filterCandidates['date_fields']     ?? [],
        ));

        foreach ($filterPaths as $path) {
            $col   = $this->lastSegment($path);
            $table = $this->guessTableFromPath($path);

            $recs[] = [
                'table'  => $table,
                'column' => $col,
                'type'   => 'INDEX (filter)',
                'reason' => 'WHERE / ORDER BY / range filter candidate',
            ];
        }

        // ── Full-text ─────────────────────────────────────────────────────────
        foreach ($searchCandidates['text_fields'] ?? [] as $tf) {
            $recs[] = [
                'table'  => $this->guessTableFromPath($tf['path']),
                'column' => $tf['field'],
                'type'   => 'FULLTEXT',
                'reason' => 'long text field — suitable for full-text search',
            ];
        }

        // ── Geo ───────────────────────────────────────────────────────────────
        $geoByTable = [];
        foreach ($searchCandidates['geo_fields'] ?? [] as $gf) {
            $table = $this->guessTableFromPath($gf['path']);
            $geoByTable[$table][] = $gf['field'];
        }

        foreach ($geoByTable as $table => $cols) {
            // If both lat + lng detected on same table, recommend POINT column
            $hasLat = array_filter($cols, fn($c) => str_contains(strtolower($c), 'lat'));
            $hasLng = array_filter($cols, fn($c) =>
                str_contains(strtolower($c), 'lng') ||
                str_contains(strtolower($c), 'lon')
            );

            if ($hasLat && $hasLng) {
                $recs[] = [
                    'table'  => $table,
                    'column' => 'coordinates (POINT from ' . implode('+', $cols) . ')',
                    'type'   => 'SPATIAL INDEX',
                    'reason' => 'lat/lng pair — store as POINT, add SPATIAL INDEX for geo queries',
                ];
            } else {
                foreach ($cols as $col) {
                    $recs[] = [
                        'table'  => $table,
                        'column' => $col,
                        'type'   => 'INDEX (geo)',
                        'reason' => 'geo coordinate field',
                    ];
                }
            }
        }

        // ── Suggested table order from topological sort ───────────────────────
        // (append as metadata comment, not an actual index recommendation)
        // Done separately in the output.

        return $this->deduplicateRecs($recs);
    }

    // =========================================================================
    // Data quality
    // =========================================================================

    private function buildDataQuality(array $mergedFields, array $schemaReportsByUrl): array
    {
        $totalFields = count($mergedFields);

        if ($totalFields === 0) {
            return ['total_fields' => 0];
        }

        $nullableCount  = 0;
        $typeDist       = [];
        $maxDepth       = 0;
        $enumCandidates = [];
        $dynamicKeys    = [];
        $embeddedArrays = [];
        $mixedTypes     = [];

        foreach ($mergedFields as $path => $meta) {
            $type  = (string) ($meta['type'] ?? 'unknown');
            $depth = (int)   ($meta['depth'] ?? 0);

            if ($meta['is_nullable'] ?? false) {
                $nullableCount++;
            }

            $baseType = explode('|', $type)[0];
            $typeDist[$baseType] = ($typeDist[$baseType] ?? 0) + 1;

            $maxDepth = max($maxDepth, $depth);

            // Enum candidates
            $enumVals = $meta['enum_values'] ?? [];
            if (!empty($enumVals) && is_array($enumVals)) {
                $enumCandidates[] = [
                    'path'          => $path,
                    'unique_count'  => count($enumVals),
                    'values'        => array_keys($enumVals),
                ];
            }

            // Dynamic keys: numeric index segments
            $lastSeg = $this->lastSegment($path);
            if (preg_match('/^\d+$/', $lastSeg)) {
                $parent = implode('.', array_slice(explode('.', $path), 0, -1));
                $dynamicKeys[$parent] = true;
            }

            // Embedded arrays at depth > 2
            if (in_array($type, ['array', 'list']) && $depth > 2) {
                $embeddedArrays[] = $path;
            }

            // Mixed types (type contains |)
            if (str_contains($type, '|')) {
                $mixedTypes[] = ['path' => $path, 'type' => $type];
            }
        }

        arsort($typeDist);

        // Per-endpoint stats
        $perEndpoint = [];
        foreach ($schemaReportsByUrl as $url => $report) {
            $stats = $report['stats'] ?? [];
            $perEndpoint[] = [
                'url'           => $url,
                'total_fields'  => $stats['total_fields']  ?? 0,
                'total_entities'=> $stats['total_entities'] ?? 0,
                'max_depth'     => $stats['max_depth']      ?? 0,
                'nullable_count'=> $stats['nullable_fields'] ?? 0,
                'enum_count'    => $stats['enum_candidates'] ?? 0,
            ];
        }

        return [
            'total_fields'       => $totalFields,
            'nullable_count'     => $nullableCount,
            'nullable_ratio'     => round($nullableCount / $totalFields, 3),
            'type_distribution'  => $typeDist,
            'max_depth'          => $maxDepth,
            'enum_candidates'    => $enumCandidates,
            'dynamic_key_paths'  => array_keys($dynamicKeys),
            'embedded_arrays'    => $embeddedArrays,
            'mixed_type_fields'  => $mixedTypes,
            'per_endpoint_stats' => $perEndpoint,
        ];
    }

    // =========================================================================
    // Schema field merging
    // =========================================================================

    /**
     * Merge flat field maps from all schema reports.
     *
     * @param  array<string, array<string,mixed>> $schemaReportsByUrl
     * @return array<string, array<string,mixed>>
     */
    private function mergeFields(array $schemaReportsByUrl): array
    {
        $merged = [];

        foreach ($schemaReportsByUrl as $report) {
            $fields = $report['fields'] ?? [];

            foreach ($fields as $path => $meta) {
                if (!isset($merged[$path])) {
                    $merged[$path] = $meta;
                } else {
                    $merged[$path]['occurrences'] = ($merged[$path]['occurrences'] ?? 0)
                        + ($meta['occurrences'] ?? 0);
                    // Merge enum values
                    $existing = $merged[$path]['enum_values'] ?? [];
                    $new      = $meta['enum_values']          ?? [];
                    if (is_array($existing) && is_array($new)) {
                        $merged[$path]['enum_values'] = array_merge($existing, $new);
                    }
                }
            }
        }

        return $merged;
    }

    // =========================================================================
    // Keyword helpers
    // =========================================================================

    private function hasKeywordMatch(array $fields, array $keywords): bool
    {
        foreach ($fields as $path => $_) {
            if ($this->keywordMatch($this->lastSegment($path), $keywords)) {
                return true;
            }
        }
        return false;
    }

    private function matchingPaths(array $fields, array $keywords): array
    {
        $paths = [];
        foreach ($fields as $path => $_) {
            if ($this->keywordMatch($this->lastSegment($path), $keywords)) {
                $paths[] = $path;
            }
        }
        return $paths;
    }

    private function keywordMatch(string $field, array $keywords): bool
    {
        $lower = strtolower($field);
        foreach ($keywords as $kw) {
            if (str_contains($lower, strtolower($kw))) {
                return true;
            }
        }
        return false;
    }

    // =========================================================================
    // String / path utilities
    // =========================================================================

    private function lastSegment(string $path): string
    {
        $clean = str_replace(['[]', '[*]'], '', $path);
        $parts = array_filter(explode('.', $clean));
        return (string) (end($parts) ?: $path);
    }

    private function pathToName(string $path): string
    {
        $seg  = $this->lastSegment($path);
        $name = str_replace(['_', '-'], ' ', $seg);
        return ucwords(trim($name));
    }

    private function toSnakeCase(string $name): string
    {
        return strtolower(preg_replace('/[\s\-]+/', '_', trim($name)) ?? $name);
    }

    private function guessTableFromPath(string $path): string
    {
        $parts = array_filter(explode('.', str_replace(['[]', '[*]'], '', $path)));
        $first = array_shift($parts);
        return $this->toSnakeCase($first ?? 'unknown');
    }

    private function deduplicateRecs(array $recs): array
    {
        $seen   = [];
        $unique = [];

        foreach ($recs as $rec) {
            $sig = ($rec['table'] ?? '') . '|' . ($rec['column'] ?? '') . '|' . ($rec['type'] ?? '');
            if (!isset($seen[$sig])) {
                $seen[$sig] = true;
                $unique[]   = $rec;
            }
        }

        return $unique;
    }
}
