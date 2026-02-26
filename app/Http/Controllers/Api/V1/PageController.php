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

class PageController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PageService $pageService
    ) {}

    /**
     * GET /api/v1/admin/pages
     * List all pages (paginated).
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $pages = $this->pageService->getAllPages($perPage);

        return $this->success($pages);
    }

    /**
     * GET /api/v1/admin/pages/{page}
     * Show a single page by ID (admin).
     */
    public function show(Page $page): JsonResponse
    {
        $page->load('sections');

        return $this->success($page);
    }

    /**
     * POST /api/v1/admin/pages
     * Create a new page.
     */
    public function store(StorePageRequest $request): JsonResponse
    {
        $page = $this->pageService->createPage($request->validated());

        return $this->created($page, 'Page created successfully');
    }

    /**
     * PUT /api/v1/admin/pages/{page}
     * Update an existing page.
     */
    public function update(UpdatePageRequest $request, Page $page): JsonResponse
    {
        $updated = $this->pageService->updatePage($page, $request->validated());

        return $this->success($updated, 'Page updated successfully');
    }

    /**
     * DELETE /api/v1/admin/pages/{page}
     * Delete a page.
     */
    public function destroy(Page $page): JsonResponse
    {
        $this->pageService->deletePage($page);

        return $this->success(null, 'Page deleted successfully');
    }
}
