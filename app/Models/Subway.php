<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Subway station from subways.json feed.
 *
 * @property string $id   MongoDB ObjectID (char 24)
 * @property int|null $crm_id
 * @property string $name
 * @property string|null $line_name
 * @property string|null $line_color
 */
class Subway extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'crm_id', 'name', 'line_name', 'line_color'];

    // ── Relations ────────────────────────────────────────────────────────────

    public function blocks(): BelongsToMany
    {
        return $this->belongsToMany(Block::class, 'block_subway')
            ->withPivot(['travel_time', 'travel_type']);
    }
}
