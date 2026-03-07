<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Media extends Model
{
    use HasFactory;

    protected $fillable = [
        'path',
        'alt',
        'type',
        'folder',
        'tags',
        'is_active',
        'position',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_active' => 'boolean',
        'position' => 'integer',
    ];

    protected $appends = ['url'];

    /**
     * Get the full URL for the media file.
     */
    public function getUrlAttribute(): string
    {
        return asset('storage/' . $this->path);
    }
}
