<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CatalogObjectType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmObjectTypeController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $perPage = max(1, min(100, (int) $request->query('per_page', 30)));

        $query = CatalogObjectType::query();
        if ($q !== '') {
            $query->where(function ($sub) use ($q): void {
                $sub->where('name', 'like', '%' . $q . '%')
                    ->orWhere('code', 'like', '%' . $q . '%');
            });
        }

        return $this->success(
            $query
                ->orderByDesc('is_active')
                ->orderBy('position')
                ->orderBy('name')
                ->paginate($perPage)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:64', 'unique:catalog_object_types,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer'],
        ]);

        $data['is_active'] = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true;
        $data['position'] = array_key_exists('position', $data) ? (int) $data['position'] : 0;

        $item = CatalogObjectType::create($data);

        return $this->created($item, 'Тип объекта создан');
    }

    public function update(Request $request, CatalogObjectType $objectType): JsonResponse
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:64', 'unique:catalog_object_types,code,' . $objectType->id],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer'],
        ]);

        $objectType->update($data);

        return $this->success($objectType, 'Тип объекта обновлен');
    }

    public function destroy(CatalogObjectType $objectType): JsonResponse
    {
        $objectType->delete();

        return $this->success(null, 'Тип объекта удален');
    }
}

