import { Building, Users, MapPin, Award } from 'lucide-react';

const stats = [
  { value: '100 000+', label: 'объектов', icon: Building },
  { value: '50 000+', label: 'пользователей', icon: Users },
  { value: '85', label: 'регионов', icon: MapPin },
  { value: '10 лет', label: 'на рынке', icon: Award },
];

const AboutPlatform = () => (
  <section className="py-12 bg-secondary">
    <div className="max-w-[1400px] mx-auto px-4">
      <h2 className="text-2xl font-bold mb-2">О платформе Live Grid</h2>
      <p className="text-lg text-muted-foreground mb-1">Платформа по недвижимости</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-2xl">
        LiveGrid — это современная платформа для поиска и продажи недвижимости в России.
        Мы объединяем застройщиков, агентства и частных продавцов на одной площадке,
        предоставляя удобные инструменты для поиска идеального объекта.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-background rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
            <s.icon className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default AboutPlatform;
