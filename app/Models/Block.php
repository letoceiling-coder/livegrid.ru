<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

/**
 * Residential complex (ЖК) from blocks.json feed.
 *
 * @property string $id
 * @property int|null $crm_id
 * @property string $name
 * @property string|null $description
 * @property string|null $address
 * @property string|null $district_id
 * @property string|null $district_name
 * @property string|null $builder_id
 * @property string|null $builder_name
 * @property float|null $lat
 * @property float|null $lng
 * @property array|null $geometry_json
 * @property bool $is_city
 * @property int $status
 * @property \Illuminate\Support\Carbon|null $deadline_at
 * @property float|null $min_price
 * @property float|null $max_price
 * @property float|null $min_area
 * @property float|null $max_area
 * @property array|null $images
 */
class Block extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'crm_id', 'name', 'description', 'address',
        'district_id', 'district_name', 'builder_id', 'builder_name',
        'lat', 'lng', 'geometry_json', 'location',
        'is_city', 'status', 'deadline_at',
        'min_price', 'max_price', 'min_area', 'max_area', 'images',
    ];

    protected $casts = [
        'is_city'       => 'boolean',
        'deadline_at'   => 'date',
        'geometry_json' => 'array',
        'images'        => 'array',
        'lat'           => 'decimal:7',
        'lng'           => 'decimal:7',
        'min_price'     => 'decimal:2',
        'max_price'     => 'decimal:2',
        'min_area'      => 'decimal:2',
        'max_area'      => 'decimal:2',
    ];

    // ── Relations ────────────────────────────────────────────────────────────

    public function district(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'district_id');
    }

    public function builder(): BelongsTo
    {
        return $this->belongsTo(Builder::class, 'builder_id');
    }

    public function subways(): BelongsToMany
    {
        return $this->belongsToMany(Subway::class, 'block_subway')
            ->withPivot(['travel_time', 'travel_type']);
    }

    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class, 'block_id');
    }

    public function apartments(): HasManyThrough
    {
        return $this->hasManyThrough(Apartment::class, Building::class, 'block_id', 'building_id');
    }

    // ── Query Scopes ─────────────────────────────────────────────────────────

    /** Full-text search on name and description */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->whereRaw(
            'MATCH(name, description) AGAINST(? IN BOOLEAN MODE)',
            [$term]
        );
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 1);
    }

    public function scopeInCity(Builder $query): Builder
    {
        return $query->where('is_city', true);
    }
}
