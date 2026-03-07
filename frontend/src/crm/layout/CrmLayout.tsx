import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShieldCheck, Image, Building2, Layers, Boxes, BookOpen, Filter, SlidersHorizontal, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/crm', icon: LayoutDashboard, label: 'CRM Дашборд', end: true },
  { to: '/crm/users', icon: Users, label: 'Пользователи' },
  { to: '/crm/roles', icon: ShieldCheck, label: 'Роли' },
  { to: '/crm/media', icon: Image, label: 'Медиаменеджер' },
  { to: '/crm/catalog', icon: Building2, label: 'Каталог объектов' },
  { to: '/crm/object-types', icon: Layers, label: 'Типы объектов' },
  { to: '/crm/objects', icon: Boxes, label: 'Объекты (новая модель)' },
  { to: '/crm/properties', icon: SlidersHorizontal, label: 'Свойства объектов' },
  { to: '/crm/dictionaries', icon: BookOpen, label: 'Справочники' },
  { to: '/crm/filters', icon: Filter, label: 'Фильтры' },
  { to: '/crm/feed', icon: RefreshCw, label: 'Обновление Feed' },
];

export default function CrmLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      <aside
        className={cn(
          'flex flex-col border-r bg-background transition-all duration-200',
          collapsed ? 'w-16' : 'w-72'
        )}
      >
        <div className="flex items-center gap-2 px-4 h-14 border-b shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-xs">CRM</span>
          </div>
          {!collapsed && <span className="font-bold text-sm truncate">Live Grid CRM</span>}
        </div>

        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center h-12 border-t text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

