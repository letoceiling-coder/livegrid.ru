import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';

const news = [
  { image: building1, title: 'Обзор новостроек Москвы 2025', date: '15 фев 2025', category: 'Обзор' },
  { image: building2, title: 'Ипотечные ставки снижены до 6%', date: '12 фев 2025', category: 'Ипотека' },
  { image: building3, title: 'Новый жилой комплекс на юге Москвы', date: '10 фев 2025', category: 'Новостройки' },
  { image: building4, title: 'Как выбрать квартиру в 2025 году', date: '08 фев 2025', category: 'Советы' },
  { image: building2, title: 'Рынок коммерческой недвижимости растёт', date: '05 фев 2025', category: 'Аналитика' },
  { image: building1, title: 'Программа реновации: итоги 2024', date: '01 фев 2025', category: 'Реновация' },
  { image: building3, title: 'Тренды дизайна интерьера 2025', date: '28 янв 2025', category: 'Дизайн' },
  { image: building4, title: 'Загородная недвижимость: спрос растёт', date: '25 янв 2025', category: 'Загород' },
];

const LatestNews = () => (
  <section className="py-8">
    <div className="max-w-[1400px] mx-auto px-4">
      <h2 className="text-2xl font-bold mb-6">Последние новости</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {news.map((n, i) => (
          <a key={i} href="#" className="rounded-2xl overflow-hidden bg-card border border-border hover:shadow-lg transition-shadow group">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img src={n.image} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <span className="absolute top-3 left-3 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">{n.category}</span>
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm mb-1 leading-tight">{n.title}</h3>
              <span className="text-xs text-muted-foreground">{n.date}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default LatestNews;
