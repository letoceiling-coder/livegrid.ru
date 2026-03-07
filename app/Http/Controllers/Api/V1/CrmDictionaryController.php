<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Builder;
use App\Models\BuildingType;
use App\Models\Finishing;
use App\Models\Region;
use App\Models\Room;
use App\Models\Subway;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CrmDictionaryController extends Controller
{
    use ApiResponse;

    /** @return array{model: class-string<Model>, rules: array<string, mixed>, key: string} */
    private function map(string $entity): array
    {
        return match ($entity) {
            'regions' => [
                'model' => Region::class,
                'rules' => ['name' => ['required', 'string', 'max:255'], 'crm_id' => ['nullable', 'integer']],
                'key' => 'id',
            ],
            'builders' => [
                'model' => Builder::class,
                'rules' => ['name' => ['required', 'string', 'max:255'], 'crm_id' => ['nullable', 'integer'], 'logo_url' => ['nullable', 'string', 'max:2048']],
                'key' => 'id',
            ],
            'subways' => [
                'model' => Subway::class,
                'rules' => ['name' => ['required', 'string', 'max:255'], 'crm_id' => ['nullable', 'integer'], 'line_name' => ['nullable', 'string', 'max:255'], 'line_color' => ['nullable', 'string', 'max:32']],
                'key' => 'id',
            ],
            'finishings' => [
                'model' => Finishing::class,
                'rules' => ['name' => ['required', 'string', 'max:255'], 'crm_id' => ['nullable', 'integer']],
                'key' => 'id',
            ],
            'building-types' => [
                'model' => BuildingType::class,
                'rules' => ['name' => ['required', 'string', 'max:255'], 'crm_id' => ['nullable', 'integer']],
                'key' => 'id',
            ],
            'rooms' => [
                'model' => Room::class,
                'rules' => ['name' => ['required', 'string', 'max:255'], 'crm_id' => ['nullable', 'integer'], 'feed_id' => ['nullable', 'integer']],
                'key' => 'id',
            ],
            default => throw new \InvalidArgumentException('Unknown dictionary entity'),
        };
    }

    public function index(Request $request, string $entity): JsonResponse
    {
        try {
            $map = $this->map($entity);
        } catch (\InvalidArgumentException) {
            return response()->json(['success' => false, 'message' => 'Неизвестный справочник'], 404);
        }

        /** @var class-string<Model> $model */
        $model = $map['model'];
        $q = trim((string) $request->query('q', ''));
        $perPage = max(1, min(100, (int) $request->query('per_page', 30)));

        $query = $model::query();
        if ($q !== '') {
            $query->where('name', 'like', '%' . $q . '%');
        }

        return $this->success($query->orderBy('name')->paginate($perPage));
    }

    public function store(Request $request, string $entity): JsonResponse
    {
        try {
            $map = $this->map($entity);
        } catch (\InvalidArgumentException) {
            return response()->json(['success' => false, 'message' => 'Неизвестный справочник'], 404);
        }

        $data = $request->validate($map['rules']);

        /** @var class-string<Model> $model */
        $model = $map['model'];
        /** @var Model $item */
        $item = new $model();
        $item->fill($data);

        if ($map['key'] === 'id' && ! $item->getAttribute('id') && ! $item->getIncrementing()) {
            $item->setAttribute('id', (string) Str::uuid());
        }

        $item->save();

        return $this->created($item, 'Запись создана');
    }

    public function update(Request $request, string $entity, string $id): JsonResponse
    {
        try {
            $map = $this->map($entity);
        } catch (\InvalidArgumentException) {
            return response()->json(['success' => false, 'message' => 'Неизвестный справочник'], 404);
        }

        /** @var class-string<Model> $model */
        $model = $map['model'];
        /** @var Model|null $item */
        $item = $model::query()->find($id);
        if (! $item) {
            return response()->json(['success' => false, 'message' => 'Запись не найдена'], 404);
        }

        $rules = [];
        foreach ($map['rules'] as $key => $rule) {
            $rules[$key] = array_merge(['sometimes'], $rule);
        }
        $data = $request->validate($rules);

        $item->fill($data);
        $item->save();

        return $this->success($item, 'Запись обновлена');
    }

    public function destroy(string $entity, string $id): JsonResponse
    {
        try {
            $map = $this->map($entity);
        } catch (\InvalidArgumentException) {
            return response()->json(['success' => false, 'message' => 'Неизвестный справочник'], 404);
        }

        /** @var class-string<Model> $model */
        $model = $map['model'];
        $item = $model::query()->find($id);
        if (! $item) {
            return response()->json(['success' => false, 'message' => 'Запись не найдена'], 404);
        }

        $item->delete();
        return $this->success(null, 'Запись удалена');
    }
}

