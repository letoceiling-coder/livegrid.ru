import { useState } from 'react';
import { Link } from 'react-router-dom';
import catNovostroyki from '@/assets/cat-novostroyki.png';
import catSecondary from '@/assets/cat-secondary.png';
import catRent from '@/assets/cat-rent.png';
import catHouses from '@/assets/cat-houses.png';
import catPlots from '@/assets/cat-plots.png';
import catMortgage from '@/assets/cat-mortgage.png';
import catApartments from '@/assets/cat-apartments.png';
import catParking from '@/assets/cat-parking.png';
import catCommercial from '@/assets/cat-commercial.png';
import catSearch from '@/assets/cat-search.png';
import PickObjectModal from './PickObjectModal';

// Новый дизайн strict-template: 10 плиток
const categories = [
  { name: 'Новостройки', image: catNovostroyki, href: '/catalog' },
  { name: 'Вторичная\nнедвижимость', image: catSecondary, href: '/catalog-apartments' },
  { name: 'Аренда', image: catRent, href: '/catalog' },
  { name: 'Дома', image: catHouses, href: '/catalog' },
  { name: 'Участки', image: catPlots, href: '/catalog' },
  { name: 'Ипотека', image: catMortgage, href: '/ipoteka' },
  { name: 'Квартиры', image: catApartments, href: '/catalog-apartments' },
  { name: 'Паркинги', image: catParking, href: '/catalog' },
  { name: 'Коммерческая\nнедвижимость', image: catCommercial, href: '/catalog' },
  { name: 'Подобрать\nобъект', image: catSearch, action: 'modal' as const },
];

const CategoryTiles = () => {
  const [pickModalOpen, setPickModalOpen] = useState(false);

  return (
    <section className="py-4">
      <div className="max-w-[1400px] mx-auto px-4 md:px-4 sm:px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories.map((cat, i) =>
            cat.action === 'modal' ? (
              <button
                key={i}
                onClick={() => setPickModalOpen(true)}
                className="bg-secondary rounded-2xl p-4 flex flex-col items-start hover:opacity-90 transition-opacity min-h-[130px] md:min-h-[150px] relative overflow-hidden group text-left cursor-pointer w-full border-0"
              >
                <span className="font-semibold text-sm whitespace-pre-line relative z-10">{cat.name}</span>
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute bottom-0 right-0 w-20 h-20 md:w-28 md:h-28 object-contain group-hover:scale-105 transition-transform pointer-events-none"
                />
              </button>
            ) : (
              <Link
                key={i}
                to={cat.href!}
                className="bg-secondary rounded-2xl p-4 flex flex-col items-start hover:shadow-md transition-shadow min-h-[130px] md:min-h-[150px] relative overflow-hidden group cursor-pointer"
              >
                <span className="font-semibold text-sm whitespace-pre-line relative z-10">{cat.name}</span>
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute bottom-0 right-0 w-20 h-20 md:w-28 md:h-28 object-contain group-hover:scale-105 transition-transform pointer-events-none"
                />
              </Link>
            )
          )}
        </div>
      </div>
      <PickObjectModal open={pickModalOpen} onClose={() => setPickModalOpen(false)} />
    </section>
  );
};

export default CategoryTiles;
