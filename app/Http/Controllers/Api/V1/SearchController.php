<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SearchResource;
use App\Services\Search\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Live search: residential complexes + apartments.
 *
 * GET /api/v1/search?q=string
 *
 * Uses SearchService for unified search logic.
 */
class SearchController extends Controller
{
    public function __construct(
        private SearchService $searchService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:200'],
        ]);

        $q = trim($request->input('q'));
        $result = $this->searchService->search($q, [], [
            'limit_blocks'     => 5,
            'limit_apartments' => 5,
        ]);

        return response()->json([
            'success' => true,
            'data'    => [
                'residential_complexes' => SearchResource::formatBlocks($result['blocks']),
                'apartments'            => SearchResource::formatApartments($result['apartments']),
            ],
        ]);
    }
}
