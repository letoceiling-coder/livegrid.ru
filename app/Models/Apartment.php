<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Apartment (квартира) from apartments.json feed.
 * Contains denormalized block/building fields for fast filter performance.
 * Uses is_deleted + last_seen_at instead of Laravel SoftDeletes trait.
 *
 * @property string $id
 * @property int|null $crm_id
 * @property string $building_id
 * @property string $block_id
 * @property int|null $room
 * @property int|null $rooms_crm_id
 * @property int|null $floor
 * @property int|null $floors_total
 * @property string|null $number
 * @property int|null $wc_count
 * @property string|null $area_total
 * @property string|null $area_living
 * @property string|null $area_kitchen
 * @property string|null $area_given
 * @property string|null $area_balconies
 * @property string|null $area_rooms
 * @property string|null $area_rooms_total
 * @property string|null $price
 * @property string|null $price_per_meter
 * @property string|null $finishing_id
 * @property string|null $building_type_id
 * @property string|null $plan_url
 * @property string|null $block_name
 * @property string|null $block_district_id
 * @property string|null $block_district_name
 * @property string|null $block_builder_id
 * @property string|null $block_builder_name
 * @property float|null $block_lat
 * @property float|null $block_lng
 * @property bool $block_is_city
 * @property \Illuminate\Support\Carbon|null $building_deadline_at
 * @property bool $is_deleted
 * @property \Illuminate\Support\Carbon|null $last_seen_at
 */
class Apartment extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'crm_id', 'building_id', 'block_id',
        'room', 'rooms_crm_id', 'floor', 'floors_total', 'number', 'wc_count',
        'area_total', 'area_living', 'area_kitchen', 'area_given',
        'area_balconies', 'area_rooms', 'area_rooms_total',
        'price', 'price_per_meter',
        'finishing_id', 'building_type_id', 'plan_url',
        'block_name', 'block_district_id', 'block_district_name',
        'block_builder_id', 'block_builder_name',
        'block_lat', 'block_lng', 'block_is_city',
        'building_deadline_at',
        'is_deleted', 'last_seen_at',
    ];

    protected $casts = [
        'block_is_city'        => 'boolean',
        'is_deleted'           => 'boolean',
        'last_seen_at'         => 'datetime',
        'building_deadline_at' => 'date',
        'area_total'           => 'decimal:2',
        'area_living'          => 'decimal:2',
        'area_kitchen'         => 'decimal:2',
        'area_given'           => 'decimal:2',
        'area_balconies'       => 'decimal:2',
        'area_rooms_total'     => 'decimal:2',
        'price'                => 'decimal:2',
        'price_per_meter'      => 'decimal:2',
        'block_lat'            => 'decimal:7',
        'block_lng'            => 'decimal:7',
    ];

    // ── Relations ────────────────────────────────────────────────────────────

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class, 'building_id');
    }

    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class, 'block_id');
    }

    public function finishing(): BelongsTo
    {
        return $this->belongsTo(Finishing::class, 'finishing_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'rooms_crm_id', 'crm_id');
    }

    public function buildingType(): BelongsTo
    {
        return $this->belongsTo(BuildingType::class, 'building_type_id');
    }

    // ── Default scope: exclude deleted ───────────────────────────────────────

    protected static function booted(): void
    {
        static::addGlobalScope('active', function (Builder $query) {
            $query->where('is_deleted', false);
        });
    }

    // ── Query Scopes ─────────────────────────────────────────────────────────

    /**
     * Filter by price range.
     *
     * @param Builder $query
     * @param int|float $min
     * @param int|float $max
     */
    public function scopePriceBetween(Builder $query, int|float $min, int|float $max): Builder
    {
        return $query->whereBetween('price', [$min, $max]);
    }

    /**
     * Filter by total area range.
     *
     * @param Builder $query
     * @param float $min
     * @param float $max
     */
    public function scopeAreaBetween(Builder $query, float $min, float $max): Builder
    {
        return $query->whereBetween('area_total', [$min, $max]);
    }

    /**
     * Filter by room counts.
     *
     * @param Builder $query
     * @param array<int> $rooms   e.g. [0, 1, 2] for studio + 1-room + 2-room
     */
    public function scopeRooms(Builder $query, array $rooms): Builder
    {
        return $query->whereIn('room', $rooms);
    }

    /**
     * Filter by district (region) IDs.
     *
     * @param Builder $query
     * @param array<string> $districts
     */
    public function scopeDistrict(Builder $query, array $districts): Builder
    {
        return $query->whereIn('block_district_id', $districts);
    }

    /**
     * Filter by builder IDs.
     *
     * @param Builder $query
     * @param array<string> $builders
     */
    public function scopeBuilder(Builder $query, array $builders): Builder
    {
        return $query->whereIn('block_builder_id', $builders);
    }

    /**
     * Filter by building deadline range.
     *
     * @param Builder $query
     * @param string $from  Date string e.g. "2024-01-01"
     * @param string $to    Date string e.g. "2026-12-31"
     */
    public function scopeDeadlineBetween(Builder $query, string $from, string $to): Builder
    {
        return $query->whereBetween('building_deadline_at', [$from, $to]);
    }

    /**
     * Full-text search on denormalized block name/builder/district.
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->whereRaw(
            'MATCH(block_name, block_builder_name, block_district_name) AGAINST(? IN BOOLEAN MODE)',
            [$term]
        );
    }

    /**
     * Geo filter: apartments whose block is within $radius meters of ($lat, $lng).
     *
     * Uses ST_Distance_Sphere — works with DECIMAL columns, no spatial index needed.
     *
     * @param Builder $query
     * @param float $lat
     * @param float $lng
     * @param int $radius  Meters
     */
    public function scopeGeoRadius(Builder $query, float $lat, float $lng, int $radius): Builder
    {
        return $query->whereNotNull('block_lat')
            ->whereNotNull('block_lng')
            ->whereRaw(
                'ST_Distance_Sphere(POINT(block_lng, block_lat), POINT(?, ?)) <= ?',
                [$lng, $lat, $radius]
            );
    }

    /**
     * Scope: include deleted (bypass the global scope).
     */
    public function scopeWithDeleted(Builder $query): Builder
    {
        return $query->withoutGlobalScope('active');
    }
}
