import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import FiltersOverlay from './FiltersOverlay';
import RegionSelector from './RegionSelector';
import api from '@/lib/api';
import { ApartmentFilters } from '@/hooks/useApartments';

const HeroSection = () => {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(121563);
  const [apartmentsCount, setApartmentsCount] = useState(100000);
  const [blocksCount, setBlocksCount] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<ApartmentFilters>({});
  const [filteredCount, setFilteredCount] = useState<number | null>(null);

  useEffect(() => {
    api.get('/stats/general')
      .then((res) => {
        if (res.data?.total_apartments) {
          setTotalCount(res.data.total_apartments);
          setApartmentsCount(res.data.total_apartments);
        }
        if (res.data?.total_blocks) {
          setBlocksCount(res.data.total_blocks);
        }
      })
      .catch(() => {});
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return Math.floor(num / 1000) + ' 000';
    }
    return num.toLocaleString('ru-RU');
  };

  const handleFiltersApply = (filters: ApartmentFilters) => {
    setCurrentFilters(filters);
    const withSearch = searchQuery ? { ...filters, search: searchQuery } : filters;
    api.get('/apartments', { params: { ...withSearch, per_page: 1 } })
      .then((res) => {
        const total = res.data?.meta?.total || 0;
        setFilteredCount(total);
      })
      .catch(() => setFilteredCount(null));
  };

  const handleShowResults = () => {
    const filters = searchQuery ? { ...currentFilters, search: searchQuery } : currentFilters;
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(`${key}[]`, String(v)));
      } else {
        queryParams.append(key, String(value));
      }
    });
    navigate(`/catalog?${queryParams.toString()}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleShowResults();
    }
  };

  const displayCount = filteredCount !== null ? filteredCount : totalCount;

  return (
    <>
      <section className="py-8 md:py-12">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="mb-6">
            <RegionSelector />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-center mb-8 leading-tight">
            <span className="text-primary italic">Live Grid.</span>{' '}
            {apartmentsCount > 0 && blocksCount > 0
              ? `${formatNumber(apartmentsCount)}+ квартир в ${blocksCount}+ комплексах по России`
              : 'Более 100 000 объектов по России'}
          </h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-[800px] mx-auto mb-6">
            <div className="flex-1 flex items-center bg-background rounded-full px-4 py-3 border border-border">
              <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Поиск по названию ЖК, району, метро"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>
            <button
              className="w-12 h-12 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0 self-center cursor-pointer"
              onClick={() => setFiltersOpen(true)}
              aria-label="Фильтры"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            <button
              className="bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap shrink-0 hover:bg-primary/90 transition-opacity cursor-pointer"
              onClick={handleShowResults}
            >
              Показать {displayCount.toLocaleString('ru-RU')} {filteredCount !== null ? 'найдено' : 'объекта'}
            </button>
          </div>
        </div>
      </section>
      <FiltersOverlay
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={handleFiltersApply}
      />
    </>
  );
};

export default HeroSection;
