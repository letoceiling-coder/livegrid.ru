<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/v1/admin/media
     * List all media files.
     */
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type');
        $folder = $request->query('folder');
        $q = trim((string) $request->query('q', ''));

        $query = Media::query();

        if ($type) {
            $query->where('type', $type);
        }
        if ($folder) {
            $query->where('folder', $folder);
        }
        if ($q !== '') {
            $query->where(function ($sub) use ($q): void {
                $sub->where('path', 'like', '%' . $q . '%')
                    ->orWhere('alt', 'like', '%' . $q . '%');
            });
        }

        $media = $query
            ->orderByDesc('is_active')
            ->orderBy('position')
            ->orderBy('created_at', 'desc')
            ->paginate(30);

        return $this->success($media);
    }

    /**
     * GET /api/v1/admin/media/{media}
     */
    public function show(Media $media): JsonResponse
    {
        return $this->success($media);
    }

    /**
     * POST /api/v1/admin/media
     * Upload a new media file.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:20480'], // 20MB max
            'alt'  => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:image,video,document'],
            'folder' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer'],
        ]);

        $file = $request->file('file');
        $type = $request->input('type', 'image');
        $path = $file->store("media/{$type}", 'public');

        $media = Media::create([
            'path' => $path,
            'alt'  => $request->input('alt'),
            'type' => $type,
            'folder' => $request->input('folder'),
            'tags' => $request->input('tags', []),
            'is_active' => $request->boolean('is_active', true),
            'position' => (int) $request->input('position', 0),
        ]);

        return $this->created($media, 'Файл загружен');
    }

    /**
     * PUT /api/v1/admin/media/{media}
     * Update media metadata (alt, type).
     */
    public function update(Request $request, Media $media): JsonResponse
    {
        $validated = $request->validate([
            'alt'  => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:image,video,document'],
            'folder' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer'],
        ]);

        $media->update($validated);

        return $this->success($media, 'Файл обновлен');
    }

    /**
     * DELETE /api/v1/admin/media/{media}
     * Delete a media file.
     */
    public function destroy(Media $media): JsonResponse
    {
        Storage::disk('public')->delete($media->path);
        $media->delete();

        return $this->success(null, 'Файл удален');
    }
}
