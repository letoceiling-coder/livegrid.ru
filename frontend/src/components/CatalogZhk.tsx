import { MapPin } from 'lucide-react';
import ZhkCard, { type ZhkData } from './ZhkCard';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';

const zhkList: ZhkData[] = [
  {
    images: [building1, building2, building3],
    name: 'ЖК Снегири', price: 'от 5.6 млн', unitsCount: 'В продаже 226 квартир',
    badges: ['Рассрочка 1 год', 'Ипотека 6%'],
    apartments: [
      { type: 'Студия', area: 'от 24 м.кв.', price: 'от 5.6 млн' },
      { type: '1-комнатная', area: 'от 32 м.кв.', price: 'от 7.2 млн' },
      { type: '2-комнатная', area: 'от 52 м.кв.', price: 'от 10.5 млн' },
      { type: '3-комнатная', area: 'от 79 м.кв.', price: 'от 14.2 млн' },
    ],
  },
  {
    images: [building2, building1, building4],
    name: 'КП Черкизово', price: 'от 16.6 млн', unitsCount: 'В продаже 56 коттеджей',
    badges: ['ТОП продаж', 'С ремонтом'],
    apartments: [
      { type: 'Коттедж', area: 'от 120 м.кв.', price: 'от 16.6 млн' },
      { type: 'Таунхаус', area: 'от 90 м.кв.', price: 'от 12.1 млн' },
    ],
  },
  {
    images: [building3, building2, building1],
    name: 'ЖК Смородина', price: 'от 3.8 млн', unitsCount: 'В продаже 795 квартир',
    badges: ['Эконом+', 'Ипотека 6%'],
    apartments: [
      { type: 'Студия', area: 'от 20 м.кв.', price: 'от 3.8 млн' },
      { type: '1-комнатная', area: 'от 30 м.кв.', price: 'от 5.4 млн' },
      { type: '2-комнатная', area: 'от 48 м.кв.', price: 'от 8.1 млн' },
    ],
  },
  {
    images: [building4, building3, building2],
    name: 'Таунхаусы в центре', price: 'от 32.8 млн', unitsCount: 'В продаже 22 таунхауса',
    badges: ['Рассрочка 1 год', 'Инвестиция'],
    apartments: [
      { type: 'Таунхаус', area: 'от 150 м.кв.', price: 'от 32.8 млн' },
    ],
  },
  {
    images: [building1, building3, building4],
    name: 'КП Черкизово', price: 'от 16.6 млн', unitsCount: 'В продаже 56 коттеджей',
    badges: [],
    apartments: [{ type: 'Коттедж', area: 'от 120 м.кв.', price: 'от 16.6 млн' }],
  },
  {
    images: [building2, building4, building1],
    name: 'КП Черкизово', price: 'от 16.6 млн', unitsCount: 'В продаже 56 коттеджей',
    badges: [],
    apartments: [{ type: 'Коттедж', area: 'от 120 м.кв.', price: 'от 16.6 млн' }],
  },
  {
    images: [building3, building1, building2],
    name: 'ЖК Смородина', price: 'от 3.8 млн', unitsCount: 'В продаже 795 квартир',
    badges: [],
    apartments: [{ type: 'Студия', area: 'от 20 м.кв.', price: 'от 3.8 млн' }],
  },
  {
    images: [building4, building2, building3],
    name: 'Таунхаусы в центре', price: 'от 32.8 млн', unitsCount: 'В продаже 22 таунхауса',
    badges: [],
    apartments: [{ type: 'Таунхаус', area: 'от 150 м.кв.', price: 'от 32.8 млн' }],
  },
];

const CatalogZhk = () => (
  <section className="py-8">
    <div className="max-w-[1400px] mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          Каталог ЖК в <span className="text-primary underline decoration-primary underline-offset-4">Москве</span> ↓
        </h2>
        <div className="hidden md:flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
            <MapPin className="w-4 h-4" /> На карте
          </button>
          <button className="px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
            Все предложения
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {zhkList.map((zhk, i) => (
          <ZhkCard key={i} data={zhk} />
        ))}
      </div>
    </div>
  </section>
);

export default CatalogZhk;
