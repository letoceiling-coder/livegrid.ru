import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

type MediaItem = {
  id: string | number;
  path: string;
  alt?: string | null;
  type: 'image' | 'video' | 'document';
  folder?: string | null;
  tags?: string[] | null;
  is_active?: boolean;
  position?: number;
  created_at?: string;
};

export default function CrmMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'image' | 'video' | 'document'>('image');
  const [folder, setFolder] = useState('');
  const [tags, setTags] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [position, setPosition] = useState(0);
  const [alt, setAlt] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<any>('/admin/media', {
        params: {
          per_page: 100,
          q: search || undefined,
          type: filterType || undefined,
          folder: filterFolder || undefined,
        },
      });
      setItems(data?.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки медиа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    if (alt.trim()) form.append('alt', alt.trim());
    if (folder.trim()) form.append('folder', folder.trim());
    if (tags.trim()) {
      tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .forEach(tag => form.append('tags[]', tag));
    }
    form.append('is_active', isActive ? '1' : '0');
    form.append('position', String(position));
    try {
      await api.post('/admin/media', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      setAlt('');
      setFolder('');
      setTags('');
      setIsActive(true);
      setPosition(0);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки файла');
    }
  };

  const remove = async (id: string | number) => {
    if (!confirm('Удалить файл?')) return;
    try {
      await api.delete(`/admin/media/${id}`);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка удаления');
    }
  };

  const update = async (item: MediaItem) => {
    const nextAlt = prompt('Alt', item.alt ?? '') ?? item.alt ?? '';
    const nextFolder = prompt('Папка', item.folder ?? '') ?? item.folder ?? '';
    const nextTagsRaw = prompt('Теги через запятую', (item.tags ?? []).join(', '));
    const nextPosition = prompt('Позиция', String(item.position ?? 0));
    const nextActive = confirm('Оставить файл активным?');
    try {
      await api.put(`/admin/media/${item.id}`, {
        alt: nextAlt,
        folder: nextFolder,
        tags: (nextTagsRaw ?? '').split(',').map(t => t.trim()).filter(Boolean),
        position: Number(nextPosition ?? 0) || 0,
        is_active: nextActive,
      });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка обновления');
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-4">Медиаменеджер</h1>

      <form onSubmit={upload} className="rounded-2xl border bg-background p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} required className="border rounded-lg px-3 py-2 text-sm" />
        <select className="border rounded-lg px-3 py-2 text-sm" value={type} onChange={e => setType(e.target.value as any)}>
          <option value="image">Изображение</option>
          <option value="video">Видео</option>
          <option value="document">Документ</option>
        </select>
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Alt (опционально)" value={alt} onChange={e => setAlt(e.target.value)} />
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Папка" value={folder} onChange={e => setFolder(e.target.value)} />
        <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Теги через запятую" value={tags} onChange={e => setTags(e.target.value)} />
        <input className="border rounded-lg px-3 py-2 text-sm" type="number" placeholder="Позиция" value={position} onChange={e => setPosition(Number(e.target.value) || 0)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          Активный
        </label>
        <Button type="submit">Загрузить</Button>
      </form>

      <div className="rounded-2xl border bg-background p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="border rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Поиск по пути/alt" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Все типы</option>
          <option value="image">Изображение</option>
          <option value="video">Видео</option>
          <option value="document">Документ</option>
        </select>
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Фильтр по папке" value={filterFolder} onChange={e => setFilterFolder(e.target.value)} />
        <Button variant="outline" className="md:col-span-4" onClick={() => void load()}>Применить фильтры</Button>
      </div>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <div className="rounded-2xl border bg-background divide-y">
        {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>}
        {!loading && items.map(item => (
          <div key={item.id} className="p-4 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium break-all">{item.path}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {item.type}
                {item.alt ? ` · ${item.alt}` : ''}
                {item.folder ? ` · папка: ${item.folder}` : ''}
                {item.tags?.length ? ` · теги: ${item.tags.join(', ')}` : ''}
                {` · ${item.is_active ? 'активен' : 'неактивен'}`}
                {` · pos:${item.position ?? 0}`}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void update(item)}>Изменить</Button>
            <Button variant="destructive" size="sm" onClick={() => void remove(item.id)}>Удалить</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

