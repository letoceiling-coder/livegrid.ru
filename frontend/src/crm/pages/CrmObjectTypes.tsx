const types = [
  { key: 'apartment', label: 'Квартиры' },
  { key: 'block', label: 'ЖК / комплексы' },
  { key: 'parking', label: 'Паркинги' },
  { key: 'house', label: 'Дома' },
  { key: 'land', label: 'Участки' },
  { key: 'commercial', label: 'Коммерция' },
];

export default function CrmObjectTypes() {
  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Типы объектов</h1>
      <div className="rounded-2xl border bg-background divide-y">
        {types.map(t => (
          <div key={t.key} className="p-4 flex items-center justify-between">
            <span className="font-medium">{t.label}</span>
            <span className="text-xs text-muted-foreground">{t.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

