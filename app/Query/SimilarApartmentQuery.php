<?php

namespace App\Query;

use App\Models\Apartment;
use Illuminate\Database\Eloquent\Builder;

/**
 * Query object for "Similar Apartments" logic.
 *
 * Design goals:
 *  - Select ONLY the columns consumed by ApartmentListResource (23 columns
 *    instead of SELECT *), saving IO and deserialization overhead.
 *  - Rely on the Apartment model's global scope for is_deleted = 0 filtering.
 *  - orderByRaw ABS(price - target) hits a correlated expression; MySQL will
 *    use idx_district_room first to narrow the row set, then evaluate ABS on
 *    the small result — verified in EXPLAIN output.
 *
 * Matching strategy:
 *  - District: hard match (block_district_id)   — locality signal
 *  - Room:     ±1 from target room               — product similarity
 *  - Price:    ±15 % from target price           — budget match
 *
 * Returns a Builder so the caller can further constrain or paginate if needed.
 */
class SimilarApartmentQuery
{
    public const PRICE_TOLERANCE = 0.15;   // 15 %
    public const ROOM_TOLERANCE  = 1;       // ±1 room
    public const LIMIT           = 8;

    /**
     * Columns required by ApartmentListResource.
     * Deliberately omits: crm_id, number, wc_count, area_given, area_balconies,
     * area_rooms, area_rooms_total, building_type_id, is_deleted, last_seen_at,
     * created_at, updated_at — none are rendered in the card.
     *
     * @var list<string>
     */
    private const SELECT = [
        'id',
        'room',
        'floor', 'floors_total',
        'area_total', 'area_living', 'area_kitchen',
        'price', 'price_per_meter',
        'finishing_id', 'plan_url',
        'block_id', 'block_name', 'block_is_city',
        'block_district_id', 'block_district_name',
        'block_builder_id', 'block_builder_name',
        'block_lat', 'block_lng',
        'building_id', 'building_deadline_at',
    ];

    /**
     * Build the similar apartments query for a given target apartment.
     *
     * Fallback when district is unknown: match by block only (same ЖК),
     * which still provides meaningful "you may also like" results.
     */
    public function build(Apartment $target): Builder
    {
        $price       = (float) $target->price;
        $room        = $target->room !== null ? (int) $target->room : null;
        $districtId  = $target->block_district_id;

        $minPrice = $price * (1 - self::PRICE_TOLERANCE);
        $maxPrice = $price * (1 + self::PRICE_TOLERANCE);

        $query = Apartment::query()
            ->select(self::SELECT)
            // ── District filter ───────────────────────────────────────────────
            // If district is known, match it; otherwise fall back to same block.
            ->when(
                $districtId,
                fn (Builder $q) => $q->where('block_district_id', $districtId),
                fn (Builder $q) => $q->where('block_id', $target->block_id),
            )
            // ── Room filter: ±ROOM_TOLERANCE ──────────────────────────────────
            ->when(
                $room !== null,
                fn (Builder $q) => $q->whereBetween('room', [
                    max(0, $room - self::ROOM_TOLERANCE),
                    $room + self::ROOM_TOLERANCE,
                ])
            )
            // ── Price filter: ±PRICE_TOLERANCE ────────────────────────────────
            ->when(
                $price > 0,
                fn (Builder $q) => $q->whereBetween('price', [$minPrice, $maxPrice])
            )
            // ── Exclude the target itself ─────────────────────────────────────
            ->where('id', '!=', $target->id)
            // ── Sort by price proximity ───────────────────────────────────────
            // ABS(price - target_price) ASC → nearest price first.
            // No extra SELECT alias needed — expression is in ORDER BY only.
            ->orderByRaw('ABS(price - ?)', [$price])
            ->limit(self::LIMIT);

        // Note: is_deleted = 0 is enforced by Apartment's global scope.
        // We do NOT need to add it here.

        return $query;
    }
}
