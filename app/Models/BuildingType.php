<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Building construction type from buildingtypes.json feed.
 * Examples: "Монолитный", "Панельный", "Кирпичный"
 *
 * @property string $id   MongoDB ObjectID (char 24)
 * @property int|null $crm_id
 * @property string $name
 */
class BuildingType extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'crm_id', 'name'];

    // ── Relations ────────────────────────────────────────────────────────────

    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class, 'building_type_id');
    }
}
