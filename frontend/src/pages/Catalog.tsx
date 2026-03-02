import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Grid3X3, List, ChevronDown, Map } from 'lucide-react';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import PropertyCard from '@/components/PropertyCard';
import PropertyGridSection from '@/components/PropertyGridSection';
import QuizSection from '@/components/QuizSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import YandexMapView from '@/components/YandexMapView';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { useApartments, type ApartmentFilters } from '@/hooks/useApartments';
import { useFilters } from '@/hooks/useFilters';
import { Skeleton } from '@/components/ui/skeleton';
import { type ApartmentListItem } from '@/types/apartment';

// ── Helper: Parse URL search params to filters ─────────────────────────────────

function parseFiltersFromURL(searchParams: URLSearchParams): ApartmentFilters {
  const filters: ApartmentFilters = {};

  // room[] — comma-separated or multiple params
  const roomParam = searchParams.get('room');
  if (roomParam) {
    filters.room = roomParam.split(',').map(Number).filter(n => !isNaN(n));
  }

  // district[] — comma-separated or multiple params
  const districtParam = searchParams.get('district');
  if (districtParam) {
    filters.district = districtParam.split(',').filter(Boolean);
  }

  // builder[] — comma-separated or multiple params
  const builderParam = searchParams.get('builder');
  if (builderParam) {
    filters.builder = builderParam.split(',').filter(Boolean);
  }

  // finishing[] — comma-separated or multiple params
  const finishingParam = searchParams.get('finishing');
  if (finishingParam) {
    filters.finishing = finishingParam.split(',').filter(Boolean);
  }

  // price_min / price_max
  const priceMin = searchParams.get('price_min');
  if (priceMin) {
    const num = Number(priceMin);
    if (!isNaN(num)) filters.price_min = num;
  }
  const priceMax = searchParams.get('price_max');
  if (priceMax) {
    const num = Number(priceMax);
    if (!isNaN(num)) filters.price_max = num;
  }

  // area_min / area_max
  const areaMin = searchParams.get('area_min');
  if (areaMin) {
    const num = Number(areaMin);
    if (!isNaN(num)) filters.area_min = num;
  }
  const areaMax = searchParams.get('area_max');
  if (areaMax) {
    const num = Number(areaMax);
    if (!isNaN(num)) filters.area_max = num;
  }

  // floor_min / floor_max
  const floorMin = searchParams.get('floor_min');
  if (floorMin) {
    const num = Number(floorMin);
    if (!isNaN(num)) filters.floor_min = num;
  }
  const floorMax = searchParams.get('floor_max');
  if (floorMax) {
    const num = Number(floorMax);
    if (!isNaN(num)) filters.floor_max = num;
  }

  // deadline_from / deadline_to
  const deadlineFrom = searchParams.get('deadline_from');
  if (deadlineFrom) filters.deadline_from = deadlineFrom;
  const deadlineTo = searchParams.get('deadline_to');
  if (deadlineTo) filters.deadline_to = deadlineTo;

  // search
  const search = searchParams.get('search');
  if (search) filters.search = search;

  // is_city
  const isCity = searchParams.get('is_city');
  if (isCity === '1' || isCity === 'true') {
    (filters as ApartmentFilters).is_city = true;
  } else if (isCity === '0' || isCity === 'false') {
    (filters as ApartmentFilters).is_city = false;
  }

  // sort / order
  const sort = searchParams.get('sort');
  if (sort && ['price', 'area_total', 'building_deadline_at', 'floor'].includes(sort)) {
    filters.sort = sort as ApartmentFilters['sort'];
  }
  const order = searchParams.get('order');
  if (order && ['asc', 'desc'].includes(order)) {
    filters.order = order as 'asc' | 'desc';
  }

  // lat / lng / radius
  const lat = searchParams.get('lat');
  if (lat) {
    const num = Number(lat);
    if (!isNaN(num)) filters.lat = num;
  }
  const lng = searchParams.get('lng');
  if (lng) {
    const num = Number(lng);
    if (!isNaN(num)) filters.lng = num;
  }
  const radius = searchParams.get('radius');
  if (radius) {
    const num = Number(radius);
    if (!isNaN(num)) filters.radius = num;
  }

  return filters;
}

// ── Helper: Build URL search params from filters ───────────────────────────────

