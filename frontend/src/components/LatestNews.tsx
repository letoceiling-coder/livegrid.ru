import building1 from '@/assets/building1.jpg';
import { Skeleton } from './ui/skeleton';
import { useLatestNews } from '@/hooks/useLatestNews';

const fallbackImages = [building1];

const LatestNews = () => {
  const { news, loading, error } = useLatestNews(8);

  if (error) {
    return (
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Последние новости</h2>
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl">
            Ошибка загрузки: {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8">
      <div className="max-w-[1400px] mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Последние новости</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px] rounded-2xl" />
            ))
          ) : (
            news.map((n, i) => (
              <a
                key={n.id}
                href={`/news/${n.slug}`}
                className="rounded-2xl overflow-hidden bg-card border border-border hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={n.image_url || fallbackImages[i % fallbackImages.length]}
                    alt={n.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {n.category && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                      {n.category}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1 leading-tight">{n.title}</h3>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.published_at).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default LatestNews;
