import { Settings } from 'lucide-react';

export default function AdminSettings() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>
      <div className="bg-background border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Общие настройки</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Название сайта</label>
            <input defaultValue="Live Grid" className="border rounded-xl px-3 py-2 text-sm w-full bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Описание</label>
            <textarea defaultValue="Платформа для управления контентом" className="border rounded-xl px-3 py-2 text-sm w-full bg-background" rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Язык по умолчанию</label>
            <select className="border rounded-xl px-3 py-2 text-sm bg-background">
              <option>Русский</option>
              <option>English</option>
            </select>
          </div>
          <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
