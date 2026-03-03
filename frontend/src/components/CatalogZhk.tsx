import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ZhkCard from './ZhkCard';
import { Skeleton } from './ui/skeleton';
import { useTopBlocks } from '@/hooks/useTopBlocks';
import ZhkMapOverlay from './ZhkMapOverlay';

const CatalogZhk = () => {
  const { blocks, loading, error } = useTopBlocks();
  const navigate = useNavigate();
  const [mapOpen, setMapOpen] = useState(false);

  const handleBlockClick = (blockSlug: string) => {
    setMapOpen(false);
    navigate(`/zhk/${blockSlug}`);
  };

  if (error) {
    return (
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">Каталог ЖК</h2>
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl">
            Ошибка загрузки: {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              Каталог ЖК в <span className="text-primary underline decoration-primary underline-offset-4">Москве</span> ↓
            </h2>
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={() => setMapOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors"
              >
                <MapPin className="w-4 h-4" /> На карте
              </button>
              <button 
                onClick={() => navigate('/catalog-zhk')}
                className="px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors"
              >
                Все предложения
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[420px] rounded-2xl" />
              ))
            ) : (
              blocks.map((zhk, i) => (
                <ZhkCard key={zhk.slug || i} data={zhk} />
              ))
            )}
          </div>
        </div>
      </section>
      
      <ZhkMapOverlay 
        open={mapOpen} 
        onClose={() => setMapOpen(false)}
        onBlockClick={handleBlockClick}
      />
    </>
  );
};

export default CatalogZhk;
