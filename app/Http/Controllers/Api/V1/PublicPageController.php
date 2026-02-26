<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Services\PageService;
use Illuminate\Http\JsonResponse;

class PublicPageController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PageService $pageService
    ) {}

    /**
     * GET /api/v1/pages/{slug}
     * Show a published page by slug (public).
     */
    public function show(string $slug): JsonResponse
    {
        $page = $this->pageService->getPublishedPageBySlug($slug);

        if (! $page) {
            return $this->error('Page not found', 404);
        }

        return $this->success($page);
    }
}
