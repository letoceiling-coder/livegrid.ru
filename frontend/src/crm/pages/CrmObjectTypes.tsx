import { useEffect, useState } from 'react';
import { crmCreateObjectType, crmDeleteObjectType, crmGetObjectTypes, crmUpdateObjectType, type CrmObjectType } from '@/crm/api';
import { Button } from '@/components/ui/button';

export default function CrmObjectTypes() {
  const [items, setItems] = useState<CrmObjectType[]>([]);
  const [query, setQuery] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await crmGetObjectTypes(query);
      setItems(page.data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки типов объектов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmCreateObjectType({ code, name, is_active: true, position: 0 });
      setCode('');
      setName('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось создать тип объекта');
    }
  };

  const handleToggle = async (item: CrmObjectType) => {
    try {
      await crmUpdateObjectType(item.id, { is_active: !item.is_active });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось обновить тип объекта');
    }
  };

  const handleRename = async (item: CrmObjectType) => {
    const nextName = prompt('Новое название типа объекта', item.name);
    if (!nextName || nextName.trim() === '') return;
    try {
      await crmUpdateObjectType(item.id, { name: nextName.trim() });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось обновить название');
    }
  };

  const handleDelete = async (item: CrmObjectType) => {
    if (!confirm(`Удалить тип объекта "${item.name}"?`)) return;
    try {
      await crmDeleteObjectType(item.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось удалить тип объекта');
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-4">Типы объектов</h1>

      <form onSubmit={handleCreate} className="rounded-2xl border bg-background p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Код (например apartment)" value={code} onChange={e => setCode(e.target.value)} required />
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Название" value={name} onChange={e => setName(e.target.value)} required />
        <Button type="submit">Добавить тип</Button>
      </form>

      <div className="flex gap-2 mb-4">
        <input
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm"
          placeholder="Поиск по коду или названию"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Button variant="outline" onClick={() => void load()}>Найти</Button>
      </div>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <div className="rounded-2xl border bg-background divide-y">
        {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>}
        {!loading && items.map(item => (
          <div key={item.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.code}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleRename(item)}>Переименовать</Button>
            <Button variant="outline" size="sm" onClick={() => void handleToggle(item)}>
              {item.is_active ? 'Деактивировать' : 'Активировать'}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void handleDelete(item)}>Удалить</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

