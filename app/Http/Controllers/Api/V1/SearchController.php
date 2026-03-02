<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SearchResource;
use App\Models\Apartment;
use App\Models\Block;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Live search: residential complexes + apartments.
 *
 * GET /api/v1/search?q=string
 */
class SearchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
        ]);

        $q = trim($request->input('q'));
        $term = '%' . addslashes($q) . '%';

        // ЖК: name, district_name, metro (subways.name)
        $blocks = Block::query()
            ->where('units_count', '>', 0)
            ->where(function ($query) use ($term, $q) {
                $query->where('blocks.name', 'LIKE', $term)
                    ->orWhere('blocks.district_name', 'LIKE', $term)
                    ->orWhereHas('subways', fn ($sq) => $sq->where('subways.name', 'LIKE', $term));
            })
            ->with(['district', 'subways'])
            ->limit(5)
            ->get();

        // Квартиры: block_name (ЖК name) + number as fallback
        $apartments = Apartment::query()
            ->where(function ($query) use ($term) {
                $query->where('block_name', 'LIKE', $term)
                    ->orWhere('number', 'LIKE', $term);
            })
            ->with('block:id,name')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'residential_complexes' => SearchResource::formatBlocks($blocks),
                'apartments' => SearchResource::formatApartments($apartments),
            ],
        ]);
    }
}
