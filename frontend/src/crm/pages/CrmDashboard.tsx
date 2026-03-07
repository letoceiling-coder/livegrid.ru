export default function CrmDashboard() {
  const cards = [
    { title: 'Управление пользователями', desc: 'Создание, роли, удаление доступа' },
    { title: 'Каталог объектов', desc: 'ЖК и квартиры: CRUD + активность' },
    { title: 'Справочники', desc: 'Районы, метро, застройщики, отделки' },
    { title: 'Медиаменеджер', desc: 'Файлы, загрузки, фильтры по типам' },
    { title: 'Feed обновление', desc: 'Ручной запуск collect/inspect/analyze/sync' },
  ];

  return (
    <div className="p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-2">CRM</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Центр управления данными платформы. Раздел доступен только администраторам.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(card => (
          <div key={card.title} className="rounded-2xl border bg-background p-4">
            <h3 className="font-semibold">{card.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

