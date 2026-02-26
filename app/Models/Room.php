<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Room type from rooms.json feed.
 * crm_id is the natural PK: 0=Studio, 1=1-room, 2=2-room, 3=3-room, 4=4-room, etc.
 *
 * @property int $crm_id   PRIMARY KEY
 * @property string|null $feed_id  MongoDB _id
 * @property string $name  e.g. "Студии", "1-к.кв"
 */
class Room extends Model
{
    /** crm_id is the business PK, not auto-increment */
    protected $primaryKey = 'crm_id';
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = ['crm_id', 'feed_id', 'name'];

    // ── Relations ────────────────────────────────────────────────────────────

    public function apartments(): HasMany
    {
        return $this->hasMany(Apartment::class, 'rooms_crm_id', 'crm_id');
    }
}
