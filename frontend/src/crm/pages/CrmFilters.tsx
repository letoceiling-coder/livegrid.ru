import { useEffect, useState } from 'react';
import { getFilters } from '@/api/filtersApi';

export default function CrmFilters() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFilters()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-4">Управление фильтрами</h1>
      {loading && <p className="text-sm text-muted-foreground">Загрузка...</p>}
      {!loading && (
        <div className="rounded-2xl border bg-background p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Текущие данные фильтров из API. Редактирование осуществляется через справочники и каталог.
          </p>
          <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-[60vh]">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

