<?php

namespace App\Query;

use App\Models\Block;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Query object for "Similar Blocks" logic.
 *
 * Design goals:
 *  - Select ONLY columns consumed by BlockListResource.
 *  - Inject the same four selectSub aggregates that BlockController uses
 *    so BlockListResource receives price_from, price_per_m2_from,
 *    units_count, nearest_deadline_at as virtual attributes.
 *  - HAVING units_count > 0 filters out ЖК with no active apartments.
 *  - NULLs-last sort: blocks without any apartment price appear at the end.
 *
 * Matching strategy:
 *  - District: hard match (district_id on the blocks table)
 *  - Sorted by price_from ASC so the cheapest similar complex appears first.
 *
 * Returns a Builder so the caller can further constrain if needed.
 */
class SimilarBlockQuery
{
    public const LIMIT = 4;

    /**
     * Scalar columns from the blocks table needed by BlockListResource.
     * Omits: crm_id, deadline_at (feed field), min_price, max_price, min_area,
     * max_area, geometry_json, location, status, description, created_at,
     * updated_at — none are rendered in a list card.
     *
     * @var list<string>
     */
    private const SELECT = [
        'id', 'name', 'address', 'is_city',
        'district_id', 'district_name',
        'builder_id', 'builder_name',
        'lat', 'lng',
        'images',
    ];

    /**
     * Build the similar blocks query for a given target block.
     *
     * When the target block has no district, we return an empty result set
     * rather than returning random blocks — an explicit empty is safer UX.
     */
    public function build(Block $target): Builder
    {
        $districtId = $target->district_id;

        // ── Aggregate sub-selects (mirrors BlockController::index) ─────────────
        // Using DB::table (not Eloquent) to avoid nested model bootstrapping.
        // is_deleted = 0 added manually because these are raw sub-queries that
        // do not pass through the Apartment model's global scope.
        $priceFromSub = DB::table('apartments')
            ->selectRaw('MIN(price)')
            ->whereColumn('block_id', 'blocks.id')
            ->where('is_deleted', false);

        $pricePerM2Sub = DB::table('apartments')
            ->selectRaw('MIN(price_per_meter)')
            ->whereColumn('block_id', 'blocks.id')
            ->where('is_deleted', false);

        $unitsCountSub = DB::table('apartments')
            ->selectRaw('COUNT(*)')
            ->whereColumn('block_id', 'blocks.id')
            ->where('is_deleted', false);

        $nearestDeadlineSub = DB::table('buildings')
            ->selectRaw('MIN(deadline_at)')
            ->whereColumn('block_id', 'blocks.id');

        // ── Base query ────────────────────────────────────────────────────────
        $query = Block::query()
            ->select(self::SELECT)
            ->selectSub($priceFromSub,       'price_from')
            ->selectSub($pricePerM2Sub,      'price_per_m2_from')
            ->selectSub($unitsCountSub,      'units_count')
            ->selectSub($nearestDeadlineSub, 'nearest_deadline_at')
            // ── Exclude current block ─────────────────────────────────────────
            ->where('id', '!=', $target->id)
            // ── District match (required) ─────────────────────────────────────
            // If district is unknown, whereNull produces zero results intentionally.
            ->when(
                $districtId,
                fn (Builder $q) => $q->where('district_id', $districtId),
                fn (Builder $q) => $q->whereRaw('1 = 0'), // no district → no results
            )
            // ── Only blocks with at least one active apartment ────────────────
            ->havingRaw('units_count > 0')
            // ── Sort: cheapest similar block first; NULLs last ────────────────
            ->orderByRaw('price_from IS NULL, price_from ASC')
            ->limit(self::LIMIT);

        return $query;
    }
}
