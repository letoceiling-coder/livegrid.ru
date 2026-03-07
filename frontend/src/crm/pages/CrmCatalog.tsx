import { useEffect, useState } from 'react';
import { crmCreateCatalog, crmDeleteCatalog, crmGetCatalog, crmUpdateCatalog } from '@/crm/api';
import { Button } from '@/components/ui/button';

type Entity = 'blocks' | 'apartments';

export default function CrmCatalog() {
  const [entity, setEntity] = useState<Entity>('blocks');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<Record<string, any>>({ id: '', name: '' });

  const load = async () => {
    setError(null);
    try {
      const data = await crmGetCatalog(entity, q);
      setRows(data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки каталога');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmCreateCatalog(entity, form);
      setForm(entity === 'blocks' ? { id: '', name: '' } : { id: '', building_id: '', block_id: '' });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка создания записи');
    }
  };

  const update = async (row: Record<string, any>) => {
    const patchText = prompt('Введите JSON для обновления', JSON.stringify(row, null, 2));
    if (!patchText) return;
    try {
      const payload = JSON.parse(patchText);
      delete payload.id;
      await crmUpdateCatalog(entity, String(row.id), payload);
      await load();
    } catch {
      setError('Неверный JSON или ошибка обновления');
    }
  };

  const remove = async (row: Record<string, any>) => {
    if (!confirm(`Удалить запись ${row.id}?`)) return;
    try {
      await crmDeleteCatalog(entity, String(row.id));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка удаления');
    }
  };

  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-4">Каталог объектов (CRM)</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={entity}
          onChange={e => {
            const next = e.target.value as Entity;
            setEntity(next);
            setForm(next === 'blocks' ? { id: '', name: '' } : { id: '', building_id: '', block_id: '' });
          }}
        >
          <option value="blocks">ЖК / комплексы</option>
          <option value="apartments">Квартиры</option>
        </select>
        <input className="border rounded-lg px-3 py-2 text-sm w-72" placeholder="Поиск" value={q} onChange={e => setQ(e.target.value)} />
        <Button variant="outline" onClick={() => void load()}>Найти</Button>
      </div>

      <form onSubmit={create} className="rounded-2xl border bg-background p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="id" value={form.id ?? ''} onChange={e => setForm({ ...form, id: e.target.value })} />
        {entity === 'blocks' ? (
          <>
            <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="name" value={form.name ?? ''} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <Button type="submit">Создать ЖК</Button>
          </>
        ) : (
          <>
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="building_id" value={form.building_id ?? ''} onChange={e => setForm({ ...form, building_id: e.target.value })} required />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="block_id" value={form.block_id ?? ''} onChange={e => setForm({ ...form, block_id: e.target.value })} required />
            <Button type="submit">Создать квартиру</Button>
          </>
        )}
      </form>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <div className="rounded-2xl border bg-background divide-y">
        {rows.map(row => (
          <div key={String(row.id)} className="p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{row.name ?? row.number ?? row.id}</div>
              <div className="text-xs text-muted-foreground truncate">id: {String(row.id)}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void update(row)}>Редактировать JSON</Button>
            <Button variant="destructive" size="sm" onClick={() => void remove(row)}>Удалить</Button>
          </div>
        ))}
        {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">Нет данных</div>}
      </div>
    </div>
  );
}

