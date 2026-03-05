import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Map, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import ComplexCard from '@/redesign/components/ComplexCard';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import MapSearch from '@/redesign/components/MapSearch';
import { complexes } from '@/redesign/data/mock-data';
import { defaultFilters, type CatalogFilters } from '@/redesign/data/types';

type ViewMode = 'grid' | 'list' | 'map';

const RedesignCatalog = () => {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [view, setView] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<CatalogFilters>({ ...defaultFilters, search: initialSearch });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mapActive, setMapActive] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return complexes.filter(c => {
      const q = filters.search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.district.toLowerCase().includes(q) && !c.subway.toLowerCase().includes(q) && !c.builder.toLowerCase().includes(q)) return false;
      if (filters.district.length && !filters.district.includes(c.district)) return false;
      if (filters.subway.length && !filters.subway.includes(c.subway)) return false;
      if (filters.builder.length && !filters.builder.includes(c.builder)) return false;
      if (filters.deadline.length && !filters.deadline.includes(c.deadline)) return false;
      if (filters.status.length && !filters.status.includes(c.status)) return false;
      if (filters.priceMin && c.priceTo < filters.priceMin) return false;
      if (filters.priceMax && c.priceFrom > filters.priceMax) return false;
      return true;
    });
  }, [filters]);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Жилые комплексы</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Найдено {filtered.length} объектов</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="lg:hidden h-9" onClick={() => setShowMobileFilters(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
            </Button>
            <div className="hidden sm:flex items-center gap-0.5 border border-border rounded-xl p-1 bg-muted/50">
              {([['grid', LayoutGrid, 'Плитка'], ['list', List, 'Список'], ['map', Map, 'Карта']] as const).map(([mode, Icon, title]) => (
                <button
                  key={mode}
                  title={title}
                  onClick={() => setView(mode)}
                  className={cn(
                    'p-2 rounded-lg transition-all duration-200',
                    view === mode
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar filters (desktop) */}
          {view !== 'map' && (
            <aside className="hidden lg:block w-[280px] shrink-0">
              <div className="sticky top-20">
                <FilterSidebar filters={filters} onChange={setFilters} totalCount={filtered.length} />
              </div>
            </aside>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {view === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(c => <ComplexCard key={c.id} complex={c} />)}
              </div>
            )}
            {view === 'list' && (
              <div className="space-y-4">
                {filtered.map(c => (
                  <ComplexCard key={c.id} complex={c} variant="list" />
                ))}
              </div>
            )}
            {view === 'map' && (
              <MapSearch complexes={filtered} activeSlug={mapActive} onSelect={setMapActive} />
            )}
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm mb-2">Ничего не найдено</p>
                <p className="text-muted-foreground text-xs">Попробуйте изменить параметры фильтров</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-background z-10">
            <span className="font-semibold">Фильтры</span>
            <button onClick={() => setShowMobileFilters(false)} className="w-10 h-10 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 pb-24">
            <FilterSidebar filters={filters} onChange={setFilters} totalCount={filtered.length} />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowMobileFilters(false)}>
              Показать {filtered.length} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignCatalog;