function buildURLFromFilters(filters: ApartmentFilters, page: number, perPage: number): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.room && filters.room.length > 0) {
    params.set('room', filters.room.join(','));
  }
  if (filters.district && filters.district.length > 0) {
    params.set('district', filters.district.join(','));
  }
  if (filters.builder && filters.builder.length > 0) {
    params.set('builder', filters.builder.join(','));
  }
  if (filters.finishing && filters.finishing.length > 0) {
    params.set('finishing', filters.finishing.join(','));
  }
  if (filters.price_min != null) {
    params.set('price_min', String(filters.price_min));
  }
  if (filters.price_max != null) {
    params.set('price_max', String(filters.price_max));
  }
  if (filters.area_min != null) {
    params.set('area_min', String(filters.area_min));
  }
  if (filters.area_max != null) {
    params.set('area_max', String(filters.area_max));
  }
  if (filters.floor_min != null) {
    params.set('floor_min', String(filters.floor_min));
  }
  if (filters.floor_max != null) {
    params.set('floor_max', String(filters.floor_max));
  }
  if (filters.deadline_from) {
    params.set('deadline_from', filters.deadline_from);
  }
  if (filters.deadline_to) {
    params.set('deadline_to', filters.deadline_to);
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  if (filters.is_city !== undefined) {
    params.set('is_city', filters.is_city ? '1' : '0');
  }
  if (filters.sort) {
    params.set('sort', filters.sort);
  }
  if (filters.order) {
    params.set('order', filters.order);
  }
  if (filters.lat != null) {
    params.set('lat', String(filters.lat));
  }
  if (filters.lng != null) {
    params.set('lng', String(filters.lng));
  }
  if (filters.radius != null) {
    params.set('radius', String(filters.radius));
  }

  if (page > 1) {
    params.set('page', String(page));
  }
  if (perPage !== 15) {
    params.set('per_page', String(perPage));
  }

  return params;
}

const perPageOptions = [15, 30, 50, 100];
const tabs = ['Объекты', 'Избранное'];
const viewTabs = ['Квартиры', 'Паркинги', 'Участки', 'Дома', 'Коммерческая'];

// ── Skeleton card — matches PropertyCard dimensions ──────────────────────────

