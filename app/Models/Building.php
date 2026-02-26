<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Building (корпус) from buildings.json feed.
 *
 * @property string $id
 * @property int|null $crm_id
 * @property string|null $block_id
 * @property string|null $name
 * @property string|null $building_type_id
 * @property int|null $floors_total
 * @property \Illuminate\Support\Carbon|null $deadline_at
 * @property int|null $queue
 * @property float|null $height
 * @property int $status
 * @property float|null $lat
 * @property float|null $lng
 * @property array|null $banks
 */
class Building extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'crm_id', 'block_id', 'name',
        'building_type_id', 'floors_total', 'deadline_at',
        'queue', 'height', 'status', 'lat', 'lng', 'banks',
    ];

    protected $casts = [
        'deadline_at' => 'date',
        'banks'       => 'array',
        'lat'         => 'decimal:7',
        'lng'         => 'decimal:7',
        'height'      => 'decimal:2',
    ];

    // ── Relations ────────────────────────────────────────────────────────────

    public function block(): BelongsTo
    {
        return $this->belongsTo(Block::class, 'block_id');
    }

    public function buildingType(): BelongsTo
    {
        return $this->belongsTo(BuildingType::class, 'building_type_id');
    }

    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'building_id');
    }

    // ── Query Scopes ─────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 1);
    }
}
