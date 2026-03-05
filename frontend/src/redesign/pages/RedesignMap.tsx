import { useState, useMemo } from 'react';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import MapSearch from '@/redesign/components/MapSearch';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import { complexes } from '@/redesign/data/mock-data';
import { defaultFilters, type CatalogFilters } from '@/redesign/data/types';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RedesignMap = () => {
  const [filters, setFilters] = useState<CatalogFilters>({ ...defaultFilters });
  const [active, setActive] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return complexes.filter(c => {
      const q = filters.search.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.district.toLowerCase().includes(q) && !c.subway.toLowerCase().includes(q)) return false;
      if (filters.district.length && !filters.district.includes(c.district)) return false;
      if (filters.subway.length && !filters.subway.includes(c.subway)) return false;
      if (filters.builder.length && !filters.builder.includes(c.builder)) return false;
      return true;
    });
  }, [filters]);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Filters sidebar */}
        <aside className="hidden lg:block w-[280px] border-r border-border p-4 overflow-y-auto">
          <FilterSidebar filters={filters} onChange={setFilters} totalCount={filtered.length} />
        </aside>

        {/* Map */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <span className="text-sm font-semibold">{filtered.length} объектов на карте</span>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setShowFilters(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
            </Button>
          </div>
          <MapSearch complexes={filtered} activeSlug={active} onSelect={setActive} />
        </div>
      </div>

      {/* Mobile filters */}
      {showFilters && (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-background z-10">
            <span className="font-semibold">Фильтры</span>
            <button onClick={() => setShowFilters(false)} className="w-10 h-10 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4 pb-24">
            <FilterSidebar filters={filters} onChange={setFilters} totalCount={filtered.length} />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowFilters(false)}>Показать {filtered.length} объектов</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignMap;
