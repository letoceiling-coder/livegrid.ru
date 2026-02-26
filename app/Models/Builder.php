<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Builder (developer) from builders.json feed.
 *
 * @property string $id   MongoDB ObjectID (char 24)
 * @property int|null $crm_id
 * @property string $name
 * @property string|null $logo_url
 */
class Builder extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'crm_id', 'name', 'logo_url'];

    // ── Relations ────────────────────────────────────────────────────────────

    public function blocks(): HasMany
    {
        return $this->hasMany(Block::class, 'builder_id');
    }
}
