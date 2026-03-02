<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\News;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->input('per_page', 20), 100);
        $page = max((int) $request->input('page', 1), 1);

        $query = News::query()->published();

        // Filter by category if provided
        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        $news = $query->latest()
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $news->items(),
            'meta' => [
                'current_page' => $news->currentPage(),
                'last_page' => $news->lastPage(),
                'per_page' => $news->perPage(),
                'total' => $news->total(),
            ],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $news = News::where('slug', $slug)
            ->published()
            ->firstOrFail();

        return response()->json($news);
    }

    public function categories(): JsonResponse
    {
        $categories = News::query()
            ->published()
            ->whereNotNull('category')
            ->distinct()
            ->pluck('category')
            ->filter()
            ->values();

        return response()->json($categories);
    }
}
