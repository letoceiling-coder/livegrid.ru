import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard, { type PropertyData } from './PropertyCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from './ui/skeleton';
import { useHotDeals } from '@/hooks/useHotDeals';
import { useStartSales } from '@/hooks/useStartSales';

interface Props { title: string; type: 'hot' | 'start'; }

const PropertyGridSection = ({ title, type }: Props) => {
  const navigate = useNavigate();
  
  // Вызываем только нужный хук в зависимости от type
  const hotDeals = type === 'hot' ? useHotDeals() : { properties: [], loading: false, error: null };
  const startSales = type === 'start' ? useStartSales() : { properties: [], loading: false, error: null };
  
  const properties = type === 'hot' ? hotDeals.properties : startSales.properties;
  const loading = type === 'hot' ? hotDeals.loading : startSales.loading;
  const error = type === 'hot' ? hotDeals.error : startSales.error;
  
  const [helpOpen, setHelpOpen] = useState(false);

  console.log('[PropertyGridSection]', { type, propertiesCount: properties.length, loading, error });

  if (error) {
    return (
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">{title}</h2>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <h2 className="text-2xl font-bold">{title}</h2>
          {type === 'start' ? (
            <Button size="lg" className="w-full sm:w-auto" onClick={() => setHelpOpen(true)}>
              Помощь с подбором
            </Button>
          ) : (
            <button 
              onClick={() => navigate('/catalog')}
              className="text-primary text-sm font-medium hover:underline"
            >
              Все предложения →
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[380px] rounded-2xl" />
            ))
          ) : (
            properties.slice(0, 4).map((p, i) => (
              <PropertyCard key={i} data={p} />
            ))
          )}
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
