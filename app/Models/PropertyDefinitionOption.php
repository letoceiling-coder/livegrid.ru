<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyDefinitionOption extends Model
{
    protected $fillable = [
        'property_definition_id',
        'value',
        'label',
        'is_active',
        'position',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'position' => 'integer',
    ];

    public function definition(): BelongsTo
    {
        return $this->belongsTo(PropertyDefinition::class, 'property_definition_id');
    }
}

