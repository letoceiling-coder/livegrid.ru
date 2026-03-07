import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  crmCreateObject,
  crmDeleteObject,
  crmGetObjectPropertyValues,
  crmGetObjects,
  crmGetObjectTypes,
  crmGetPropertyDefinitions,
  crmSaveObjectPropertyValues,
  crmUpdateObject,
  type CrmCatalogObject,
  type CrmObjectPropertyValue,
  type CrmObjectType,
  type PropertyDefinition,
} from '@/crm/api';
import { Button } from '@/components/ui/button';

const SOURCE_TYPES: Array<CrmCatalogObject['source_type']> = ['manual', 'feed', 'import'];
const LIFECYCLE_STATUSES: Array<CrmCatalogObject['lifecycle_status']> = ['draft', 'in_review', 'published', 'archived'];

type ValueDraftMap = Record<number, any>;

const getValueByDefinition = (value: CrmObjectPropertyValue | undefined, definition: PropertyDefinition): any => {
  if (!value) return '';
  switch (definition.data_type) {
    case 'number':
      return value.value_number ?? '';
    case 'boolean':
      return value.value_boolean ?? false;
    case 'date':
      return value.value_date ?? '';
    case 'json':
      return value.value_json ?? {};
    case 'enum':
    case 'string':
    default:
      return value.value_text ?? '';
  }
};

