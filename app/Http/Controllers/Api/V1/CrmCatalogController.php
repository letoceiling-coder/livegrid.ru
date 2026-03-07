<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Apartment;
use App\Models\Block;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CrmCatalogController extends Controller
{
    use ApiResponse;

    /** @return array{model: class-string<Model>, rules: array<string, mixed>} */
    private function map(string $entity): array
    {
        return match ($entity) {
            'blocks' => [
                'model' => Block::class,
                'rules' => [
                    'id' => ['sometimes', 'string', 'max:64'],
                    'name' => ['required', 'string', 'max:255'],
                    'description' => ['nullable', 'string'],
                    'address' => ['nullable', 'string', 'max:255'],
                    'district_id' => ['nullable', 'string', 'max:64'],
                    'builder_id' => ['nullable', 'string', 'max:64'],
                    'lat' => ['nullable', 'numeric'],
                    'lng' => ['nullable', 'numeric'],
                    'is_city' => ['nullable', 'boolean'],
                    'status' => ['nullable', 'integer'],
                    'deadline_at' => ['nullable', 'date'],
                ],
            ],
            'apartments' => [
                'model' => Apartment::class,
                'rules' => [
                    'id' => ['sometimes', 'string', 'max:64'],
                    'building_id' => ['required', 'string', 'max:64'],
                    'block_id' => ['required', 'string', 'max:64'],
                    'room' => ['nullable', 'integer'],
                    'floor' => ['nullable', 'integer'],
                    'number' => ['nullable', 'string', 'max:64'],
                    'area_total' => ['nullable', 'numeric'],
                    'price' => ['nullable', 'numeric'],
                    'finishing_id' => ['nullable', 'string', 'max:64'],
                    'plan_url' => ['nullable', 'string', 'max:2048'],
                    'is_deleted' => ['nullable', 'boolean'],
                ],
            ],
            default => throw new \InvalidArgumentException('Unknown catalog entity'),
        };
    }

    public function index(Request $request, string $entity): JsonResponse
    {
        try {
            $map = $this->map($entity);
        } catch (\InvalidArgumentException) {
            return response()->json(['success' => false, 'message' => 'Неизвестная сущность каталога'], 404);
        }

        /** @var class-string<Model> $model */
        $model = $map['model'];
        $q = trim((string) $request->query('q', ''));
        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));

        $query = $model::query();
        if ($q !== '') {
            if ($entity === 'blocks') {
                $query->where('name', 'like', '%' . $q . '%');
            } else {
                $query->where('id', 'like', '%' . $q . '%')
                    ->orWhere('number', 'like', '%' . $q . '%')
                    ->orWhere('block_name', 'like', '%' . $q . '%');
            }
        }

        return $this->success($query->orderByDesc('updated_at')->paginate($perPage));
    }

    public function store(Request $request, string $entity): JsonResponse
    {
        try {
            $map = $this->map($entity);
        } catch (\InvalidArgumentException) {
            return response()->json(['success' => false, 'message' => 'Неизвестная сущность каталога'], 404);
        }

        $data = $request->validate($map['rules']);

        /** @var class-string<Model> $model */
        $model = $map['model'];
        /** @var Model $item */
        $item = new $model();
        $item->fill($data);

        if (! $item->getAttribute('id') && ! $item->getIncrementing()) {
            $item->setAttribute('id', (string) Str::uuid());
        }

        $item->save();
        return $this->created($item, 'Запись каталога создана');
    }

    public function update(Request $request, string $entity, string $id): JsonResponse
    {
        try {
            $map = $this->map($entity);
        } catch (\InvalidArgumentException) {
            return response()->json(['success' => false, 'message' => 'Неизвестная сущность каталога'], 404);
        }

        /** @var class-string<Model> $model */
        $model = $map['model'];
        /** @var Model|null $item */
        $item = $model::query()->withoutGlobalScopes()->find($id);
        if (! $item) {
            return response()->json(['success' => false, 'message' => 'Запись не найдена'], 404);
        }

        $rules = [];
        foreach ($map['rules'] as $key => $rule) {
            if ($key === 'id') {
                continue;
            }
            $rules[$key] = array_merge(['sometimes'], $rule);
        }

        $data = $request->validate($rules);
        $item->fill($data);
        $item->save();

        return $this->success($item, 'Запись каталога обновлена');
    }

    public function destroy(string $entity, string $id): JsonResponse
    {
        try {
            $map = $this->map($entity);
        } catch (\InvalidArgumentException) {
            return response()->json(['success' => false, 'message' => 'Неизвестная сущность каталога'], 404);
        }

        /** @var class-string<Model> $model */
        $model = $map['model'];
        $item = $model::query()->withoutGlobalScopes()->find($id);
        if (! $item) {
            return response()->json(['success' => false, 'message' => 'Запись не найдена'], 404);
        }

        $item->delete();
        return $this->success(null, 'Запись каталога удалена');
    }
}

