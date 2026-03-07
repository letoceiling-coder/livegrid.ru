<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use App\Models\Builder as BuilderModel;

/**
 * Residential complex (ЖК) from blocks.json feed.
 *
 * @property string $id
 * @property int|null $crm_id
 * @property string $name
 * @property string|null $description
 * @property string|null $address
 * @property string|null $district_id
 * @property string|null $district_name
 * @property string|null $builder_id
 * @property string|null $builder_name
 * @property float|null $lat
 * @property float|null $lng
 * @property array|null $geometry_json
 * @property bool $is_city
 * @property int $status
 * @property \Illuminate\Support\Carbon|null $deadline_at
 * @property float|null $min_price
 * @property float|null $max_price
 * @property float|null $min_area
 * @property float|null $max_area
 * @property array|null $images
 * @property float|null $price_from         Materialized: MIN(apartments.price) for active units
 * @property int|null   $units_count        Materialized: COUNT of active apartments
 * @property \Illuminate\Support\Carbon|null $nearest_deadline_at Materialized: MIN(building_deadline_at)
 */
class Block extends Model
{
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'crm_id', 'name', 'description', 'address',
        'district_id', 'district_name', 'builder_id', 'builder_name',
        'lat', 'lng', 'geometry_json', 'location',
        'is_city', 'status', 'deadline_at',
        'min_price', 'max_price', 'min_area', 'max_area', 'images',
        // Materialized aggregates — updated by FeedSyncService::updateBlockAggregates()
        'price_from', 'units_count', 'nearest_deadline_at',
        'is_active', 'position',
    ];

    protected $casts = [
        'is_city'              => 'boolean',
        'deadline_at'          => 'date',
        'nearest_deadline_at'  => 'date',
        'geometry_json'        => 'array',
        'images'               => 'array',
        // float → JSON number (not string)
        'lat'                  => 'float',
        'lng'                  => 'float',
        'min_price'            => 'float',
        'max_price'            => 'float',
        'min_area'             => 'float',
        'max_area'             => 'float',
        // Materialized aggregate columns
        'price_from'           => 'float',
        'units_count'          => 'integer',
        'is_active'           => 'boolean',
        'position'            => 'integer',
    ];

    // ── Accessors ────────────────────────────────────────────────────────────

    /**
     * Generate URL-friendly slug from block name + id.
     * Format: "zhk-snezhnyy-barс-697c6dcaebae21b1814e0b76"
     */
    public function getSlugAttribute(): string
    {
        $slug = $this->transliterate($this->name);
        return $slug . '-' . $this->id;
    }

    /**
     * Simple Cyrillic → Latin transliteration (ISO 9 subset).
     */
    private function transliterate(string $text): string
    {
        $map = [
            'а' => 'a',   'б' => 'b',   'в' => 'v',   'г' => 'g',
            'д' => 'd',   'е' => 'e',   'ё' => 'yo',  'ж' => 'zh',
            'з' => 'z',   'и' => 'i',   'й' => 'y',   'к' => 'k',
            'л' => 'l',   'м' => 'm',   'н' => 'n',   'о' => 'o',
            'п' => 'p',   'р' => 'r',   'с' => 's',   'т' => 't',
            'у' => 'u',   'ф' => 'f',   'х' => 'kh',  'ц' => 'ts',
            'ч' => 'ch',  'ш' => 'sh',  'щ' => 'shch','ъ' => '',
            'ы' => 'y',   'ь' => '',    'э' => 'e',   'ю' => 'yu',
            'я' => 'ya',
            'А' => 'A',   'Б' => 'B',   'В' => 'V',   'Г' => 'G',
            'Д' => 'D',   'Е' => 'E',   'Ё' => 'Yo',  'Ж' => 'Zh',
            'З' => 'Z',   'И' => 'I',   'Й' => 'Y',   'К' => 'K',
            'Л' => 'L',   'М' => 'M',   'Н' => 'N',   'О' => 'O',
            'П' => 'P',   'Р' => 'R',   'С' => 'S',   'Т' => 'T',
            'У' => 'U',   'Ф' => 'F',   'Х' => 'Kh',  'Ц' => 'Ts',
            'Ч' => 'Ch',  'Ш' => 'Sh',  'Щ' => 'Shch','Ъ' => '',
            'Ы' => 'Y',   'Ь' => '',    'Э' => 'E',   'Ю' => 'Yu',
            'Я' => 'Ya',
        ];

        $slug = strtr($text, $map);
        $slug = mb_strtolower($slug);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
        $slug = trim($slug, '-');

        return $slug;
    }

    // ── Relations ────────────────────────────────────────────────────────────

    public function district(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'district_id');
    }

    public function builder(): BelongsTo
    {
        return $this->belongsTo(BuilderModel::class, 'builder_id');
    }

    public function subways(): BelongsToMany
    {
        return $this->belongsToMany(Subway::class, 'block_subway')
            ->withPivot(['travel_time', 'travel_type']);
    }

    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class, 'block_id');
    }

    public function apartments(): HasManyThrough
    {
        return $this->hasManyThrough(Apartment::class, Building::class, 'block_id', 'building_id');
    }

    // ── Query Scopes ─────────────────────────────────────────────────────────

    /** Full-text search on name and description */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        return $query->whereRaw(
            'MATCH(name, description) AGAINST(? IN BOOLEAN MODE)',
            [$term]
        );
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 1);
    }

    public function scopeInCity(Builder $query): Builder
    {
        return $query->where('is_city', true);
    }
}
