import { useCMSStore } from '../store/cms-store';
import { Shield, ShieldCheck, ShieldAlert, Eye } from 'lucide-react';

const roleConfig = {
  admin: { label: 'Администратор', icon: ShieldAlert, color: 'bg-red-100 text-red-700' },
  editor: { label: 'Редактор', icon: ShieldCheck, color: 'bg-blue-100 text-blue-700' },
  author: { label: 'Автор', icon: Shield, color: 'bg-green-100 text-green-700' },
  viewer: { label: 'Наблюдатель', icon: Eye, color: 'bg-gray-100 text-gray-600' },
};

export default function AdminUsers() {
  const { users } = useCMSStore();

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Пользователи</h1>
      <div className="bg-background border rounded-2xl divide-y">
        {users.map(u => {
          const cfg = roleConfig[u.role];
          return (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-lg ${cfg.color} inline-flex items-center gap-1`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
