<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CatalogObjectType extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'description',
        'is_active',
        'position',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'position' => 'integer',
    ];

    public function objects(): HasMany
    {
        return $this->hasMany(CatalogObject::class, 'object_type_id');
    }

    public function propertyDefinitions(): HasMany
    {
        return $this->hasMany(PropertyDefinition::class, 'object_type_id');
    }
}

