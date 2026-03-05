<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SectionController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/v1/admin/sections
     * List all sections (optionally filter by page_id).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Section::with('page');

        if ($request->has('page_id')) {
            $query->where('page_id', $request->integer('page_id'));
        }

        $sections = $query->orderBy('sort_order')->paginate(50);

        return $this->success($sections);
    }

    /**
     * GET /api/v1/admin/sections/{section}
     */
    public function show(Section $section): JsonResponse
    {
        $section->load('page');

        return $this->success($section);
    }

    /**
     * POST /api/v1/admin/sections
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page_id'    => ['required', 'integer', 'exists:pages,id'],
            'type'       => ['required', 'string', 'max:100'],
            'content'    => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $section = Section::create($validated);

        return $this->created($section->load('page'), 'Section created successfully');
    }

    /**
     * PUT /api/v1/admin/sections/{section}
     */
    public function update(Request $request, Section $section): JsonResponse
    {
        $validated = $request->validate([
            'page_id'    => ['sometimes', 'integer', 'exists:pages,id'],
            'type'       => ['sometimes', 'string', 'max:100'],
            'content'    => ['nullable', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $section->update($validated);

        return $this->success($section->fresh('page'), 'Section updated successfully');
    }

    /**
     * DELETE /api/v1/admin/sections/{section}
     */
    public function destroy(Section $section): JsonResponse
    {
        $section->delete();

        return $this->success(null, 'Section deleted successfully');
    }
}
