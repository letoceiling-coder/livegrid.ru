import { useEffect, useState } from 'react';
import { crmCreateDictionary, crmDeleteDictionary, crmGetDictionary, crmUpdateDictionary } from '@/crm/api';
import { Button } from '@/components/ui/button';

const ENTITIES = [
  { value: 'regions', label: 'Районы' },
  { value: 'builders', label: 'Застройщики' },
  { value: 'subways', label: 'Метро' },
  { value: 'finishings', label: 'Отделка' },
  { value: 'building-types', label: 'Типы зданий' },
  { value: 'rooms', label: 'Комнаты' },
];

export default function CrmDictionaries() {
  const [entity, setEntity] = useState('regions');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [name, setName] = useState('');
  const [position, setPosition] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await crmGetDictionary(entity);
      setRows(data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки справочника');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmCreateDictionary(entity, { name, position, is_active: isActive });
      setName('');
      setPosition(0);
      setIsActive(true);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка создания');
    }
  };

  const update = async (row: Record<string, any>) => {
    const nextName = prompt('Новое название', row.name ?? '');
    if (!nextName) return;
    const nextPosition = prompt('Позиция', String(row.position ?? 0));
    const nextActive = confirm('Оставить запись активной?');
    try {
      await crmUpdateDictionary(entity, String(row.id ?? row.crm_id), {
        name: nextName,
        position: Number(nextPosition ?? 0) || 0,
        is_active: nextActive,
      });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка обновления');
    }
  };

  const remove = async (row: Record<string, any>) => {
    if (!confirm(`Удалить "${row.name}"?`)) return;
    try {
      await crmDeleteDictionary(entity, String(row.id ?? row.crm_id));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка удаления');
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-4">Справочники</h1>
      <div className="flex items-center gap-2 mb-4">
        <select className="border rounded-lg px-3 py-2 text-sm" value={entity} onChange={e => setEntity(e.target.value)}>
          {ENTITIES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}
        </select>
      </div>

      <form onSubmit={create} className="rounded-2xl border bg-background p-4 mb-4 flex gap-2">
        <input className="border rounded-lg px-3 py-2 text-sm flex-1" placeholder="Название" value={name} onChange={e => setName(e.target.value)} required />
        <input className="border rounded-lg px-3 py-2 text-sm w-32" type="number" placeholder="Позиция" value={position} onChange={e => setPosition(Number(e.target.value) || 0)} />
        <label className="flex items-center gap-2 text-sm px-2">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          Активен
        </label>
        <Button type="submit">Добавить</Button>
      </form>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <div className="rounded-2xl border bg-background divide-y">
        {rows.map(row => (
          <div key={String(row.id ?? row.crm_id)} className="p-4 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{row.name ?? row.id}</div>
              <div className="text-xs text-muted-foreground">
                id: {String(row.id ?? row.crm_id)} · {row.is_active ? 'активен' : 'неактивен'} · pos:{row.position ?? 0}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void update(row)}>Изменить</Button>
            <Button variant="destructive" size="sm" onClick={() => void remove(row)}>Удалить</Button>
          </div>
        ))}
        {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">Нет записей</div>}
      </div>
    </div>
  );
}

