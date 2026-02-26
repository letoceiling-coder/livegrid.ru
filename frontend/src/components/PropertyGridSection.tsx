import { useState } from 'react';
import PropertyCard, { type PropertyData } from './PropertyCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';

const hotDeals: PropertyData[] = [
  { image: building2, title: 'ЖК Высотный', price: 'от 8.9 млн', address: 'Москва, Ленинский пр-т', area: '52 м²', rooms: '2 комн.', badges: ['Скидка 10%'] },
  { image: building1, title: 'ЖК Солнечный', price: 'от 5.1 млн', address: 'Москва, ул. Солнечная', area: '34 м²', rooms: '1 комн.', badges: ['Акция'] },
  { image: building3, title: 'ЖК Престиж', price: 'от 15.2 млн', address: 'Москва, Тверская', area: '78 м²', rooms: '3 комн.' },
  { image: building4, title: 'ЖК Зеленый', price: 'от 6.7 млн', address: 'МО, г. Красногорск', area: '42 м²', rooms: '1 комн.' },
];

const startSales: PropertyData[] = [
  { image: building3, title: 'ЖК Новый Город', price: 'от 4.5 млн', address: 'МО, г. Балашиха', badges: ['Старт 2 кв. 2026'], description: 'Комплекс будет расположен в новом районе Москвы с развитой инфраструктурой' },
  { image: building2, title: 'ЖК Метрополь', price: 'от 11.8 млн', address: 'Москва, Арбат', badges: ['Старт 2 кв. 2027'], description: 'Комплекс будет расположен в новом районе Москвы с развитой инфраструктурой' },
  { image: building1, title: 'ЖК Ривьера', price: 'от 7.3 млн', address: 'Москва, наб. Москвы', badges: ['Старт 2 кв. 2027'], description: 'Комплекс будет расположен в новом районе Москвы с развитой инфраструктурой' },
  { image: building4, title: 'ЖК Династия', price: 'от 22.1 млн', address: 'Москва, Хамовники', badges: ['Старт 2 кв. 2027'], description: 'Комплекс будет расположен в новом районе Москвы с развитой инфраструктурой' },
];

interface Props { title: string; type: 'hot' | 'start'; }

const PropertyGridSection = ({ title, type }: Props) => {
  const data = type === 'hot' ? hotDeals : startSales;
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className="py-8">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <h2 className="text-2xl font-bold">{title}</h2>
          {type === 'start' ? (
            <Button size="lg" className="w-full sm:w-auto" onClick={() => setHelpOpen(true)}>
              Помощь с подбором
            </Button>
          ) : (
            <button className="text-primary text-sm font-medium hover:underline">Все предложения →</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.map((p, i) => (
            <PropertyCard key={i} data={p} />
          ))}
        </div>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Помощь с подбором</DialogTitle>
          </DialogHeader>
          <form className="space-y-4 mt-2" onSubmit={(e) => { e.preventDefault(); setHelpOpen(false); }}>
            <Input placeholder="Ваше имя" />
            <Input placeholder="Телефон" type="tel" />
            <Input placeholder="Бюджет, например: до 10 млн" />
            <Button type="submit" className="w-full">Отправить заявку</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PropertyGridSection;
