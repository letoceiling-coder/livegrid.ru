<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Services\PageService;
use Illuminate\Http\JsonResponse;

/**
 * Public page controller.
 *
 * Serves published pages to unauthenticated visitors (React SPA fetches these).
 * No auth middleware — these routes are public.
 *
 * Routes:
 *   GET /api/v1/pages/{slug}  — fetch a published page by slug
 *
 * Slug pattern: [a-z0-9-]+ (enforced in routes/api.php via ->where())
 *
 * @see \App\Services\PageService::getPublishedPageBySlug()
 */
class PublicPageController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PageService $pageService
    ) {}

    /**
     * Return a single published page with its sections.
     *
     * Only pages with `is_published = true` are returned.
     * Sections are eager-loaded and ordered by `sort_order`.
     *
     * @param string $slug  Page slug (e.g. "home", "about", "contacts")
     * @return JsonResponse  200: { success, data: Page+sections } | 404: { success: false, message }
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
