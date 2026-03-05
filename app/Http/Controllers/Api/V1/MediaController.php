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

        $query = Media::query();

        if ($type) {
            $query->where('type', $type);
        }

        $media = $query->orderBy('created_at', 'desc')->paginate(30);

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
        ]);

        $file = $request->file('file');
        $type = $request->input('type', 'image');
        $path = $file->store("media/{$type}", 'public');

        $media = Media::create([
            'path' => $path,
            'alt'  => $request->input('alt'),
            'type' => $type,
        ]);

        return $this->created($media, 'Media uploaded successfully');
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
        ]);

        $media->update($validated);

        return $this->success($media, 'Media updated successfully');
    }

    /**
     * DELETE /api/v1/admin/media/{media}
     * Delete a media file.
     */
    public function destroy(Media $media): JsonResponse
    {
        Storage::disk('public')->delete($media->path);
        $media->delete();

        return $this->success(null, 'Media deleted successfully');
    }
}
