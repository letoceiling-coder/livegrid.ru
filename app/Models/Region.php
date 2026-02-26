<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Region (district) from regions.json feed.
 * Corresponds to the "Районы" (districts) endpoint.
 *
 * @property string $id   MongoDB ObjectID (char 24)
 * @property int|null $crm_id
 * @property string $name
 */
class Region extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'crm_id', 'name'];

    // ── Relations ────────────────────────────────────────────────────────────

    public function blocks(): HasMany
    {
        return $this->hasMany(Block::class, 'district_id');
    }
}
