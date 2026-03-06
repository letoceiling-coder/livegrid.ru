import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LayoutGrid, List, Map, SlidersHorizontal, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import ApartmentFilterSidebar from '@/redesign/components/ApartmentFilterSidebar';
import FooterSection from '@/components/FooterSection';
import PropertyCard from '@/components/PropertyCard';
import { useApartments } from '@/hooks/useApartments';
import { useFilters } from '@/hooks/useFilters';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useSearch } from '@/hooks/useSearch';
import type { ApartmentCatalogFilters } from '@/redesign/data/types';
import type { ApartmentFilters } from '@/hooks/useApartments';
import type { BlockListParams } from '@/api/blocksApi';
import type { MapBlocksParams } from '@/api/mapApi';
import type { MapViewportBounds } from '@/components/ZhkMap';

const DEFAULT_VIEWPORT: MapViewportBounds = {
  lat_min: 55.5, lat_max: 56.0, lng_min: 37.3, lng_max: 37.9,
};

const defaultFilters: ApartmentCatalogFilters = {
  search: '',
  district: [],
  builder: [],
  subway: [],
  finishing: [],
  room: [],
  deadline_from: '',
  deadline_to: '',
  sort: 'price',
  order: 'asc',
  page: 1,
  per_page: 20,
};

function parseFromURL(params: URLSearchParams): Partial<ApartmentCatalogFilters> {
  const f: Partial<ApartmentCatalogFilters> = {};
  const q = params.get('q');
  if (q) f.search = q;
  const room = params.get('room');
  if (room) f.room = room.split(',').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 5);
  const district = params.get('district');
  if (district) f.district = district.split(',').filter(Boolean);
  const builder = params.get('builder');
  if (builder) f.builder = builder.split(',').filter(Boolean);
  const subway = params.get('subway');
  if (subway) f.subway = subway.split(',').filter(Boolean);
  const finishing = params.get('finishing');
  if (finishing) f.finishing = finishing.split(',').filter(Boolean);
  const priceMin = params.get('price_min');
  if (priceMin) { const n = Number(priceMin); if (!isNaN(n)) f.price_min = n; }
  const priceMax = params.get('price_max');
  if (priceMax) { const n = Number(priceMax); if (!isNaN(n)) f.price_max = n; }
  const areaMin = params.get('area_min');
  if (areaMin) { const n = Number(areaMin); if (!isNaN(n)) f.area_min = n; }
  const areaMax = params.get('area_max');
  if (areaMax) { const n = Number(areaMax); if (!isNaN(n)) f.area_max = n; }
  const from = params.get('deadline_from');
  if (from) f.deadline_from = from;
  const to = params.get('deadline_to');
  if (to) f.deadline_to = to;
  const sort = params.get('sort') as ApartmentCatalogFilters['sort'] | null;
  if (sort && ['price', 'area_total', 'building_deadline_at', 'floor'].includes(sort)) f.sort = sort;
  const order = params.get('order') as 'asc' | 'desc' | null;
  if (order === 'asc' || order === 'desc') f.order = order;
  const page = Number(params.get('page'));
  if (page >= 1) f.page = page;
  const perPage = Number(params.get('per_page'));
  if (perPage >= 1) f.per_page = Math.min(100, perPage);
  return f;
}

function buildURL(f: ApartmentCatalogFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search) p.set('q', f.search);
  if (f.room.length) p.set('room', f.room.join(','));
  if (f.district.length) p.set('district', f.district.join(','));
  if (f.builder.length) p.set('builder', f.builder.join(','));
  if (f.finishing.length) p.set('finishing', f.finishing.join(','));
  if (f.price_min != null) p.set('price_min', String(f.price_min));
  if (f.price_max != null) p.set('price_max', String(f.price_max));
  if (f.area_min != null) p.set('area_min', String(f.area_min));
  if (f.area_max != null) p.set('area_max', String(f.area_max));
  if (f.deadline_from) p.set('deadline_from', f.deadline_from);
  if (f.deadline_to) p.set('deadline_to', f.deadline_to);
  if (f.sort !== 'price') p.set('sort', f.sort);
  if (f.order !== 'asc') p.set('order', f.order);
  if (f.page > 1) p.set('page', String(f.page));
  if (f.per_page !== 20) p.set('per_page', String(f.per_page));
  return p;
}

