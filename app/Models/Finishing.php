<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Finishing type from finishings.json feed.
 * Examples: "Без отделки", "Чистовая", "Подчистовая", "С мягкой мебелью", "С ремонтом"
 *
 * @property string $id   MongoDB ObjectID (char 24)
 * @property int|null $crm_id
 * @property string $name
 */
class Finishing extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'crm_id', 'name'];

    // ── Relations ────────────────────────────────────────────────────────────

    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'finishing_id');
    }
}
