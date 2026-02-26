<?php

namespace App\Services;

use App\Models\Page;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class PageService
{
    /**
     * Get all pages with pagination.
     */
    public function getAllPages(int $perPage = 15): LengthAwarePaginator
    {
        return Page::with('sections')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    /**
     * Find a page by its slug (public, only published).
     */
    public function getPublishedPageBySlug(string $slug): ?Page
    {
        return Page::with('sections')
            ->where('slug', $slug)
            ->where('is_published', true)
            ->first();
    }

    /**
     * Find a page by ID (admin).
     */
    public function findById(int $id): ?Page
    {
        return Page::with('sections')->find($id);
    }

    /**
     * Create a new page.
     */
    public function createPage(array $data): Page
    {
        return Page::create($data);
    }

    /**
     * Update an existing page.
     */
    public function updatePage(Page $page, array $data): Page
    {
        $page->update($data);

        return $page->fresh('sections');
    }

    /**
     * Delete a page.
     */
    public function deletePage(Page $page): bool
    {
        return $page->delete();
    }
}
