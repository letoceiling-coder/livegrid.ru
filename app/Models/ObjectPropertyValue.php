<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ObjectPropertyValue extends Model
{
    protected $fillable = [
        'catalog_object_id',
        'property_definition_id',
        'value_text',
        'value_number',
        'value_boolean',
        'value_date',
        'value_json',
        'value_source',
        'is_locked_by_manual',
        'updated_by',
    ];

    protected $casts = [
        'value_boolean' => 'boolean',
        'value_date' => 'date',
        'value_json' => 'array',
        'is_locked_by_manual' => 'boolean',
    ];

    public function object(): BelongsTo
    {
        return $this->belongsTo(CatalogObject::class, 'catalog_object_id');
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(PropertyDefinition::class, 'property_definition_id');
    }
}

