import { useEffect, useMemo, useState } from 'react';
import { crmCreateUser, crmDeleteUser, crmGetRoles, crmGetUsers, crmUpdateUser, type CrmRole, type CrmUser } from '@/crm/api';
import { Button } from '@/components/ui/button';

export default function CrmUsers() {
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [roles, setRoles] = useState<CrmRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([crmGetUsers(query), crmGetRoles()]);
      setUsers(u.data);
      setRoles(r);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleMap = useMemo(() => Object.fromEntries(roles.map(r => [r.value, r.label])), [roles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmCreateUser({ name, email, password, role });
      setName('');
      setEmail('');
      setPassword('');
      setRole('user');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось создать пользователя');
    }
  };

  const handleRoleChange = async (user: CrmUser, nextRole: string) => {
    try {
      await crmUpdateUser(user.id, { role: nextRole });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось изменить роль');
    }
  };

  const handleDelete = async (user: CrmUser) => {
    if (!confirm(`Удалить пользователя ${user.email}?`)) return;
    try {
      await crmDeleteUser(user.id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось удалить пользователя');
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-4">Пользователи CRM</h1>

      <form onSubmit={handleCreate} className="rounded-2xl border bg-background p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} required />
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <select className="border rounded-lg px-3 py-2 text-sm" value={role} onChange={e => setRole(e.target.value)}>
          {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <Button type="submit">Создать пользователя</Button>
      </form>

      <div className="flex gap-2 mb-4">
        <input
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm"
          placeholder="Поиск по имени/email"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <Button variant="outline" onClick={() => void load()}>Найти</Button>
      </div>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      <div className="rounded-2xl border bg-background divide-y">
        {loading && <div className="p-4 text-sm text-muted-foreground">Загрузка...</div>}
        {!loading && users.map(u => (
          <div key={u.id} className="p-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">{u.name}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
            </div>
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={u.role}
              onChange={e => void handleRoleChange(u, e.target.value)}
            >
              {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <span className="text-xs text-muted-foreground w-28 text-right">{roleMap[u.role] ?? u.role}</span>
            <Button variant="destructive" size="sm" onClick={() => void handleDelete(u)}>Удалить</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

