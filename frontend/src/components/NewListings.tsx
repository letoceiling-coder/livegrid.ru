import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import PropertyCard from './PropertyCard';
import { Skeleton } from './ui/skeleton';
import { useNewListings } from '@/hooks/useNewListings';
import api from '@/lib/api';

const NewListings = () => {
  const { properties, loading, error } = useNewListings();
  const [apartmentsCount, setApartmentsCount] = useState(100000);
  const [blocksCount, setBlocksCount] = useState(0);

  useEffect(() => {
    // Загружаем статистику для правого блока
    api.get('/stats/general')
      .then((res) => {
        if (res.data?.total_apartments) {
          setApartmentsCount(res.data.total_apartments);
        }
        if (res.data?.total_blocks) {
          setBlocksCount(res.data.total_blocks);
        }
      })
      .catch(() => {
        // Если API недоступен, оставляем fallback
      });
  }, []);

  console.log('[NewListings]', { propertiesCount: properties.length, loading, error });

  if (error) {
    return (
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Новые объявления</h2>
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl">
            Ошибка загрузки: {error}
          </div>
        </div>
      </section>
    );
  }

  // Форматируем число: 62214 → "62 000+"
  const formatCount = (num: number) => {
    if (num >= 1000) {
      return `${Math.floor(num / 1000)} ${String(num).slice(-3).replace(/^0+/, '000')}+`;
    }
    return `${num.toLocaleString('ru-RU')}+`;
  };

  return (
    <section className="py-8">
      <div className="max-w-[1400px] mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Новые объявления</h2>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Карточки: grid 1/2/3 колонок по breakpoint */}
          <div className="order-2 lg:order-1 flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[300px] rounded-2xl" />
              ))
            ) : (
              properties.slice(0, 6).map((p, i) => (
                <PropertyCard key={p.slug || i} data={p} />
              ))
            )}
          </div>
          {/* Промо-блок: справа на desktop, внизу после карточек на mobile */}
          <div className="flex flex-col lg:w-[280px] lg:shrink-0 lg:sticky lg:top-20 lg:self-start">
            <div className="bg-primary rounded-2xl p-6 text-primary-foreground flex flex-col">
              <div className="text-4xl md:text-5xl font-bold mb-1">{apartmentsCount.toLocaleString('ru-RU')}</div>
              <div className="text-base font-medium mb-4">квартир</div>
              <div className="text-2xl font-bold mb-1">{blocksCount.toLocaleString('ru-RU')}+</div>
              <div className="text-base font-medium mb-6">комплексов ЖК</div>
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center w-full sm:w-auto bg-primary-foreground text-foreground px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px] shrink-0"
              >
                Каталог
              </Link>
              <div className="mt-6 pt-4 border-t border-primary-foreground/20 flex justify-center overflow-hidden rounded-b-xl">
                <Building2 className="w-16 h-16 text-primary-foreground/40 object-contain" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewListings;
