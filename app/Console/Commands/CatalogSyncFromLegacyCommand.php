<?php

namespace App\Console\Commands;

use App\Models\Apartment;
use App\Models\Block;
use App\Models\CatalogObject;
use App\Models\CatalogObjectType;
use App\Models\ObjectPropertyValue;
use App\Models\PropertyDefinition;
use Illuminate\Console\Command;

/**
 * Syncs blocks and apartments from legacy tables into catalog_objects + object_property_values.
 * Run after feed:sync or manually. Idempotent (upsert by external_id).
 *
 * Usage: php artisan catalog:sync-from-legacy
 */
class CatalogSyncFromLegacyCommand extends Command
{
    protected $signature = 'catalog:sync-from-legacy {--dry-run : Only report counts, do not write}';

    protected $description = 'Sync blocks and apartments from feed tables into catalog_objects';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->warn('Dry-run: no changes will be written.');
        }

        $blockType = CatalogObjectType::where('code', 'block')->first();
        $apartmentType = CatalogObjectType::where('code', 'apartment')->first();

        if (!$blockType || !$apartmentType) {
            $this->error('Run: php artisan db:seed --class=CatalogObjectTypesAndPropertiesSeeder');
            return self::FAILURE;
        }

        $defsByType = [
            'block' => PropertyDefinition::where('object_type_id', $blockType->id)->pluck('id', 'code')->all(),
            'apartment' => PropertyDefinition::where('object_type_id', $apartmentType->id)->pluck('id', 'code')->all(),
        ];

        $blocksCount = $this->syncBlocks($blockType, $defsByType['block'] ?? [], $dryRun);
        $apartmentsCount = $this->syncApartments($apartmentType, $defsByType['apartment'] ?? [], $dryRun);

        $this->info("Blocks: {$blocksCount}, Apartments: {$apartmentsCount}");
        return self::SUCCESS;
    }

    private function syncBlocks(CatalogObjectType $type, array $defIds, bool $dryRun): int
    {
        $count = 0;
        Block::query()->orderBy('id')->chunk(500, function ($blocks) use ($type, $defIds, $dryRun, &$count) {
            foreach ($blocks as $block) {
                if ($dryRun) {
                    $count++;
                    continue;
                }
                $obj = CatalogObject::updateOrCreate(
                    [
                        'external_id' => $block->id,
                        'object_type_id' => $type->id,
                    ],
                    [
                        'source_type' => 'feed',
                        'name' => $block->name,
                        'slug' => $block->slug ?? null,
                        'description' => $block->description,
                        'lifecycle_status' => 'published',
                        'manual_override' => false,
                        'is_active' => (bool) ($block->is_active ?? true),
                        'position' => (int) ($block->position ?? 0),
                        'meta' => [
                            'images' => $block->images,
                            'geometry_json' => $block->geometry_json,
                        ],
                    ]
                );

                $values = [
                    'address' => $block->address,
                    'district_id' => $block->district_id,
                    'district_name' => $block->district_name,
                    'builder_id' => $block->builder_id,
                    'builder_name' => $block->builder_name,
                    'lat' => $block->lat,
                    'lng' => $block->lng,
                    'is_city' => $block->is_city,
                    'status' => $block->status,
                    'deadline_at' => $block->deadline_at?->format('Y-m-d'),
                    'min_price' => $block->min_price,
                    'max_price' => $block->max_price,
                    'min_area' => $block->min_area,
                    'max_area' => $block->max_area,
                    'images' => $block->images,
                    'geometry_json' => $block->geometry_json,
                ];

                $this->upsertPropertyValues($obj->id, $defIds, $values, 'feed');
                $count++;
            }
        });

        return $count;
    }

    private function syncApartments(CatalogObjectType $type, array $defIds, bool $dryRun): int
    {
        $count = 0;
        Apartment::query()->withoutGlobalScope('active')->orderBy('id')->chunk(500, function ($apartments) use ($type, $defIds, $dryRun, &$count) {
            foreach ($apartments as $apt) {
                if ($dryRun) {
                    $count++;
                    continue;
                }
                $name = trim(($apt->block_name ?? '') . ' — ' . ($apt->number ?? $apt->id));
                $slug = \Illuminate\Support\Str::slug($name) . '-' . $apt->id;

                $obj = CatalogObject::updateOrCreate(
                    [
                        'external_id' => $apt->id,
                        'object_type_id' => $type->id,
                    ],
                    [
                        'source_type' => 'feed',
                        'name' => $name,
                        'slug' => $slug,
                        'description' => null,
                        'lifecycle_status' => $apt->is_deleted ? 'archived' : 'published',
                        'manual_override' => false,
                        'is_active' => !$apt->is_deleted && (bool) ($apt->is_active ?? true),
                        'position' => (int) ($apt->position ?? 0),
                        'meta' => [
                            'plan_url' => $apt->plan_url,
                            'is_deleted' => $apt->is_deleted,
                            'is_hot' => $apt->is_hot ?? false,
                            'is_start_sales' => $apt->is_start_sales ?? false,
                        ],
                    ]
                );

                $values = [
                    'block_id' => $apt->block_id,
                    'building_id' => $apt->building_id,
                    'room' => $apt->room,
                    'floor' => $apt->floor,
                    'floors_total' => $apt->floors_total,
                    'number' => $apt->number,
                    'area_total' => $apt->area_total,
                    'area_living' => $apt->area_living,
                    'area_kitchen' => $apt->area_kitchen,
                    'price' => $apt->price,
                    'price_per_meter' => $apt->price_per_meter,
                    'finishing_id' => $apt->finishing_id,
                    'building_type_id' => $apt->building_type_id,
                    'block_name' => $apt->block_name,
                    'block_district_id' => $apt->block_district_id,
                    'block_district_name' => $apt->block_district_name,
                    'block_builder_id' => $apt->block_builder_id,
                    'block_builder_name' => $apt->block_builder_name,
                    'block_lat' => $apt->block_lat,
                    'block_lng' => $apt->block_lng,
                    'building_deadline_at' => $apt->building_deadline_at?->format('Y-m-d'),
                    'plan_url' => $apt->plan_url,
                ];

                $this->upsertPropertyValues($obj->id, $defIds, $values, 'feed');
                $count++;
            }
        });

        return $count;
    }

    private function upsertPropertyValues(int $objectId, array $defIds, array $values, string $source): void
    {
        foreach ($values as $code => $raw) {
            if (!isset($defIds[$code])) {
                continue;
            }
            $defId = $defIds[$code];
            $def = PropertyDefinition::find($defId);
            if (!$def) {
                continue;
            }

            $row = [
                'value_text' => null,
                'value_number' => null,
                'value_boolean' => null,
                'value_date' => null,
                'value_json' => null,
                'value_source' => $source,
                'is_locked_by_manual' => false,
            ];

            switch ($def->data_type) {
                case 'number':
                    $row['value_number'] = ($raw === null || $raw === '') ? null : (float) $raw;
                    break;
                case 'boolean':
                    $row['value_boolean'] = (bool) $raw;
                    break;
                case 'date':
                    $row['value_date'] = $raw instanceof \DateTimeInterface ? $raw->format('Y-m-d') : ($raw ? (string) $raw : null);
                    break;
                case 'json':
                    $row['value_json'] = is_array($raw) || is_object($raw) ? (array) $raw : ($raw ? (array) json_decode((string) $raw, true) : null);
                    break;
                case 'string':
                default:
                    $row['value_text'] = ($raw === null || $raw === '') ? null : (string) $raw;
                    break;
            }

            ObjectPropertyValue::updateOrCreate(
                [
                    'catalog_object_id' => $objectId,
                    'property_definition_id' => $defId,
                ],
                $row
            );
        }
    }
}
