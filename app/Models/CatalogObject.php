<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CatalogObject extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'external_id',
        'source_type',
        'object_type_id',
        'name',
        'slug',
        'description',
        'lifecycle_status',
        'manual_override',
        'is_active',
        'position',
        'meta',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'manual_override' => 'boolean',
        'is_active' => 'boolean',
        'position' => 'integer',
        'meta' => 'array',
    ];

    public function objectType(): BelongsTo
    {
        return $this->belongsTo(CatalogObjectType::class, 'object_type_id');
    }

    public function propertyValues(): HasMany
    {
        return $this->hasMany(ObjectPropertyValue::class, 'catalog_object_id');
    }
}

