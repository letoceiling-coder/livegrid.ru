import { useState } from 'react';
import { MapPin, ChevronDown, Grid3x3, List, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import ZhkCard from '@/components/ZhkCard';
import ZhkCardRow from '@/components/ZhkCardRow';
import ZhkMap from '@/components/ZhkMap';
import PropertyGridSection from '@/components/PropertyGridSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import { useBlocks, type BlockFilters } from '@/hooks/useBlocks';
import { Skeleton } from '@/components/ui/skeleton';
import BlockFilters, { type BlockFilterValues } from '@/components/BlockFilters';

// Skeleton component for ZhkCard (matches card dimensions: 420px height)
const ZhkCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border" style={{ height: '420px' }}>
    <Skeleton className="w-full" style={{ height: '250px' }} />
    <div className="p-4" style={{ height: '170px' }}>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <Skeleton className="h-4 w-1/3 ml-auto" />
    </div>
  </div>
);

const ITEMS_PER_PAGE_OPTIONS = [50, 80, 100];

type ViewMode = 'grid' | 'list' | 'map';

const CatalogZhkPage = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  console.log('🗺️ CatalogZhk NEW VERSION with filters and map - v2.0');
  
  // Filter state
  const [filterValues, setFilterValues] = useState<BlockFilterValues>({
    districts: [],
    builders: [],
    priceMin: null,
    priceMax: null,
    deadlineFrom: null,
    deadlineTo: null,
  });
  
  // Applied filters (only update on search button click)
  const [appliedFilters, setAppliedFilters] = useState<BlockFilters>({});

  // Fetch blocks from API with applied filters
  const { blocks, rawBlocks, meta, loading, error } = useBlocks(appliedFilters, currentPage, perPage);

  const totalPages = meta?.last_page ?? 1;
  const totalItems = meta?.total ?? 0;

  const handleSearch = () => {
    // Convert BlockFilterValues to BlockFilters format
    const apiFilters: BlockFilters = {};
    
    if (filterValues.districts.length > 0) {
      apiFilters.district = filterValues.districts;
    }
    
    if (filterValues.builders.length > 0) {
      apiFilters.builder = filterValues.builders;
    }
    
    if (filterValues.deadlineFrom !== null) {
      apiFilters.deadline_from = filterValues.deadlineFrom;
    }
    
    if (filterValues.deadlineTo !== null) {
      apiFilters.deadline_to = filterValues.deadlineTo;
    }
    
    setAppliedFilters(apiFilters);
    setCurrentPage(1); // Reset to first page on new search
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page title + location */}
      <section className="py-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">
              Каталог объектов в{' '}
              <button className="text-primary inline-flex items-center gap-1 underline decoration-primary underline-offset-4">
                Москве <ChevronDown className="w-5 h-5" />
              </button>
            </h1>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
                <MapPin className="w-4 h-4" /> На карте
              </button>
              <button className="px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
                Все предложения
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters bar */}
      <section className="pb-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <BlockFilters
              values={filterValues}
              onChange={setFilterValues}
              onSearch={handleSearch}
              resultsCount={totalItems}
            />
            
            {/* View mode toggle */}
            <div className="flex items-center gap-1 border border-border rounded-full p-1 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary'
                }`}
                title="Плитка"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary'
                }`}
                title="Строки"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  viewMode === 'map' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-secondary'
                }`}
                title="Карта"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ZhK Grid/List/Map */}
      <section className="pb-8">
        <div className="max-w-[1400px] mx-auto px-4">
          {error && (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          )}
          
          {viewMode === 'map' ? (
            <ZhkMap
              filters={appliedFilters}
              onBlockClick={(blockSlug) => navigate(`/complex/${blockSlug}`)}
            />
          ) : loading ? (
            viewMode === 'list' ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border h-[120px] sm:h-[140px] animate-pulse bg-muted/40" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <ZhkCardSkeleton key={i} />
                ))}
              </div>
            )
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {rawBlocks.map(block => (
                <ZhkCardRow key={block.id} block={block} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {blocks.map(zhk => (
                <ZhkCard key={zhk.slug} data={zhk} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pagination (hidden for map view) */}
      {viewMode !== 'map' && (
        <section className="pb-10">
          <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Page numbers */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Show first page, current page ± 2, and last page */}
              {(() => {
                const pages: (number | 'ellipsis')[] = [];
                const maxVisible = 7;
                const current = currentPage;
                const last = totalPages;

                if (last <= maxVisible) {
                  // Show all pages if total is small
                  for (let i = 1; i <= last; i++) {
                    pages.push(i);
                  }
                } else {
                  // Show first, ellipsis, current ± 2, ellipsis, last
                  pages.push(1);
                  if (current > 4) {
                    pages.push('ellipsis');
                  }
                  const start = Math.max(2, current - 2);
                  const end = Math.min(last - 1, current + 2);
                  for (let i = start; i <= end; i++) {
                    pages.push(i);
                  }
                  if (current < last - 3) {
                    pages.push('ellipsis');
                  }
                  pages.push(last);
                }

                return pages.map((p, idx) => {
                  if (p === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        p === currentPage
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border hover:bg-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  );
                });
              })()}
              {currentPage < totalPages && (
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium ml-2"
                >
                  Следующая →
                </button>
              )}
            </div>

            {/* Per page */}
            <div className="flex items-center gap-2">
              {ITEMS_PER_PAGE_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => {
                    setPerPage(n);
                    setCurrentPage(1); // Reset to first page when changing per page
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    n === perPage
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Показано {blocks.length} объектов из {totalItems.toLocaleString('ru-RU')} в Москве и области
          </p>
        </div>
      </section>
      )}

      {/* Start Sales */}
      <PropertyGridSection title="Старт продаж" type="start" />

      {/* About Platform */}
      <AboutPlatform />

      {/* Additional Features */}
      <AdditionalFeatures />

      {/* Latest News */}
      <LatestNews />

      {/* Contacts */}
      <ContactsSection />

      {/* Footer */}
      <FooterSection />
    </div>
  );
};

export default CatalogZhkPage;