export default function CrmObjects() {
  const [types, setTypes] = useState<CrmObjectType[]>([]);
  const [rows, setRows] = useState<CrmCatalogObject[]>([]);
  const [query, setQuery] = useState('');
  const [filterTypeId, setFilterTypeId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<CrmCatalogObject | null>(null);
  const [definitions, setDefinitions] = useState<PropertyDefinition[]>([]);
  const [valueDraft, setValueDraft] = useState<ValueDraftMap>({});

  const [form, setForm] = useState({
    object_type_id: 0,
    name: '',
    slug: '',
    source_type: 'manual' as CrmCatalogObject['source_type'],
    lifecycle_status: 'draft' as CrmCatalogObject['lifecycle_status'],
    is_active: true,
  });

  const selectedTypeDefinitions = useMemo(() => {
    if (!selected?.object_type_id) return [];
    return definitions.filter(item => item.object_type_id === null || item.object_type_id === selected.object_type_id);
  }, [definitions, selected]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [typePage, objectPage] = await Promise.all([
        crmGetObjectTypes('', 1, 200),
        crmGetObjects({ q: query, object_type_id: filterTypeId, page: 1, per_page: 50 }),
      ]);
      setTypes(typePage.data);
      setRows(objectPage.data);
      if (!form.object_type_id && typePage.data.length > 0) {
        setForm(prev => ({ ...prev, object_type_id: typePage.data[0].id }));
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки объектов');
    } finally {
      setLoading(false);
    }
  };

  const loadValues = async (object: CrmCatalogObject) => {
    setSelected(object);
    try {
      const [defsPage, objectValues] = await Promise.all([
        crmGetPropertyDefinitions(object.object_type_id, '', 1, 500),
        crmGetObjectPropertyValues(object.id),
      ]);
      setDefinitions(defsPage.data);

      const nextDraft: ValueDraftMap = {};
      defsPage.data.forEach(definition => {
        const currentValue = objectValues.find(row => row.property_definition_id === definition.id);
        nextDraft[definition.id] = getValueByDefinition(currentValue, definition);
      });
      setValueDraft(nextDraft);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки значений свойств');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTypeId]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.object_type_id) {
      setError('Выберите тип объекта');
      return;
    }
    try {
      await crmCreateObject({
        object_type_id: form.object_type_id,
        name: form.name,
        slug: form.slug || undefined,
        source_type: form.source_type,
        lifecycle_status: form.lifecycle_status,
        is_active: form.is_active,
        manual_override: true,
        position: 0,
      });
      setForm(prev => ({ ...prev, name: '', slug: '', lifecycle_status: 'draft' }));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось создать объект');
    }
  };

  const handleToggle = async (item: CrmCatalogObject) => {
    try {
      await crmUpdateObject(item.id, { is_active: !item.is_active });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось обновить объект');
    }
  };

  const handleDelete = async (item: CrmCatalogObject) => {
    if (!confirm(`Удалить объект "${item.name}"?`)) return;
    try {
      await crmDeleteObject(item.id);
      if (selected?.id === item.id) {
        setSelected(null);
        setDefinitions([]);
        setValueDraft({});
      }
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось удалить объект');
    }
  };

  const handleSaveValues = async () => {
    if (!selected) return;
    const payload = selectedTypeDefinitions.map(definition => ({
      property_definition_id: definition.id,
      value: valueDraft[definition.id],
      value_source: 'manual' as const,
      is_locked_by_manual: true,
    }));
    try {
      await crmSaveObjectPropertyValues(selected.id, payload);
      await loadValues(selected);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось сохранить значения');
    }
  };

  return (
    <div className="p-6 max-w-7xl space-y-4">
      <h1 className="text-2xl font-bold">Объекты (новая модель CRM)</h1>

      <div className="rounded-2xl border bg-background p-4">
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={form.object_type_id || ''}
            onChange={e => setForm(prev => ({ ...prev, object_type_id: Number(e.target.value) || 0 }))}
            required
          >
            <option value="">Тип объекта</option>
            {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>

          <input
            className="border rounded-lg px-3 py-2 text-sm md:col-span-2"
            placeholder="Название объекта"
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="slug (необязательно)"
            value={form.slug}
            onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
          />

          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={form.lifecycle_status}
            onChange={e => setForm(prev => ({ ...prev, lifecycle_status: e.target.value as CrmCatalogObject['lifecycle_status'] }))}
          >
            {LIFECYCLE_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
          </select>

          <Button type="submit">Создать объект</Button>

          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={form.source_type}
            onChange={e => setForm(prev => ({ ...prev, source_type: e.target.value as CrmCatalogObject['source_type'] }))}
          >
            {SOURCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>

          <label className="md:col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
            />
            Активный объект
          </label>
        </form>
      </div>

      <div className="flex gap-2">
        <input
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm"
          placeholder="Поиск по имени/slug/external_id"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filterTypeId ?? ''}
          onChange={e => setFilterTypeId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Все типы объектов</option>
          {types.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
        <Button variant="outline" onClick={() => void load()}>Найти</Button>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-background divide-y">
          {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>}
          {!loading && rows.map(item => (
            <div key={item.id} className="p-4 flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground">
                  {item.object_type?.name ?? `#${item.object_type_id}`} · {item.lifecycle_status} · {item.source_type}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadValues(item)}>Свойства</Button>
              <Button variant="outline" size="sm" onClick={() => void handleToggle(item)}>
                {item.is_active ? 'Деактивировать' : 'Активировать'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void handleDelete(item)}>Удалить</Button>
            </div>
          ))}
          {!loading && rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">Нет объектов</div>}
        </div>

        <div className="rounded-2xl border bg-background p-4">
          {!selected && <div className="text-sm text-muted-foreground">Выберите объект слева, чтобы редактировать его свойства.</div>}

          {selected && (
            <div className="space-y-3">
              <div>
                <h2 className="font-semibold text-sm">{selected.name}</h2>
                <p className="text-xs text-muted-foreground">Редактирование динамических свойств</p>
              </div>

              {selectedTypeDefinitions.map(definition => (
                <div key={definition.id} className="space-y-1">
                  <div className="text-xs font-medium">{definition.name} <span className="text-muted-foreground">({definition.code})</span></div>

                  {definition.data_type === 'boolean' ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(valueDraft[definition.id])}
                        onChange={e => setValueDraft(prev => ({ ...prev, [definition.id]: e.target.checked }))}
                      />
                      Да/Нет
                    </label>
                  ) : definition.data_type === 'enum' ? (
                    <select
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                      value={valueDraft[definition.id] ?? ''}
                      onChange={e => setValueDraft(prev => ({ ...prev, [definition.id]: e.target.value }))}
                    >
                      <option value="">Не выбрано</option>
                      {(definition.options ?? []).map(option => <option key={option.id} value={option.value}>{option.label}</option>)}
                    </select>
                  ) : definition.data_type === 'json' ? (
                    <textarea
                      className="border rounded-lg px-3 py-2 text-sm w-full min-h-20"
                      value={JSON.stringify(valueDraft[definition.id] ?? {}, null, 2)}
                      onChange={e => {
                        try {
                          const parsed = e.target.value.trim() === '' ? {} : JSON.parse(e.target.value);
                          setValueDraft(prev => ({ ...prev, [definition.id]: parsed }));
                        } catch {
                          // Ignore invalid JSON while typing.
                        }
                      }}
                    />
                  ) : (
                    <input
                      className="border rounded-lg px-3 py-2 text-sm w-full"
                      type={definition.data_type === 'number' ? 'number' : definition.data_type === 'date' ? 'date' : 'text'}
                      value={valueDraft[definition.id] ?? ''}
                      onChange={e => setValueDraft(prev => ({ ...prev, [definition.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              <Button onClick={() => void handleSaveValues()}>Сохранить свойства</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
