<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\CatalogObject;
use App\Models\ObjectPropertyValue;
use App\Models\PropertyDefinition;
use App\Models\PropertyDefinitionOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmPropertyController extends Controller
{
    use ApiResponse;

    public function indexDefinitions(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $typeId = $request->query('object_type_id');
        $perPage = max(1, min(100, (int) $request->query('per_page', 30)));

        $query = PropertyDefinition::query()->with(['objectType:id,code,name', 'options']);
        if ($typeId) {
            $query->where('object_type_id', (int) $typeId);
        }
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

    public function storeDefinition(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:64', 'unique:property_definitions,code'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'data_type' => ['required', 'string', 'in:string,number,boolean,date,json,enum'],
            'is_required' => ['nullable', 'boolean'],
            'is_filterable' => ['nullable', 'boolean'],
            'is_multivalue' => ['nullable', 'boolean'],
            'default_value' => ['nullable', 'string'],
            'object_type_id' => ['nullable', 'integer', 'exists:catalog_object_types,id'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer'],
        ]);

        $data['is_required'] = (bool) ($data['is_required'] ?? false);
        $data['is_filterable'] = (bool) ($data['is_filterable'] ?? false);
        $data['is_multivalue'] = (bool) ($data['is_multivalue'] ?? false);
        $data['is_active'] = (bool) ($data['is_active'] ?? true);
        $data['position'] = (int) ($data['position'] ?? 0);

        $item = PropertyDefinition::create($data);

        return $this->created($item->load(['objectType:id,code,name', 'options']), 'Свойство создано');
    }

    public function updateDefinition(Request $request, PropertyDefinition $definition): JsonResponse
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:64', 'unique:property_definitions,code,' . $definition->id],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'data_type' => ['sometimes', 'string', 'in:string,number,boolean,date,json,enum'],
            'is_required' => ['sometimes', 'boolean'],
            'is_filterable' => ['sometimes', 'boolean'],
            'is_multivalue' => ['sometimes', 'boolean'],
            'default_value' => ['nullable', 'string'],
            'object_type_id' => ['nullable', 'integer', 'exists:catalog_object_types,id'],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer'],
        ]);

        $definition->update($data);

        return $this->success($definition->load(['objectType:id,code,name', 'options']), 'Свойство обновлено');
    }

    public function destroyDefinition(PropertyDefinition $definition): JsonResponse
    {
        $definition->delete();

        return $this->success(null, 'Свойство удалено');
    }

    public function listOptions(PropertyDefinition $definition): JsonResponse
    {
        return $this->success(
            $definition->options()
                ->orderByDesc('is_active')
                ->orderBy('position')
                ->orderBy('label')
                ->get()
        );
    }

    public function storeOption(Request $request, PropertyDefinition $definition): JsonResponse
    {
        $data = $request->validate([
            'value' => ['required', 'string', 'max:255'],
            'label' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'position' => ['nullable', 'integer'],
        ]);

        $data['property_definition_id'] = $definition->id;
        $data['is_active'] = (bool) ($data['is_active'] ?? true);
        $data['position'] = (int) ($data['position'] ?? 0);

        $item = PropertyDefinitionOption::create($data);

        return $this->created($item, 'Опция свойства создана');
    }

    public function updateOption(Request $request, PropertyDefinition $definition, PropertyDefinitionOption $option): JsonResponse
    {
        if ($option->property_definition_id !== $definition->id) {
            return response()->json(['success' => false, 'message' => 'Опция не принадлежит свойству'], 422);
        }

        $data = $request->validate([
            'value' => ['sometimes', 'string', 'max:255'],
            'label' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer'],
        ]);

        $option->update($data);

        return $this->success($option, 'Опция свойства обновлена');
    }

    public function destroyOption(PropertyDefinition $definition, PropertyDefinitionOption $option): JsonResponse
    {
        if ($option->property_definition_id !== $definition->id) {
            return response()->json(['success' => false, 'message' => 'Опция не принадлежит свойству'], 422);
        }

        $option->delete();

        return $this->success(null, 'Опция свойства удалена');
    }

    public function listObjectValues(CatalogObject $object): JsonResponse
    {
        $values = ObjectPropertyValue::query()
            ->where('catalog_object_id', $object->id)
            ->with('definition:id,code,name,data_type')
            ->orderByDesc('updated_at')
            ->get();

        return $this->success($values);
    }

    public function upsertObjectValues(Request $request, CatalogObject $object): JsonResponse
    {
        $data = $request->validate([
            'values' => ['required', 'array'],
            'values.*.property_definition_id' => ['required', 'integer', 'exists:property_definitions,id'],
            'values.*.value' => ['nullable'],
            'values.*.value_source' => ['nullable', 'string', 'in:feed,manual,import'],
            'values.*.is_locked_by_manual' => ['nullable', 'boolean'],
        ]);

        foreach ($data['values'] as $row) {
            $definition = PropertyDefinition::query()->find($row['property_definition_id']);
            if (! $definition) {
                continue;
            }

            $payload = [
                'value_text' => null,
                'value_number' => null,
                'value_boolean' => null,
                'value_date' => null,
                'value_json' => null,
                'value_source' => (string) ($row['value_source'] ?? 'manual'),
                'is_locked_by_manual' => (bool) ($row['is_locked_by_manual'] ?? false),
                'updated_by' => $request->user()?->id,
            ];

            $value = $row['value'] ?? null;
            switch ($definition->data_type) {
                case 'number':
                    $payload['value_number'] = is_null($value) || $value === '' ? null : (float) $value;
                    break;
                case 'boolean':
                    $payload['value_boolean'] = is_null($value) || $value === '' ? null : (bool) $value;
                    break;
                case 'date':
                    $payload['value_date'] = is_null($value) || $value === '' ? null : (string) $value;
                    break;
                case 'json':
                    $payload['value_json'] = is_array($value) ? $value : (is_null($value) || $value === '' ? null : ['value' => $value]);
                    break;
                case 'enum':
                case 'string':
                default:
                    $payload['value_text'] = is_null($value) ? null : (string) $value;
                    break;
            }

            ObjectPropertyValue::query()->updateOrCreate(
                [
                    'catalog_object_id' => $object->id,
                    'property_definition_id' => $definition->id,
                ],
                $payload
            );
        }

        return $this->success(null, 'Значения свойств сохранены');
    }
}

