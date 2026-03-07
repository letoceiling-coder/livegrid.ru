<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PropertyDefinition extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'description',
        'data_type',
        'is_required',
        'is_filterable',
        'is_multivalue',
        'default_value',
        'object_type_id',
        'is_active',
        'position',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'is_filterable' => 'boolean',
        'is_multivalue' => 'boolean',
        'is_active' => 'boolean',
        'position' => 'integer',
    ];

    public function objectType(): BelongsTo
    {
        return $this->belongsTo(CatalogObjectType::class, 'object_type_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(PropertyDefinitionOption::class, 'property_definition_id');
    }

    public function values(): HasMany
    {
        return $this->hasMany(ObjectPropertyValue::class, 'property_definition_id');
    }
}

