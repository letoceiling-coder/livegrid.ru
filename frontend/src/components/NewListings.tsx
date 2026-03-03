import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropertyCard from './PropertyCard';
import buildingsPromo from '@/assets/buildings-promo.svg';
import { Skeleton } from './ui/skeleton';
import { useNewListings } from '@/hooks/useNewListings';
import api from '@/lib/api';

const NewListings = () => {
  const { properties, loading, error } = useNewListings();
  const [objectsCount, setObjectsCount] = useState(100000);

  useEffect(() => {
    api.get('/stats/general').then((res) => {
      if (res.data?.total_apartments) setObjectsCount(res.data.total_apartments);
    }).catch(() => {});
  }, []);

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

  const formatObjectsCount = (n: number) =>
    n >= 1000 ? `${n.toLocaleString('ru-RU')} +` : `${n}+`;

  return (
    <section className="py-8">
      <div className="max-w-[1400px] mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Новые объявления</h2>
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
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
          {/* Промо-блок: макет — синий фон, число, кнопка, крупная 3D-иллюстрация внизу */}
          <div className="flex flex-col lg:w-[280px] lg:min-w-[280px] lg:shrink-0 lg:sticky lg:top-20 order-1 lg:order-2">
            <div className="bg-primary rounded-3xl p-8 text-primary-foreground flex flex-col justify-between overflow-hidden flex-1 min-h-[420px] lg:min-h-0">
              <div className="shrink-0">
                <div className="text-[36px] md:text-[40px] font-bold leading-tight" style={{ lineHeight: 1.15 }}>
                  {formatObjectsCount(objectsCount)}
                </div>
                <div className="text-[36px] md:text-[40px] font-bold leading-tight mt-0.5">объектов</div>
                <p className="text-sm text-white/90 mt-3 leading-snug">
                  Еще больше объектов недвижимости в нашем каталоге
                </p>
                <Link
                  to="/catalog"
                  className="inline-flex items-center justify-center w-full sm:w-auto bg-primary-foreground text-foreground px-5 py-3 rounded-2xl text-sm font-medium hover:opacity-90 transition-colors duration-200 mt-5"
                >
                  Перейти в каталог
                </Link>
              </div>
              <div className="mt-6 flex-1 min-h-[200px] flex items-end overflow-hidden rounded-b-2xl">
                <img
                  src="/buildings-promo.png"
                  alt=""
                  className="w-full h-auto object-contain object-bottom scale-[1.2] origin-bottom max-w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewListings;
