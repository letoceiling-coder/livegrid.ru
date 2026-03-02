import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Eye } from 'lucide-react';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import QuizSection from '@/components/QuizSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import ContactsSection from '@/components/ContactsSection';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';

const allNews = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  slug: `news-${i + 1}`,
  image: [building1, building2, building3, building4][i % 4],
  title: [
    'Старт продаж нового корпуса в ЖК Смородина — квартиры от 3.4 млн рублей',
    'Специальные условия на ипотеку для новостроек — ставка от 3% годовых',
    'Открытие продаж в новом жилом комплексе на юге Москвы с панорамными видами',
    'Ремонт в подарок при покупке квартиры до конца месяца — акция застройщика',
  ][i % 4],
  description: 'Подробности акции и условия приобретения объектов недвижимости в данном жилом комплексе.',
  date: `${String(28 - (i % 28)).padStart(2, '0')} фев 2025`,
  views: 150 + i * 12,
  badge: i % 3 === 0 ? 'НОВОЕ' : null,
  redBadge: i % 2 === 0 ? 'СТАРТ ПРОДАЖ' : 'РЕМОНТ В ПОДАРОК',
}));

const PER_PAGE_OPTIONS = [30, 50, 100];

const News = () => {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  const totalPages = Math.ceil(allNews.length / perPage);
  const paged = allNews.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-2">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Главная</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Новости</span>
        </nav>
      </div>

      {/* Title */}
      <div className="max-w-[1400px] mx-auto px-4 pb-6">
        <h1 className="text-3xl font-bold">Все новости</h1>
      </div>

      {/* News Grid */}
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {paged.map((n) => (
            <Link
              key={n.id}
              to={`/news/${n.slug}`}
              className="rounded-2xl overflow-hidden bg-card border border-border hover:shadow-lg transition-shadow group flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <img
                  src={n.image}
                  alt={n.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {n.badge && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                    {n.badge}
                  </span>
                )}
                <span className="absolute top-3 right-3 px-2.5 py-1 bg-destructive text-destructive-foreground rounded-full text-xs font-medium">
                  {n.redBadge}
                </span>
              </div>
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-semibold text-sm mb-1 leading-tight line-clamp-2">{n.title}</h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{n.description}</p>
                <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                  <span>{n.date}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {n.views}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="max-w-[1400px] mx-auto px-4 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-accent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Показать</span>
            {PER_PAGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => { setPerPage(opt); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  opt === perPage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-accent'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <QuizSection />
      <AboutPlatform />
      <AdditionalFeatures />
      <ContactsSection />
      <FooterSection />
    </div>
  );
};

export default News;
