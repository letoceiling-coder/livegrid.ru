import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import FilterSidebar from '@/redesign/components/FilterSidebar';
import ZhkMap, { type MapViewportBounds } from '@/components/ZhkMap';
import { useMapObjects } from '@/hooks/useMapObjects';
import { useCatalogFilters } from '@/hooks/useCatalogFilters';
import { useSearch } from '@/hooks/useSearch';
import type { MapBlocksParams } from '@/api/mapApi';
import FooterSection from '@/components/FooterSection';
import type { CatalogBlockFilters } from '@/redesign/data/types';

const DEFAULT_VIEWPORT: MapViewportBounds = {
  lat_min: 55.5,
  lat_max: 56.0,
  lng_min: 37.3,
  lng_max: 37.9,
};

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
  return f;
}

function buildURL(f: CatalogBlockFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.search) p.set('q', f.search);
  if (f.district.length) p.set('district', f.district.join(','));
  if (f.builder.length) p.set('builder', f.builder.join(','));
  if (f.deadline_from) p.set('deadline_from', f.deadline_from);
  if (f.deadline_to) p.set('deadline_to', f.deadline_to);
  return p;
}

const RedesignMap = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initial = useMemo(() => {
    const parsed = parseFromURL(searchParams);
    return { ...defaultFilters, ...parsed };
  }, [searchParams]);

  const [filters, setFilters] = useState<CatalogBlockFilters>(initial);
  const [viewport, setViewport] = useState<MapViewportBounds | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [centerOnSlug, setCenterOnSlug] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleBoundsChange = useCallback((v: MapViewportBounds) => {
    setViewport(prev => {
      if (!prev) return v;
      const threshold = 0.02;
      if (Math.abs(v.lat_min - prev.lat_min) < threshold &&
          Math.abs(v.lat_max - prev.lat_max) < threshold &&
          Math.abs(v.lng_min - prev.lng_min) < threshold &&
          Math.abs(v.lng_max - prev.lng_max) < threshold) {
        return prev;
      }
      return v;
    });
  }, []);

  useEffect(() => {
    const parsed = parseFromURL(searchParams);
    const next = { ...defaultFilters, ...parsed };
    setFilters(prev => (JSON.stringify(prev) !== JSON.stringify(next) ? next : prev));
    setSearchInput(next.search);
  }, [searchParams]);

  const { filters: filterOptions, loading: filtersLoading } = useCatalogFilters();

  const mapParams: MapBlocksParams = useMemo(() => {
    const p: MapBlocksParams = {};
    // Apply viewport only after first actionend (map ready); initial load without viewport
    if (viewport) {
      p.lat_min = viewport.lat_min;
      p.lat_max = viewport.lat_max;
      p.lng_min = viewport.lng_min;
      p.lng_max = viewport.lng_max;
    }
    if (filters.search) p.search = filters.search;
    if (filters.district.length) p.district = filters.district;
    if (filters.builder.length) p.builder = filters.builder;
    if (filters.deadline_from) p.deadline_from = filters.deadline_from;
    if (filters.deadline_to) p.deadline_to = filters.deadline_to;
    return p;
  }, [viewport, filters.search, filters.district, filters.builder, filters.deadline_from, filters.deadline_to]);

  const { objects: blocks, loading, error } = useMapObjects(mapParams);

  const updateURL = useCallback((f: CatalogBlockFilters) => {
    setSearchParams(buildURL(f), { replace: true });
  }, [setSearchParams]);

  const updateFilters = useCallback((upd: Partial<CatalogBlockFilters>) => {
    setFilters(prev => {
      const next = { ...prev, ...upd };
      updateURL(next);
      return next;
    });
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setSearchInput('');
    updateURL(defaultFilters);
  }, [updateURL]);

  const hasFilters = Boolean(filters.search || filters.district.length || filters.builder.length || filters.deadline_from || filters.deadline_to);

  const { results: searchResults, loading: searchLoading } = useSearch(searchInput);
  const showSuggestions = searchFocused && searchInput.trim().length >= 2;
  const suggestionComplexes = (searchResults?.residential_complexes ?? []).slice(0, 5);
  const suggestionApartments = (searchResults?.apartments ?? []).slice(0, 5);
  const hasSuggestions = suggestionComplexes.length > 0 || suggestionApartments.length > 0;

  const handleSearchSubmit = (value: string) => {
    setSearchInput(value);
    updateFilters({ search: value.trim() });
  };

  const handleSelectComplexFromSearch = (slug: string) => {
    setSearchFocused(false);
    setCenterOnSlug(slug);
  };

  const handleBlockClick = useCallback((slug: string) => {
    window.location.href = `/complex/${slug}`;
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16 lg:pb-0">
      <RedesignHeader />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Filters sidebar */}
        <aside className="hidden lg:block w-[280px] border-r border-border p-4 overflow-y-auto shrink-0">
          <div className="sticky top-20">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по названию, району..."
                className="w-full pl-9 pr-4 h-10 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={e => e.key === 'Enter' && handleSearchSubmit(searchInput)}
              />
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Поиск...</div>
                  ) : hasSuggestions ? (
                    <div className="py-2 max-h-[280px] overflow-y-auto">
                      {suggestionComplexes.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Жилые комплексы</div>
                      )}
                      {suggestionComplexes.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectComplexFromSearch(c.slug)}
                          className="w-full text-left px-4 py-2.5 hover:bg-accent text-sm"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{[c.district, c.metro].filter(Boolean).join(' · ')}</div>
                        </button>
                      ))}
                      {suggestionApartments.length > 0 && (
                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground mt-2">Квартиры</div>
                      )}
                      {suggestionApartments.map(a => (
                        <Link
                          key={a.id}
                          to={`/apartment/${a.id}`}
                          className="block px-4 py-2.5 hover:bg-accent text-sm"
                          onClick={() => setSearchFocused(false)}
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
            <FilterSidebar
              filterOptions={filterOptions}
              filtersLoading={filtersLoading}
              filters={filters}
              onChange={updateFilters}
              onClear={handleClearFilters}
              totalCount={blocks.length}
              hasFilters={hasFilters}
            />
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 flex flex-col min-w-0 p-4">
          {/* Search (mobile) + toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
            <div className="lg:hidden relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по названию, району..."
                className="w-full pl-9 pr-4 h-10 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onKeyDown={e => e.key === 'Enter' && handleSearchSubmit(searchInput)}
              />
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                  {searchLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Поиск...</div>
                  ) : hasSuggestions ? (
                    <div className="py-2 max-h-[240px] overflow-y-auto">
                      {suggestionComplexes.map(c => (
                        <button key={c.id} type="button" onClick={() => handleSelectComplexFromSearch(c.slug)} className="w-full text-left px-4 py-2.5 hover:bg-accent text-sm">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">{[c.district, c.metro].filter(Boolean).join(' · ')}</div>
                        </button>
                      ))}
                      {suggestionApartments.map(a => (
                        <Link key={a.id} to={`/apartment/${a.id}`} className="block px-4 py-2.5 hover:bg-accent text-sm">
                          <div className="font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground">{a.price != null ? `${(a.price / 1_000_000).toFixed(2)} млн ₽` : ''}</div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">Ничего не найдено</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg font-bold">Карта объектов</h1>
              <Button variant="outline" size="sm" className="h-9 lg:hidden shrink-0" onClick={() => setShowFilters(true)}>
                <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Фильтры
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-destructive text-sm mb-3">{error}</p>
          )}

          <div className="rounded-2xl overflow-hidden border border-border flex-1 min-h-[400px]" style={{ minHeight: '500px' }}>
            {loading ? (
              <div className="w-full h-[500px] flex flex-col items-center justify-center bg-muted/30">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Загрузка объектов...</p>
              </div>
            ) : blocks.length === 0 ? (
              <div className="w-full h-[500px] flex flex-col items-center justify-center bg-muted/20">
                <p className="text-muted-foreground font-medium mb-2">По заданным параметрам объекты не найдены.</p>
                <p className="text-muted-foreground text-sm mb-4">Попробуйте изменить фильтры.</p>
                <Button variant="outline" onClick={handleClearFilters}>
                  Сбросить фильтры
                </Button>
              </div>
            ) : (
              <ZhkMap
                blocks={blocks}
                onBlockClick={slug => (window.location.href = `/complex/${slug}`)}
                centerOnSlug={centerOnSlug}
                onBoundsChange={handleBoundsChange}
              />
            )}
          </div>

          {!loading && blocks.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {blocks.length.toLocaleString('ru-RU')} объектов на карте
            </p>
          )}
        </div>
      </div>

      {/* Mobile filters */}
      {showFilters && (
        <div className="fixed inset-0 z-[60] bg-background overflow-y-auto animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between h-14 px-4 border-b border-border sticky top-0 bg-background z-10">
            <span className="font-semibold">Фильтры</span>
            <button onClick={() => setShowFilters(false)} className="w-10 h-10 flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 pb-24">
            <FilterSidebar
              filterOptions={filterOptions}
              filtersLoading={filtersLoading}
              filters={filters}
              onChange={updateFilters}
              onClear={handleClearFilters}
              totalCount={blocks.length}
              hasFilters={hasFilters}
            />
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full h-12" onClick={() => setShowFilters(false)}>
              Показать {blocks.length} объектов
            </Button>
          </div>
        </div>
      )}
      <FooterSection />
    </div>
  );
};

export default RedesignMap;
