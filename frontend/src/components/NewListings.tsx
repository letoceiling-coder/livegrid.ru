import PropertyCard, { type PropertyData } from './PropertyCard';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';

const properties: PropertyData[] = [
  { image: building1, title: 'ЖК Снегири', price: 'от 5.6 млн', address: 'Москва, ул. Снежная 12', area: '24 м²', rooms: 'Студия', badges: ['Рассрочка 1 год'] },
  { image: building2, title: 'КП Черкизово', price: 'от 16.6 млн', address: 'МО, д. Черкизово', area: '120 м²', rooms: '3 комн.', badges: ['ТОП продаж'] },
  { image: building3, title: 'ЖК Смородина', price: 'от 3.8 млн', address: 'Москва, ул. Ягодная 5', area: '32 м²', rooms: '1 комн.', badges: ['Эконом+'] },
  { image: building4, title: 'Таунхаусы в центре', price: 'от 32.8 млн', address: 'Москва, Центральный р-н', area: '180 м²', rooms: '4 комн.', badges: ['Инвестиция'] },
  { image: building3, title: 'ЖК Дубровка', price: 'от 4.2 млн', address: 'Москва, ул. Дубровская 8', area: '28 м²', rooms: 'Студия' },
  { image: building1, title: 'ЖК Парк Сити', price: 'от 7.1 млн', address: 'Москва, Парковая 15', area: '45 м²', rooms: '1 комн.' },
  { image: building2, title: 'ЖК Высота', price: 'от 12.3 млн', address: 'Москва, пр-т Мира 88', area: '68 м²', rooms: '2 комн.' },
  { image: building4, title: 'ЖК Лесной', price: 'от 9.5 млн', address: 'МО, г. Мытищи', area: '54 м²', rooms: '2 комн.' },
];

const NewListings = () => (
  <section className="py-8">
    <div className="max-w-[1400px] mx-auto px-4">
      <h2 className="text-2xl font-bold mb-6">Новые объявления</h2>
      <div className="flex gap-6">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {properties.map((p, i) => (
            <PropertyCard key={i} data={p} />
          ))}
        </div>
        <div className="hidden lg:flex flex-col justify-center w-[280px] shrink-0 bg-primary rounded-2xl p-6 text-primary-foreground">
          <div className="text-5xl font-bold mb-2">100 000 +</div>
          <div className="text-lg font-medium mb-6">объектов</div>
          <button className="bg-primary-foreground text-foreground px-5 py-2.5 rounded-full text-sm font-medium self-start hover:opacity-90 transition-opacity">
            Узнать больше
          </button>
        </div>
      </div>
    </div>
  </section>
);

export default NewListings;
