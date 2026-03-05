import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LayoutGrid, List, Map, SlidersHorizontal, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import ComplexCard from '@/redesign/components/ComplexCard';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import MapSearch from '@/redesign/components/MapSearch';
import { useCatalogBlocks } from '@/hooks/useCatalogBlocks';
import { useMapObjects } from '@/hooks/useMapObjects';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useSearch } from '@/hooks/useSearch';
import { mapBlockToDisplay, mapBlockItemToDisplay } from '@/lib/blockDisplay';
import type { BlockListParams } from '@/api/blocksApi';
import type { MapBlocksParams } from '@/api/mapApi';
import type { CatalogBlockFilters } from '@/redesign/data/types';

const defaultFilters: CatalogBlockFilters = {
  search: '',
  district: [],
  builder: [],
  deadline_from: '',
  deadline_to: '',
  sort: 'price_from',
  order: 'asc',
  page: 1,
  per_page: 20,
};

function parseFromURL(params: URLSearchParams): Partial<CatalogBlockFilters> {
  const f: Partial<CatalogBlockFilters> = {};
  const q = params.get('q');
  if (q) f.search = q;
  const district = params.get('district');
  if (district) f.district = district.split(',').filter(Boolean);
  const builder = params.get('builder');
  if (builder) f.builder = builder.split(',').filter(Boolean);
  const from = params.get('deadline_from');
  if (from) f.deadline_from = from;
  const to = params.get('deadline_to');
  if (to) f.deadline_to = to;
  const sort = params.get('sort') as CatalogBlockFilters['sort'] | null;
  if (sort && ['price_from', 'deadline', 'name'].includes(sort)) f.sort = sort;
  const order = params.get('order') as 'asc' | 'desc' | null;
  if (order === 'asc' || order === 'desc') f.order = order;
  const page = Number(params.get('page'));
  if (page >= 1) f.page = page;
  const perPage = Number(params.get('per_page'));
  if (perPage >= 1) f.per_page = Math.min(100, perPage);
  return f;
}

function buildURL(f: CatalogBlockFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search) p.set('q', f.search);
  if (f.district.length) p.set('district', f.district.join(','));
  if (f.builder.length) p.set('builder', f.builder.join(','));
  if (f.deadline_from) p.set('deadline_from', f.deadline_from);
  if (f.deadline_to) p.set('deadline_to', f.deadline_to);
  if (f.sort !== 'price_from') p.set('sort', f.sort);
  if (f.order !== 'asc') p.set('order', f.order);
  if (f.page > 1) p.set('page', String(f.page));
  if (f.per_page !== 20) p.set('per_page', String(f.per_page));
  return p;
}

type ViewMode = 'grid' | 'list' | 'map';

const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border animate-pulse" style={{ height: '420px', minHeight: '420px' }}>
    <div className="bg-muted h-[260px]" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-4 bg-muted rounded w-1/3 ml-auto" />
    </div>
  </div>
);

const SkeletonCardList = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border h-[140px] animate-pulse flex gap-3 p-3">
    <div className="w-[140px] h-full bg-muted rounded-lg shrink-0" />
    <div className="flex-1 space-y-2 py-1">
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/3" />
    </div>
  </div>
);

const RedesignCatalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initial = useMemo(() => {
    const parsed = parseFromURL(searchParams);
    return { ...defaultFilters, ...parsed };
  }, [searchParams]);

  const [filters, setFilters] = useState<CatalogBlockFilters>(initial);
  const [view, setView] = useState<ViewMode>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [mapActive, setMapActive] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [searchFocused, setSearchFocused] = useState(false);

  // Restore from URL on mount / external navigation
  useEffect(() => {
    const parsed = parseFromURL(searchParams);
    const next = { ...defaultFilters, ...parsed };
    setFilters(prev => (JSON.stringify(prev) !== JSON.stringify(next) ? next : prev));
    setSearchInput(next.search);
  }, [searchParams]);

  const { filters: filterOptions, loading: filtersLoading } = useCatalogFilters();

  const apiParams: BlockListParams = useMemo(() => {
    const p: BlockListParams = {
      page: filters.page,
      per_page: view === 'map' ? 100 : filters.per_page,
      sort: filters.sort,
      order: filters.order,
    };
    if (filters.search) p.search = filters.search;
    if (filters.district.length) p.district = filters.district;
    if (filters.builder.length) p.builder = filters.builder;
    if (filters.deadline_from) p.deadline_from = filters.deadline_from;
    if (filters.deadline_to) p.deadline_to = filters.deadline_to;
    return p;
  }, [filters, view]);

  const { blocks, meta, loading, error } = useCatalogBlocks(apiParams, apiParams.page ?? 1, apiParams.per_page ?? 20);

  const displayedBlocks = useMemo(() => blocks.map(mapBlockToDisplay), [blocks]);

  // Map view: fetch ALL blocks without viewport (no lat_min/lat_max/lng_min/lng_max)
  const mapParams: MapBlocksParams = useMemo(() => {
    const p: MapBlocksParams = {};
    if (filters.search) p.search = filters.search;
    if (filters.district.length) p.district = filters.district;
    if (filters.builder.length) p.builder = filters.builder;
    if (filters.deadline_from) p.deadline_from = filters.deadline_from;
    if (filters.deadline_to) p.deadline_to = filters.deadline_to;
    return p;
  }, [filters.search, filters.district, filters.builder, filters.deadline_from, filters.deadline_to]);
  const { objects: mapBlocks } = useMapObjects(mapParams);
  const mapDisplayBlocks = useMemo(() => mapBlocks.map(mapBlockItemToDisplay), [mapBlocks]);

  const totalCount = meta?.total ?? 0;

  const updateURL = useCallback((f: CatalogBlockFilters) => {
    const p = buildURL(f);
    setSearchParams(p, { replace: true });
  }, [setSearchParams]);

  const updateFilters = useCallback((upd: Partial<CatalogBlockFilters>) => {
    setFilters(prev => {
      const next = { ...prev, ...upd };
      if (upd.district !== undefined || upd.builder !== undefined || upd.deadline_from !== undefined || upd.deadline_to !== undefined || upd.search !== undefined || upd.sort !== undefined || upd.order !== undefined) {
        next.page = 1;
      }
      updateURL(next);
      return next;
    });
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSearchInput('');
    updateURL(defaultFilters);
  }, [updateURL]);

  const hasFilters = filters.search || filters.district.length > 0 || filters.builder.length > 0 || filters.deadline_from || filters.deadline_to;

  // Live search for suggestions
  const { results: searchResults, loading: searchLoading } = useSearch(searchInput);

  const showSuggestions = searchFocused && searchInput.trim().length >= 2;
  const suggestionComplexes = (searchResults?.residential_complexes ?? []).slice(0, 5);
  const suggestionApartments = (searchResults?.apartments ?? []).slice(0, 5);
  const hasSuggestions = suggestionComplexes.length > 0 || suggestionApartments.length > 0;

  const handleSearchSubmit = (value: string) => {
    setSearchInput(value);
    updateFilters({ search: value.trim() });
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Жилые комплексы</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Найдено {loading ? '...' : totalCount.toLocaleString('ru-RU')} объектов
            </p>
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
                    view === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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
                <FilterSidebar
                  filterOptions={filterOptions}
                  filtersLoading={filtersLoading}
                  filters={filters}
                  onChange={updateFilters}
                  onClear={handleClearFilters}
                  totalCount={totalCount}
                  hasFilters={hasFilters}
                />
              </div>
            </aside>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Search with suggestions */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по названию, району, метро..."
                className="w-full pl-9 pr-4 h-10 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSearchSubmit(searchInput);
                }}
              />
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Поиск...</div>
                  ) : hasSuggestions ? (
                    <div className="py-2 max-h-[320px] overflow-y-auto">
                      {suggestionComplexes.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Жилые комплексы</div>
                      )}
                      {suggestionComplexes.map(c => (
                        <Link
                          key={c.id}
                          to={`/complex/${c.slug}`}
                          className="block px-4 py-2.5 hover:bg-accent text-sm"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[c.district, c.metro].filter(Boolean).join(' · ')}
                          </div>
                        </Link>
                      ))}
                      {suggestionApartments.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground mt-2">Квартиры</div>
                      )}
                      {suggestionApartments.map(a => (
                        <Link
                          key={a.id}
                          to={`/apartment/${a.id}`}
                          className="block px-4 py-2.5 hover:bg-accent text-sm"
                        >
                          <div className="font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.price != null ? `${(a.price / 1_000_000).toFixed(2)} млн ₽` : ''}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">Ничего не найдено</div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            {view === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading
                  ? Array.from({ length: Math.min(6, filters.per_page) }, (_, i) => <SkeletonCard key={i} />)
                  : displayedBlocks.map(c => <ComplexCard key={c.id} complex={c} />)}
              </div>
            )}
            {view === 'list' && (
              <div className="space-y-4">
                {loading
                  ? Array.from({ length: Math.min(5, filters.per_page) }, (_, i) => <SkeletonCardList key={i} />)
                  : displayedBlocks.map(c => <ComplexCard key={c.id} complex={c} variant="list" />)}
              </div>
            )}
            {view === 'map' && (
              <MapSearch complexes={mapDisplayBlocks} activeSlug={mapActive} onSelect={setMapActive} fitAllMarkers />
            )}

            {!loading && displayedBlocks.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <SlidersHorizontal className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium mb-2">Объекты не найдены</p>
                <p className="text-muted-foreground text-sm mb-4">Попробуйте изменить параметры поиска.</p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Сбросить фильтры
                </Button>
              </div>
            )}

            {/* Pagination — list/grid only */}
            {view !== 'map' && !loading && displayedBlocks.length > 0 && (meta?.last_page ?? 1) > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 mt-8">
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, meta!.last_page) }, (_, i) => {
                    const start = Math.max(1, Math.min(filters.page - 2, meta!.last_page - 4));
                    const p = start + i;
                    if (p > meta!.last_page) return null;
                    return (
                      <Button
                        key={p}
                        variant={filters.page === p ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateFilters({ page: p })}
                      >
                        {p}
                      </Button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Показать:
                  <select
                    value={filters.per_page}
                    onChange={e => updateFilters({ per_page: Number(e.target.value), page: 1 })}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-sm"
                  >
                    {[20, 30, 50, 100].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
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
            <FilterSidebar
              filterOptions={filterOptions}
              filtersLoading={filtersLoading}
              filters={filters}
              onChange={upd => { updateFilters(upd); }}
              onClear={handleClearFilters}
              totalCount={totalCount}
              hasFilters={hasFilters}
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowMobileFilters(false)}>
              Показать {totalCount} объектов
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedesignCatalog;
