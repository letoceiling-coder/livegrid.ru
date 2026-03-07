import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

type MediaItem = {
  id: string | number;
  path: string;
  alt?: string | null;
  type: 'image' | 'video' | 'document';
  created_at?: string;
};

export default function CrmMedia() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<'image' | 'video' | 'document'>('image');
  const [alt, setAlt] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<any>('/admin/media', { params: { per_page: 50 } });
      setItems(data?.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки медиа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    if (alt.trim()) form.append('alt', alt.trim());
    try {
      await api.post('/admin/media', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      setAlt('');
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
        <Button type="submit">Загрузить</Button>
      </form>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <div className="rounded-2xl border bg-background divide-y">
        {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>}
        {!loading && items.map(item => (
          <div key={item.id} className="p-4 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium break-all">{item.path}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.type}{item.alt ? ` · ${item.alt}` : ''}</div>
            </div>
            <Button variant="destructive" size="sm" onClick={() => void remove(item.id)}>Удалить</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

