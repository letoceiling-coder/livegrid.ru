import { useEffect, useState } from 'react';
import { crmGetRoles, type CrmRole } from '@/crm/api';

export default function CrmRoles() {
  const [roles, setRoles] = useState<CrmRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crmGetRoles()
      .then(setRoles)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Роли пользователей</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Системные роли CRM. Назначаются в разделе «Пользователи».
      </p>

      <div className="rounded-2xl border bg-background divide-y">
        {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка ролей...</div>}
        {!loading && roles.map(r => (
          <div key={r.value} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{r.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

