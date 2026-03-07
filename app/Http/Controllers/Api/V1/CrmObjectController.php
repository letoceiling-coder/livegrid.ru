<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CatalogObject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmObjectController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $perPage = max(1, min(100, (int) $request->query('per_page', 30)));
        $typeId = $request->query('object_type_id');
        $sourceType = $request->query('source_type');

        $query = CatalogObject::query()->with('objectType:id,code,name');

        if ($typeId) {
            $query->where('object_type_id', (int) $typeId);
        }
        if ($sourceType) {
            $query->where('source_type', (string) $sourceType);
        }
        if ($q !== '') {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', 'like', '%' . $q . '%')
                    ->orWhere('slug', 'like', '%' . $q . '%')
                    ->orWhere('external_id', 'like', '%' . $q . '%');
            });
        }

        return $this->success(
            $query
                ->orderByDesc('is_active')
                ->orderBy('position')
                ->orderByDesc('updated_at')
                ->paginate($perPage)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);
        $data['created_by'] = $request->user()?->id;
        $data['updated_by'] = $request->user()?->id;
        $data['is_active'] = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true;
        $data['position'] = array_key_exists('position', $data) ? (int) $data['position'] : 0;
        $data['manual_override'] = array_key_exists('manual_override', $data) ? (bool) $data['manual_override'] : false;

        $item = CatalogObject::create($data);

        return $this->created($item->load('objectType:id,code,name'), 'Объект создан');
    }

    public function update(Request $request, CatalogObject $object): JsonResponse
    {
        $data = $this->validatePayload($request, true);
        $data['updated_by'] = $request->user()?->id;
        $object->update($data);

        return $this->success($object->load('objectType:id,code,name'), 'Объект обновлен');
    }

    public function destroy(CatalogObject $object): JsonResponse
    {
        $object->delete();

        return $this->success(null, 'Объект удален');
    }

    private function validatePayload(Request $request, bool $partial = false): array
    {
        $rules = [
            'external_id' => ['nullable', 'string', 'max:128'],
            'source_type' => ['required', 'string', 'in:feed,manual,import'],
            'object_type_id' => ['required', 'integer', 'exists:catalog_object_types,id'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:catalog_objects,slug' . ($partial ? ',' . $request->route('object')->id : '')],
            'description' => ['nullable', 'string'],
            'lifecycle_status' => ['required', 'string', 'in:draft,in_review,published,archived'],
            'manual_override' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer'],
            'meta' => ['nullable', 'array'],
        ];

        if ($partial) {
            $patched = [];
            foreach ($rules as $key => $rule) {
                $patched[$key] = array_merge(['sometimes'], $rule);
            }
            return $request->validate($patched);
        }

        return $request->validate($rules);
    }
}

