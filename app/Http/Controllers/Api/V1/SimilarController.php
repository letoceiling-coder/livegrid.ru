<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApartmentListResource;
use App\Http\Resources\BlockListResource;
use App\Models\Apartment;
use App\Models\Block;
use App\Query\SimilarApartmentQuery;
use App\Query\SimilarBlockQuery;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Similar items API.
 *
 * GET  /api/v1/apartments/{id}/similar  — up to 8 similar apartments
 * GET  /api/v1/blocks/{id}/similar      — up to 4 similar blocks (ЖК)
 *
 * Both endpoints are read-only, unauthenticated, and cache-friendly.
 * No pagination — the Query layer enforces a hard LIMIT.
 */
class SimilarController extends Controller
{
    public function __construct(
        private readonly SimilarApartmentQuery $apartmentQuery,
        private readonly SimilarBlockQuery     $blockQuery,
    ) {}

    // ── GET /api/v1/apartments/{id}/similar ───────────────────────────────────

    /**
     * Return apartments similar to the given one.
     *
     * Matching: same district, room ±1, price ±15 %, sorted by |price – target|.
     *
     * The Apartment model's global scope ensures is_deleted = 0 on both the
     * target lookup (findOrFail) and the similarity query (build → get).
     * A deleted apartment returns 404 automatically.
     */
    public function apartments(string $id): AnonymousResourceCollection
    {
        $target  = Apartment::findOrFail($id);
        $similar = $this->apartmentQuery->build($target)->get();

        return ApartmentListResource::collection($similar);
    }

    // ── GET /api/v1/blocks/{id}/similar ──────────────────────────────────────

    /**
     * Return blocks (ЖК) similar to the given one.
     *
     * Matching: same district_id, sorted by price_from ASC.
     * Returns at most 4 results. If the block has no district info, returns [].
     */
    public function blocks(string $id): AnonymousResourceCollection
    {
        $target  = Block::findOrFail($id);
        $similar = $this->blockQuery->build($target)->get();

        return BlockListResource::collection($similar);
    }
}
