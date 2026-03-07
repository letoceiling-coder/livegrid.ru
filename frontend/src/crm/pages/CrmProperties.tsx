import { useEffect, useState } from 'react';
import {
  crmCreatePropertyDefinition,
  crmCreatePropertyOption,
  crmDeletePropertyDefinition,
  crmDeletePropertyOption,
  crmGetObjectTypes,
  crmGetPropertyDefinitions,
  crmUpdatePropertyDefinition,
  type CrmObjectType,
  type PropertyDefinition,
} from '@/crm/api';
import { Button } from '@/components/ui/button';

const DATA_TYPES: PropertyDefinition['data_type'][] = ['string', 'number', 'boolean', 'date', 'json', 'enum'];

export default function CrmProperties() {
  const [types, setTypes] = useState<CrmObjectType[]>([]);
  const [items, setItems] = useState<PropertyDefinition[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState<PropertyDefinition['data_type']>('string');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, d] = await Promise.all([
        crmGetObjectTypes('', 1, 200),
        crmGetPropertyDefinitions(selectedTypeId),
      ]);
      setTypes(t.data);
      setItems(d.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки свойств');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypeId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmCreatePropertyDefinition({
        code,
        name,
        data_type: dataType,
        object_type_id: selectedTypeId ?? null,
        is_active: true,
        position: 0,
      });
      setCode('');
      setName('');
      setDataType('string');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось создать свойство');
    }
  };

  const handleToggle = async (item: PropertyDefinition) => {
    try {
      await crmUpdatePropertyDefinition(item.id, { is_active: !item.is_active });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось обновить свойство');
    }
  };

  const handleDelete = async (item: PropertyDefinition) => {
    if (!confirm(`Удалить свойство "${item.name}"?`)) return;
    try {
      await crmDeletePropertyDefinition(item.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось удалить свойство');
    }
  };

  const handleAddOption = async (item: PropertyDefinition) => {
    if (item.data_type !== 'enum') return;
    const value = prompt('Значение опции (код)');
    if (!value || value.trim() === '') return;
    const label = prompt('Название опции', value);
    if (!label || label.trim() === '') return;
    try {
      await crmCreatePropertyOption(item.id, { value: value.trim(), label: label.trim(), is_active: true, position: 0 });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось добавить опцию');
    }
  };

  const handleDeleteOption = async (definitionId: number, optionId: number) => {
    if (!confirm('Удалить опцию свойства?')) return;
    try {
      await crmDeletePropertyOption(definitionId, optionId);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось удалить опцию');
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-4">Свойства объектов</h1>

      <div className="flex gap-2 mb-4">
        <select
          className="border rounded-lg px-3 py-2 text-sm min-w-64"
          value={selectedTypeId ?? ''}
          onChange={e => setSelectedTypeId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Все типы объектов</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Button variant="outline" onClick={() => void load()}>Обновить</Button>
      </div>

      <form onSubmit={handleCreate} className="rounded-2xl border bg-background p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Код свойства" value={code} onChange={e => setCode(e.target.value)} required />
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Название" value={name} onChange={e => setName(e.target.value)} required />
        <select className="border rounded-lg px-3 py-2 text-sm" value={dataType} onChange={e => setDataType(e.target.value as PropertyDefinition['data_type'])}>
          {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button type="submit">Добавить свойство</Button>
      </form>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <div className="rounded-2xl border bg-background divide-y">
        {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>}
        {!loading && items.map(item => (
          <div key={item.id} className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.code} · {item.data_type}</div>
              </div>
              {item.data_type === 'enum' && <Button variant="outline" size="sm" onClick={() => void handleAddOption(item)}>Добавить опцию</Button>}
              <Button variant="outline" size="sm" onClick={() => void handleToggle(item)}>
                {item.is_active ? 'Деактивировать' : 'Активировать'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void handleDelete(item)}>Удалить</Button>
            </div>

            {item.data_type === 'enum' && (item.options?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.options?.map(option => (
                  <button
                    key={option.id}
                    className="text-xs border rounded-lg px-2 py-1 hover:bg-muted"
                    onClick={() => void handleDeleteOption(item.id, option.id)}
                    title="Удалить опцию"
                  >
                    {option.label} ({option.value})
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

