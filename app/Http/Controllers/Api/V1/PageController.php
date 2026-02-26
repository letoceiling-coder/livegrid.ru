<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StorePageRequest;
use App\Http\Requests\Api\V1\UpdatePageRequest;
use App\Http\Traits\ApiResponse;
use App\Models\Page;
use App\Services\PageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin pages controller.
 *
 * CRUD for Page resources. All routes require auth:sanctum middleware.
 * Delegates business logic to PageService; controller is thin.
 *
 * Routes (prefix: /api/v1/admin/pages):
 *   GET    /           — paginated list
 *   GET    /{page}     — single page with sections
 *   POST   /           — create page
 *   PUT    /{page}     — update page
 *   DELETE /{page}     — delete page
 *
 * @see \App\Services\PageService
 * @see \App\Http\Requests\Api\V1\StorePageRequest
 * @see \App\Http\Requests\Api\V1\UpdatePageRequest
 */
class PageController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PageService $pageService
    ) {}

    /**
     * Return a paginated list of all pages.
     *
     * @queryParam per_page int  Items per page (default 15). Example: 10
     *
     * @return JsonResponse  200: { success, data: LengthAwarePaginator<Page> }
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $pages = $this->pageService->getAllPages($perPage);

        return $this->success($pages);
    }

    /**
     * Show a single page with eager-loaded sections.
     *
     * Uses route model binding — 404 if page not found.
     * Admin endpoint: returns pages regardless of is_published status.
     *
     * @param Page $page  Route model bound by {id}
     * @return JsonResponse  200: { success, data: Page + sections[] }
     */
    public function show(Page $page): JsonResponse
    {
        $page->load('sections');

        return $this->success($page);
    }

    /**
     * Create a new page.
     *
     * Request is validated by StorePageRequest (slug uniqueness, required fields).
     * Delegates creation to PageService.
     *
     * @param StorePageRequest $request  Validated request (title, slug, meta_*, is_published)
     * @return JsonResponse  201: { success, message, data: Page }
     */
    public function store(StorePageRequest $request): JsonResponse
    {
        $page = $this->pageService->createPage($request->validated());

        return $this->created($page, 'Page created successfully');
    }

    /**
     * Update an existing page.
     *
     * All fields are optional (PATCH semantics via UpdatePageRequest).
     * Slug uniqueness check ignores the current page's own slug.
     *
     * @param UpdatePageRequest $request  Validated partial update payload
     * @param Page              $page     Route model bound by {id}
     * @return JsonResponse  200: { success, message, data: Page }
     */
    public function update(UpdatePageRequest $request, Page $page): JsonResponse
    {
        $updated = $this->pageService->updatePage($page, $request->validated());

        return $this->success($updated, 'Page updated successfully');
    }

    /**
     * Delete a page.
     *
     * Hard delete — no soft deletes configured for Page model.
     * Associated sections are cascade-deleted at DB level.
     *
     * @param Page $page  Route model bound by {id}
     * @return JsonResponse  200: { success, message, data: null }
     */
    public function destroy(Page $page): JsonResponse
    {
        $this->pageService->deletePage($page);

        return $this->success(null, 'Page deleted successfully');
    }
}