type ViewMode = 'grid' | 'list' | 'map';

const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border animate-pulse h-[280px]">
    <div className="bg-muted h-[160px]" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
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

const RedesignApartments = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = useMemo(() => {
    const parsed = parseFromURL(searchParams);
    return { ...defaultFilters, ...parsed };
  }, [searchParams]);

  const [filters, setFilters] = useState<ApartmentCatalogFilters>(initial);
  const [view, setView] = useState<ViewMode>('grid');
  const [viewport, setViewport] = useState<MapViewportBounds | null>(null);
  const [mapActive, setMapActive] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const parsed = parseFromURL(searchParams);
    const next = { ...defaultFilters, ...parsed };
    if (!Array.isArray(next.subway)) next.subway = [];
    setFilters(prev => (JSON.stringify(prev) !== JSON.stringify(next) ? next : prev));
    setSearchInput(next.search);
  }, [searchParams]);

  const { filters: catalogFilterOptions, loading: catalogFiltersLoading } = useCatalogFilters();
  const { filters: apartmentFilterOptions, loading: apartmentFiltersLoading } = useFilters();

  const filterOptions = useMemo(() => {
    if (!catalogFilterOptions && !apartmentFilterOptions) return null;
    return {
      districts: catalogFilterOptions?.districts ?? apartmentFilterOptions?.districts ?? [],
      builders: catalogFilterOptions?.builders ?? apartmentFilterOptions?.builders ?? [],
      subways: catalogFilterOptions?.subways ?? [],
      finishings: apartmentFilterOptions?.finishings ?? [],
      price: apartmentFilterOptions?.price ?? { min: 0, max: 0 },
      area: apartmentFilterOptions?.area ?? { min: 0, max: 0 },
      rooms: apartmentFilterOptions?.rooms ?? [],
      floor: apartmentFilterOptions?.floor ?? { min: 0, max: 0 },
      deadline: apartmentFilterOptions?.deadline ?? { min: null, max: null },
    };
  }, [catalogFilterOptions, apartmentFilterOptions]);
  const filtersLoading = catalogFiltersLoading || apartmentFiltersLoading;

  const apiFilters: ApartmentFilters = useMemo(() => ({
    search: filters.search || undefined,
    room: (filters.room ?? []).length ? filters.room : undefined,
    district: (filters.district ?? []).length ? filters.district : undefined,
    builder: (filters.builder ?? []).length ? filters.builder : undefined,
    subway: (filters.subway ?? []).length ? filters.subway : undefined,
    finishing: (filters.finishing ?? []).length ? filters.finishing : undefined,
    price_min: filters.price_min,
    price_max: filters.price_max,
    area_min: filters.area_min,
    area_max: filters.area_max,
    deadline_from: filters.deadline_from || undefined,
    deadline_to: filters.deadline_to || undefined,
    sort: filters.sort,
    order: filters.order,
  }), [filters]);

  const { items, meta, loading, error } = useApartments(apiFilters, filters.page, filters.per_page);
  const totalCount = meta?.total ?? 0;

  const blockApiParams: BlockListParams = useMemo(() => {
    const p: BlockListParams = {
      page: view === 'map' ? 1 : filters.page,
      per_page: view === 'map' ? 500 : filters.per_page,
      sort: 'price_from',
      order: 'asc',
    };
    if (filters.search) p.search = filters.search;
    if ((filters.district ?? []).length) p.district = filters.district ?? [];
    if ((filters.builder ?? []).length) p.builder = filters.builder ?? [];
    if ((filters.subway ?? []).length) p.subway = filters.subway ?? [];
    if ((filters.room ?? []).length) p.room = filters.room ?? [];
    if (filters.deadline_from) p.deadline_from = filters.deadline_from;
    if (filters.deadline_to) p.deadline_to = filters.deadline_to;
    if (filters.price_max != null && filters.price_max > 0) p.price_max = filters.price_max;
    return p;
  }, [filters, view]);

  const { blocks } = useCatalogBlocks(blockApiParams, blockApiParams.page ?? 1, blockApiParams.per_page ?? 20);
  const displayedBlocks = useMemo(() => (blocks ?? []).map(mapBlockToDisplay), [blocks]);

  const handleBoundsChange = useCallback((v: MapViewportBounds) => {
    setViewport(prev => {
      if (!prev) return v;
      const t = 0.02;
      if (Math.abs(v.lat_min - prev.lat_min) < t && Math.abs(v.lat_max - prev.lat_max) < t &&
          Math.abs(v.lng_min - prev.lng_min) < t && Math.abs(v.lng_max - prev.lng_max) < t) return prev;
      return v;
    });
  }, []);

  const mapParams: MapBlocksParams = useMemo(() => {
    const p: MapBlocksParams = {};
    const v = viewport ?? DEFAULT_VIEWPORT;
    p.lat_min = v.lat_min;
    p.lat_max = v.lat_max;
    p.lng_min = v.lng_min;
    p.lng_max = v.lng_max;
    if (filters.search) p.search = filters.search;
    if ((filters.district ?? []).length) p.district = filters.district ?? [];
    if ((filters.builder ?? []).length) p.builder = filters.builder ?? [];
    if ((filters.subway ?? []).length) p.subway = filters.subway ?? [];
    if ((filters.room ?? []).length) p.room = filters.room ?? [];
    if (filters.deadline_from) p.deadline_from = filters.deadline_from;
    if (filters.deadline_to) p.deadline_to = filters.deadline_to;
    if (filters.price_max != null && filters.price_max > 0) p.price_max = filters.price_max;
    return p;
  }, [viewport, filters.search, filters.district, filters.builder, filters.subway, filters.room, filters.deadline_from, filters.deadline_to, filters.price_max]);

  const { objects: mapBlocks } = useMapObjects(mapParams);
  const mapDisplayBlocks = useMemo(() => (mapBlocks ?? []).map(mapBlockItemToDisplay), [mapBlocks]);

  const updateURL = useCallback((f: ApartmentCatalogFilters) => {
    setSearchParams(buildURL(f), { replace: true });
  }, [setSearchParams]);

  const updateFilters = useCallback((upd: Partial<ApartmentCatalogFilters>) => {
    setFilters(prev => {
      const next = { ...prev, ...upd };
      if (upd.search !== undefined || upd.room !== undefined || upd.district !== undefined || upd.builder !== undefined || upd.subway !== undefined || upd.finishing !== undefined || upd.price_min !== undefined || upd.price_max !== undefined || upd.area_min !== undefined || upd.area_max !== undefined || upd.deadline_from !== undefined || upd.deadline_to !== undefined || upd.sort !== undefined || upd.order !== undefined) {
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

  const hasFilters = filters.search || (filters.room ?? []).length > 0 || (filters.district ?? []).length > 0 || (filters.builder ?? []).length > 0 || (filters.subway ?? []).length > 0 || (filters.finishing ?? []).length > 0 || filters.price_min != null || filters.price_max != null || filters.area_min != null || filters.area_max != null || filters.deadline_from || filters.deadline_to;

  const { results: searchResults, loading: searchLoading } = useSearch(searchInput);
  const showSuggestions = searchFocused && searchInput.trim().length >= 2;
  const suggestionApartments = (searchResults?.apartments ?? []).slice(0, 8);
  const suggestionComplexes = (searchResults?.residential_complexes ?? []).slice(0, 5);
  const hasSuggestions = suggestionApartments.length > 0 || suggestionComplexes.length > 0;

  const handleSearchSubmit = (value: string) => {
    setSearchInput(value);
    updateFilters({ search: value.trim() });
  };

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />

      <div className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Квартиры</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Найдено {loading ? '...' : totalCount.toLocaleString('ru-RU')} квартир</p>
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
          {view !== 'map' && (
            <aside className="hidden lg:block w-[280px] shrink-0">
            <div className="sticky top-20">
              <ApartmentFilterSidebar
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

          <div className="flex-1 min-w-0">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по ЖК, району, метро..."
                className="w-full pl-9 pr-4 h-10 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearchSubmit(searchInput); }}
              />
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Поиск...</div>
                  ) : hasSuggestions ? (
                    <div className="py-2 max-h-[320px] overflow-y-auto">
                      {suggestionApartments.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Квартиры</div>
                      )}
                      {suggestionApartments.map(a => (
                        <Link key={a.id} to={`/apartment/${a.id}`} className="block px-4 py-2.5 hover:bg-accent text-sm">
                          <div className="font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground">{a.price != null ? `${(a.price / 1e6).toFixed(2)} млн ₽` : ''}</div>
                        </Link>
                      ))}
                      {suggestionComplexes.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground mt-2">Жилые комплексы</div>
                      )}
                      {suggestionComplexes.map(c => (
                        <Link key={c.id} to={`/complex/${c.slug}`} className="block px-4 py-2.5 hover:bg-accent text-sm">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{[c.district, c.metro].filter(Boolean).join(' · ')}</div>
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
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">{error}</div>
            )}

            {view === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? Array.from({ length: Math.min(6, filters.per_page) }, (_, i) => <SkeletonCard key={i} />) : items.map(item => <PropertyCard key={item.slug ?? item.title} data={item} />)}
              </div>
            )}
            {view === 'list' && (
              <div className="space-y-4">
                {loading ? Array.from({ length: Math.min(5, filters.per_page) }, (_, i) => <SkeletonCardList key={i} />) : items.map(item => <PropertyCard key={item.slug ?? item.title} data={item} variant="list" />)}
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <LayoutGrid className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium mb-2">Квартиры не найдены</p>
                <p className="text-muted-foreground text-sm mb-4">Попробуйте изменить параметры поиска.</p>
                <Button variant="outline" onClick={handleClearFilters}>Сбросить фильтры</Button>
              </div>
            )}

            {view !== 'map' && !loading && (items ?? []).length > 0 && (meta?.last_page ?? 1) > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 mt-8">
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, meta!.last_page) }, (_, i) => {
                    const start = Math.max(1, Math.min(filters.page - 2, meta!.last_page - 4));
                    const p = start + i;
                    if (p > meta!.last_page) return null;
                    return (
                      <Button key={p} variant={filters.page === p ? 'default' : 'outline'} size="sm" onClick={() => updateFilters({ page: p })}>{p}</Button>
                    );
                  })}
                </div>
                <div className="text-sm text-muted-foreground">
                  Показать: <select value={filters.per_page} onChange={e => updateFilters({ per_page: Number(e.target.value), page: 1 })} className="bg-background border border-border rounded-lg px-2 py-1 text-sm">
                    {[20, 30, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-background z-10">
            <span className="font-semibold">Фильтры</span>
            <button onClick={() => setShowMobileFilters(false)} className="w-10 h-10 flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-4 pb-24">
            <ApartmentFilterSidebar filterOptions={filterOptions} filtersLoading={filtersLoading} filters={filters} onChange={upd => updateFilters(upd)} onClear={handleClearFilters} totalCount={totalCount} hasFilters={hasFilters} />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowMobileFilters(false)}>Показать {totalCount} квартир</Button>
          </div>
        </div>
      )}
      <FooterSection />
    </div>
  );
};

export default RedesignApartments;