const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-card border border-border animate-pulse">
    <div className="bg-muted" style={{ height: '280px' }} />
    <div className="p-4 space-y-2">
      <div className="flex justify-between">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-1/4" />
      </div>
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-1/3" />
    </div>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Parse URL params ─────────────────────────────────────────────────────────
  const urlPage = Number(searchParams.get('page')) || 1;
  const urlPerPage = Number(searchParams.get('per_page')) || 15;
  const urlFilters = useMemo(() => parseFiltersFromURL(searchParams), [searchParams]);

  const [currentPage, setCurrentPage] = useState(urlPage);
  const [perPage, setPerPage] = useState(urlPerPage);
  const [activeTab, setActiveTab] = useState(0);
  const [activeViewTab, setActiveViewTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(urlFilters.search || '');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // 'list' or 'map'

  // ── Load filters from API ────────────────────────────────────────────────────
  const { filters: filterOptions, loading: filtersLoading } = useFilters();

  // ── Local filter state (UI checkboxes) ───────────────────────────────────────
  const [selectedRooms, setSelectedRooms] = useState<number[]>(urlFilters.room || []);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(urlFilters.district || []);
  const [selectedBuilders, setSelectedBuilders] = useState<string[]>(urlFilters.builder || []);
  const [selectedFinishings, setSelectedFinishings] = useState<string[]>(urlFilters.finishing || []);
  const [sort, setSort] = useState<{ field: 'price' | 'area_total' | 'building_deadline_at' | 'floor' | null; order: 'asc' | 'desc' }>({
    field: urlFilters.sort || null,
    order: urlFilters.order || 'asc',
  });

  // ── Build API filters from UI state ──────────────────────────────────────────
  const apiFilters: ApartmentFilters = useMemo(() => {
    const f: ApartmentFilters = {};
    if (selectedRooms.length > 0) f.room = selectedRooms;
    if (selectedDistricts.length > 0) f.district = selectedDistricts;
    if (selectedBuilders.length > 0) f.builder = selectedBuilders;
    if (selectedFinishings.length > 0) f.finishing = selectedFinishings;
    if (searchValue) f.search = searchValue;
    if (sort.field) {
      f.sort = sort.field;
      f.order = sort.order;
    }
    // Include lat/lng/radius from URL params
    if (urlFilters.lat != null) f.lat = urlFilters.lat;
    if (urlFilters.lng != null) f.lng = urlFilters.lng;
    if (urlFilters.radius != null) f.radius = urlFilters.radius;
    // price_min/max, area_min/max, floor_min/max, deadline_from/to, is_city
    // would be added from range inputs (not implemented in current UI)
    return f;
  }, [selectedRooms, selectedDistricts, selectedBuilders, selectedFinishings, searchValue, sort, urlFilters.lat, urlFilters.lng, urlFilters.radius]);

  // ── Sync URL when filters/page change ────────────────────────────────────────
  useEffect(() => {
    const params = buildURLFromFilters(apiFilters, currentPage, perPage);
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [apiFilters, currentPage, perPage, searchParams, setSearchParams]);

  // ── Real API data ───────────────────────────────────────────────────────────
  // For map mode: use per_page=100, page=1 (no pagination in map view)
  const mapPerPage = 100;
  const mapPage = 1;
  const effectivePerPage = viewMode === 'map' ? mapPerPage : perPage;
  const effectivePage = viewMode === 'map' ? mapPage : currentPage;

  const { items, meta, loading, error } = useApartments(apiFilters, effectivePage, effectivePerPage);

  // For map: get raw apartment data (not transformed to PropertyData)
  // We need to fetch raw data separately for map markers
  const [mapApartments, setMapApartments] = useState<ApartmentListItem[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  // Fetch raw apartment data for map when in map mode
  useEffect(() => {
    if (viewMode !== 'map') {
      setMapApartments([]);
      return;
    }

    const controller = new AbortController();
    setMapLoading(true);

    import('@/lib/api').then(({ default: api }) => {
      const filtersKey = JSON.stringify(apiFilters);
      api
        .get('/apartments', {
          params: {
            ...apiFilters,
            page: 1,
            per_page: 100,
          },
          signal: controller.signal,
        })
        .then((res) => {
          const paginator = res.data as unknown as { data: ApartmentListItem[] };
          setMapApartments(paginator?.data ?? []);
        })
        .catch((err) => {
          if (err?.code !== 'ERR_CANCELED' && err?.name !== 'AbortError') {
            console.error('Failed to load map apartments:', err);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setMapLoading(false);
        });
    });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, JSON.stringify(apiFilters)]);

  const totalPages = meta?.last_page ?? 1;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRoomToggle = (roomValue: number) => {
    setSelectedRooms(prev => {
      const newRooms = prev.includes(roomValue)
        ? prev.filter(r => r !== roomValue)
        : [...prev, roomValue];
      setCurrentPage(1); // Reset to page 1 when filter changes
      return newRooms;
    });
  };

  const handleDistrictToggle = (districtId: string) => {
    setSelectedDistricts(prev => {
      const newDistricts = prev.includes(districtId)
        ? prev.filter(d => d !== districtId)
        : [...prev, districtId];
      setCurrentPage(1);
      return newDistricts;
    });
  };

  const handleBuilderToggle = (builderId: string) => {
    setSelectedBuilders(prev => {
      const newBuilders = prev.includes(builderId)
        ? prev.filter(b => b !== builderId)
        : [...prev, builderId];
      setCurrentPage(1);
      return newBuilders;
    });
  };

  const handleFinishingToggle = (finishingId: string) => {
    setSelectedFinishings(prev => {
      const newFinishings = prev.includes(finishingId)
        ? prev.filter(f => f !== finishingId)
        : [...prev, finishingId];
      setCurrentPage(1);
      return newFinishings;
    });
  };

  const handleSortChange = (field: 'price' | 'area_total' | 'building_deadline_at' | 'floor', order: 'asc' | 'desc') => {
    setSort({ field, order });
    setSortOpen(false);
    // Keep current page when sorting
  };

  const handleSearchSubmit = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedRooms([]);
    setSelectedDistricts([]);
    setSelectedBuilders([]);
    setSelectedFinishings([]);
    setSearchValue('');
    setSort({ field: null, order: 'asc' });
    setCurrentPage(1);
    // Clear radius filter
    const newParams = new URLSearchParams();
    setSearchParams(newParams, { replace: true });
  };

  // ── Map handlers ────────────────────────────────────────────────────────────
  const handleMapClick = (lat: number, lng: number) => {
    // Add radius filter (2000m default)
    const newFilters = { ...apiFilters, lat, lng, radius: 2000 };
    const params = buildURLFromFilters(newFilters, 1, effectivePerPage);
    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  };

  const handlePerPageChange = (n: number) => {
    setPerPage(n);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* BLOCK 1 — Top bar */}
      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-4">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "text-lg font-bold pb-1 border-b-2 transition-colors",
                i === activeTab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >{t}</button>
          ))}
        </div>

        {/* Search + filter + sort + view */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex items-center bg-background rounded-full px-4 py-2.5 border border-border">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Поиск по сайту"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearchSubmit(searchValue);
                }
              }}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
          <button
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0 lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors"
            >
              Сортировка <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute top-full mt-1 right-0 bg-card border border-border rounded-xl shadow-lg z-30 py-1 min-w-[180px]">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                  onClick={() => handleSortChange('price', 'asc')}
                >
                  По цене ↑
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                  onClick={() => handleSortChange('price', 'desc')}
                >
                  По цене ↓
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                  onClick={() => handleSortChange('area_total', 'desc')}
                >
                  По площади
                </button>
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                  onClick={() => handleSortChange('building_deadline_at', 'asc')}
                >
                  По дате
                </button>
              </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1 border border-border rounded-full p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                viewMode === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                viewMode === 'map' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              )}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          {viewTabs.map((vt, i) => (
            <button
              key={i}
              onClick={() => setActiveViewTab(i)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                i === activeViewTab ? "bg-primary text-primary-foreground" : "bg-background border border-border hover:bg-secondary"
              )}
            >{vt}</button>
          ))}
        </div>
      </div>

      {/* BLOCK 2 & 3 — Sidebar + Grid */}
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        <div className="flex gap-6">
          {/* Left sidebar filters — desktop */}
          <aside className={cn("w-[240px] shrink-0 space-y-6 hidden lg:block")}>
            {filtersLoading ? (
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-5 w-24 mb-3" />
                    <div className="space-y-2.5">
                      {[1, 2, 3].map((j) => (
                        <Skeleton key={j} className="h-5 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filterOptions ? (
              <>
                {/* Rooms */}
                {filterOptions.rooms.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm mb-3">Комнаты</h3>
                <div className="space-y-2.5">
                      {filterOptions.rooms.map((room) => (
                        <label key={room.value} className="flex items-center gap-2.5 cursor-pointer text-sm">
                          <Checkbox
                            checked={selectedRooms.includes(Number(room.value))}
                            onCheckedChange={() => handleRoomToggle(Number(room.value))}
                          />
                          {room.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Districts */}
                {filterOptions.districts.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm mb-3">Район</h3>
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                      {filterOptions.districts.map((district) => (
                        <label key={district.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                          <Checkbox
                            checked={selectedDistricts.includes(district.id)}
                            onCheckedChange={() => handleDistrictToggle(district.id)}
                          />
                          {district.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Builders */}
                {filterOptions.builders.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm mb-3">Застройщик</h3>
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                      {filterOptions.builders.map((builder) => (
                        <label key={builder.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                        <Checkbox
                            checked={selectedBuilders.includes(builder.id)}
                            onCheckedChange={() => handleBuilderToggle(builder.id)}
                        />
                          {builder.name}
                      </label>
                      ))}
                </div>
              </div>
                )}

                {/* Finishings */}
                {filterOptions.finishings.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm mb-3">Отделка</h3>
                    <div className="space-y-2.5">
                      {filterOptions.finishings.map((finishing) => (
                        <label key={finishing.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                          <Checkbox
                            checked={selectedFinishings.includes(finishing.id)}
                            onCheckedChange={() => handleFinishingToggle(finishing.id)}
                          />
                          {finishing.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear filters button */}
                {(selectedRooms.length > 0 || selectedDistricts.length > 0 || selectedBuilders.length > 0 || selectedFinishings.length > 0 || searchValue) && (
                  <button
                    onClick={handleClearFilters}
                    className="w-full px-4 py-2 rounded-xl border border-border text-sm hover:bg-secondary transition-colors"
                  >
                    Сбросить фильтры
                  </button>
                )}
              </>
            ) : null}
          </aside>

          {/* Mobile filter offcanvas */}
          {showFilters && (
            <div className="fixed inset-0 z-[90] bg-background overflow-y-auto lg:hidden">
              <div className="px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-bold">Фильтры</span>
                  <button className="text-sm font-medium text-primary" onClick={() => setShowFilters(false)}>Закрыть ✕</button>
                </div>
                {filtersLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i}>
                        <Skeleton className="h-5 w-24 mb-3" />
                    <div className="space-y-2.5">
                          {[1, 2, 3].map((j) => (
                            <Skeleton key={j} className="h-5 w-full" />
                          ))}
                        </div>
                    </div>
                    ))}
                  </div>
                ) : filterOptions ? (
                  <>
                    {/* Rooms */}
                    {filterOptions.rooms.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-sm mb-3">Комнаты</h3>
                        <div className="space-y-2.5">
                          {filterOptions.rooms.map((room) => (
                            <label key={room.value} className="flex items-center gap-2.5 cursor-pointer text-sm">
                              <Checkbox
                                checked={selectedRooms.includes(Number(room.value))}
                                onCheckedChange={() => handleRoomToggle(Number(room.value))}
                              />
                              {room.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Districts */}
                    {filterOptions.districts.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-sm mb-3">Район</h3>
                        <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                          {filterOptions.districts.map((district) => (
                            <label key={district.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                              <Checkbox
                                checked={selectedDistricts.includes(district.id)}
                                onCheckedChange={() => handleDistrictToggle(district.id)}
                              />
                              {district.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Builders */}
                    {filterOptions.builders.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-sm mb-3">Застройщик</h3>
                        <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                          {filterOptions.builders.map((builder) => (
                            <label key={builder.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                              <Checkbox
                                checked={selectedBuilders.includes(builder.id)}
                                onCheckedChange={() => handleBuilderToggle(builder.id)}
                              />
                              {builder.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Finishings */}
                    {filterOptions.finishings.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-bold text-sm mb-3">Отделка</h3>
                        <div className="space-y-2.5">
                          {filterOptions.finishings.map((finishing) => (
                            <label key={finishing.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                              <Checkbox
                                checked={selectedFinishings.includes(finishing.id)}
                                onCheckedChange={() => handleFinishingToggle(finishing.id)}
                              />
                              {finishing.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clear filters */}
                    {(selectedRooms.length > 0 || selectedDistricts.length > 0 || selectedBuilders.length > 0 || selectedFinishings.length > 0 || searchValue) && (
                      <button
                        onClick={handleClearFilters}
                        className="w-full px-4 py-2 rounded-xl border border-border text-sm hover:bg-secondary transition-colors mb-4"
                      >
                        Сбросить фильтры
                      </button>
                    )}
                  </>
                ) : null}
                <button className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm" onClick={() => setShowFilters(false)}>
                  Применить
                </button>
              </div>
            </div>
          )}

          {/* Property grid or Map */}
          <div className="flex-1 min-w-0">
            {/* Total count */}
            {meta && !loading && !mapLoading && (
              <p className="text-sm text-muted-foreground mb-4">
                Найдено{' '}
                <span className="font-semibold text-foreground">{meta.total.toLocaleString('ru-RU')}</span>{' '}
                квартир
                {viewMode === 'map' && mapApartments.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}(на карте: {mapApartments.length})
                  </span>
                )}
              </p>
            )}

            {/* Error state */}
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            {/* View mode: List or Map */}
            {viewMode === 'list' ? (
              /* Grid: skeleton while loading, cards when ready */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading
                  ? Array.from({ length: effectivePerPage }, (_, i) => <SkeletonCard key={i} />)
                  : items.map((p) => <PropertyCard key={p.slug} data={p} />)
                }
            </div>
            ) : (
              /* Map view */
              <YandexMapView
                apartments={mapApartments}
                loading={mapLoading || loading}
                onMapClick={handleMapClick}
                className="mb-4"
              />
            )}

            {/* BLOCK 4 — Pagination (only in list mode) */}
            {viewMode === 'list' && !loading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
              <Pagination>
                <PaginationContent>
                    {/* Show up to 5 page links around the current page */}
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                      const pageNum = startPage + i;
                      if (pageNum > totalPages) return null;
                      return (
                        <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                            isActive={currentPage === pageNum}
                            onClick={(e) => { e.preventDefault(); setCurrentPage(pageNum); }}
                      >
                            {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                      );
                    })}
                    {totalPages > 5 && (
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                    />
                  </PaginationItem>
                    )}
                </PaginationContent>
              </Pagination>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Показывать:</span>
                <div className="relative">
                  <select
                    value={perPage}
                      onChange={(e) => handlePerPageChange(Number(e.target.value))}
                    className="appearance-none bg-background border border-border rounded-lg px-3 py-1.5 pr-8 text-sm cursor-pointer"
                  >
                    {perPageOptions.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* BLOCK 5 — Hot deals */}
      <PropertyGridSection title="Горячие предложения" type="hot" />

      {/* BLOCK 6 — Quiz */}
      <QuizSection />

      {/* BLOCK 7 — About platform */}
      <AboutPlatform />

      {/* BLOCK 8 — Additional features */}
      <AdditionalFeatures />

      {/* BLOCK 9 — Latest news */}
      <LatestNews />

      {/* BLOCK 10 — Contacts */}
      <ContactsSection />

      <FooterSection />
    </div>
  );
};

export default Catalog;
