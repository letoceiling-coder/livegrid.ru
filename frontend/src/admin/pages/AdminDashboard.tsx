import { useCMSStore } from '../store/cms-store';
import { useContentStore } from '../store/content-store';
import { FileText, Image, Users, BarChart3, Plus, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { pages: cmsPages, media, users } = useCMSStore();
  const { pages: contentPages } = useContentStore();

  const stats = [
    { label: 'Контентные', value: contentPages.length, icon: Layers, color: 'bg-primary/10 text-primary' },
    { label: 'Конструктор', value: cmsPages.length, icon: FileText, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'Медиа', value: media.length, icon: Image, color: 'bg-green-500/10 text-green-600' },
    { label: 'Пользователи', value: users.length, icon: Users, color: 'bg-purple-500/10 text-purple-600' },
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <p className="text-muted-foreground text-sm mt-1">Обзор вашей CMS</p>
        </div>
        <Link
          to="/admin/pages"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Управление страницами
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-background border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-muted-foreground text-sm">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Content pages */}
      <div className="bg-background border rounded-2xl p-5 mb-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Контентные страницы
        </h2>
        <div className="space-y-2">
          {contentPages.map(p => (
            <Link
              key={p.slug}
              to={`/admin/page-editor/${encodeURIComponent(p.slug)}`}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{p.title}</span>
                <span className="text-xs text-muted-foreground">{p.slug}</span>
                <span className="text-xs text-muted-foreground">• {p.sections.length} секций</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg ${
                p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {p.status === 'published' ? 'Опубликовано' : 'Черновик'}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* CMS pages */}
      {cmsPages.length > 0 && (
        <div className="bg-background border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Конструктор страниц</h2>
          <div className="space-y-2">
            {cmsPages.slice(0, 5).map(p => (
              <Link
                key={p.id}
                to={`/admin/editor/${p.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.slug}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg ${
                  p.status === 'published' ? 'bg-green-100 text-green-700' :
                  p.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {p.status === 'published' ? 'Опубликовано' : p.status === 'draft' ? 'Черновик' : 'Архив'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
