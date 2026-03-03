import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, SlidersHorizontal, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useFilters } from '@/hooks/useFilters';
import { ApartmentFilters } from '@/hooks/useApartments';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import api from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (filters: ApartmentFilters, count: number) => void;
  resultCount?: number | null;
}

const ROOM_CHIPS = [
  { value: 0, label: 'Студия' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4+' },
];

function SearchableSelect({
  label,
  items,
  selectedIds,
  onToggle,
  placeholder = 'Выберите...',
}: {
  label: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const filtered = items.filter((i) =>
    (i.name ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const displayLabel =
    selectedIds.length > 0
      ? `${selectedIds.length} выбрано`
      : placeholder;

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm hover:bg-muted/50 transition-colors"
      >
        <span className="truncate text-left">{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:ring-1 ring-primary"
              />
            </div>
          </div>
          <div className="max-h-[250px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Ничего не найдено</div>
            ) : (
              filtered.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                    className="w-3.5 h-3.5 rounded border-border accent-primary"
                  />
                  <span className="truncate">{item.name ?? ''}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function filtersToParams(filters: ApartmentFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.room?.length) params.set('room', filters.room.join(','));
  if (filters.district?.length) params.set('district', filters.district.join(','));
  if (filters.builder?.length) params.set('builder', filters.builder.join(','));
  if (filters.finishing?.length) params.set('finishing', filters.finishing.join(','));
  if (filters.price_min != null) params.set('price_min', String(filters.price_min));
  if (filters.price_max != null) params.set('price_max', String(filters.price_max));
  if (filters.area_min != null) params.set('area_min', String(filters.area_min));
  if (filters.area_max != null) params.set('area_max', String(filters.area_max));
  if (filters.is_city !== undefined) params.set('is_city', filters.is_city ? '1' : '0');
  return params;
}

const FiltersOverlay = ({ open, onClose, onApply, resultCount = null }: Props) => {
  const { filters: availableFilters, loading } = useFilters();
  const navigate = useNavigate();

  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [selectedBuilders, setSelectedBuilders] = useState<string[]>([]);
  const [selectedFinishings, setSelectedFinishings] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [areaMin, setAreaMin] = useState<string>('');
  const [areaMax, setAreaMax] = useState<string>('');
  const [isCity, setIsCity] = useState<boolean | undefined>(undefined);
  const [moreOpen, setMoreOpen] = useState(false);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const countAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const buildCurrentFilters = useCallback((): ApartmentFilters => {
    const f: ApartmentFilters = {};
    if (selectedRooms.length > 0) f.room = selectedRooms;
    if (selectedDistricts.length > 0) f.district = selectedDistricts;
    if (selectedBuilders.length > 0) f.builder = selectedBuilders;
    if (selectedFinishings.length > 0) f.finishing = selectedFinishings;
    if (priceMin) f.price_min = parseFloat(priceMin);
    if (priceMax) f.price_max = parseFloat(priceMax);
    if (areaMin) f.area_min = parseFloat(areaMin);
    if (areaMax) f.area_max = parseFloat(areaMax);
    if (isCity !== undefined) f.is_city = isCity;
    return f;
  }, [selectedRooms, selectedDistricts, selectedBuilders, selectedFinishings, priceMin, priceMax, areaMin, areaMax, isCity]);

  useEffect(() => {
    if (!open) return;
    const filters = buildCurrentFilters();
    const timer = setTimeout(() => {
      countAbortRef.current?.abort();
      const controller = new AbortController();
      countAbortRef.current = controller;
      setCountLoading(true);
      api
        .get('/apartments', { params: { ...filters, per_page: 1 }, signal: controller.signal })
        .then((res) => {
          const total = (res.data as { meta?: { total?: number } })?.meta?.total ?? 0;
          setLiveCount(total);
        })
        .catch((err) => {
          if (err?.code !== 'ERR_CANCELED' && err?.name !== 'AbortError') setLiveCount(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setCountLoading(false);
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      countAbortRef.current?.abort();
    };
  }, [open, buildCurrentFilters]);

  if (!open) return null;

  const toggleRoom = (room: number) => {
    setSelectedRooms((prev) =>
      prev.includes(room) ? prev.filter((r) => r !== room) : [...prev, room]
    );
  };

  const toggleDistrict = (id: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleBuilder = (id: string) => {
    setSelectedBuilders((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const toggleFinishing = (id: string) => {
    setSelectedFinishings((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    const filters = buildCurrentFilters();
    const count = liveCount ?? resultCount ?? 0;
    onApply(filters, count);
    const queryParams = filtersToParams(filters);
    navigate(`/catalog?${queryParams.toString()}`);
    onClose();
  };

  const handleReset = () => {
    setSelectedRooms([]);
    setSelectedDistricts([]);
    setSelectedBuilders([]);
    setSelectedFinishings([]);
    setPriceMin('');
    setPriceMax('');
    setAreaMin('');
    setAreaMax('');
    setIsCity(undefined);
  };

  const districts = availableFilters?.districts ?? [];
  const builders = availableFilters?.builders ?? [];

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[420px] h-full bg-background shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <span className="font-bold">Фильтры</span>
          </div>
          <button
            className="flex items-center gap-1 text-sm font-medium hover:bg-muted rounded-lg p-2 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-primary" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Загрузка фильтров...
          </div>
        ) : (
          <div className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
            {/* Комнатность — чипы */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Комнатность</label>
              <div className="flex flex-wrap gap-2">
                {ROOM_CHIPS.map((chip) => {
                  const active = selectedRooms.includes(chip.value);
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => toggleRoom(chip.value)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Цена, Площадь */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Цена, ₽</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="от"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <input
                    type="number"
                    placeholder="до"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Площадь, м²</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="от"
                    value={areaMin}
                    onChange={(e) => setAreaMin(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                  <input
                    type="number"
                    placeholder="до"
                    value={areaMax}
                    onChange={(e) => setAreaMax(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Район, Застройщик */}
            <div className="grid grid-cols-1 gap-4">
              <SearchableSelect
                label="Район"
                items={districts}
                selectedIds={selectedDistricts}
                onToggle={toggleDistrict}
              />
              <SearchableSelect
                label="Застройщик"
                items={builders}
                selectedIds={selectedBuilders}
                onToggle={toggleBuilder}
              />
            </div>

            {/* Ещё фильтры — collapsible */}
            <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full py-2 text-sm font-medium hover:bg-muted rounded-lg px-2 transition-colors"
                >
                  Ещё фильтры
                  {moreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 pt-2 transition-all duration-300 overflow-hidden">
                  {/* Отделка */}
                  {availableFilters?.finishings && availableFilters.finishings.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-2">Отделка</label>
                      <div className="space-y-2">
                        {availableFilters.finishings.map((f) => (
                          <label
                            key={f.id}
                            className="flex items-center gap-2 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFinishings.includes(f.id)}
                              onChange={() => toggleFinishing(f.id)}
                              className="w-3.5 h-3.5 rounded border-border accent-primary"
                            />
                            {f.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Локация */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Локация</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { val: undefined as boolean | undefined, label: 'Все' },
                        { val: true, label: 'В городе' },
                        { val: false, label: 'За городом' },
                      ].map(({ val, label }) => (
                        <label key={label} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            name="location"
                            checked={isCity === val}
                            onChange={() => setIsCity(val)}
                            className="w-3.5 h-3.5 accent-primary"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Sticky bottom bar */}
        <div className="mt-auto px-4 py-4 border-t border-border bg-background shrink-0">
          <div className="flex gap-3">
            <button
              onClick={handleApply}
              className="flex-1 bg-primary text-primary-foreground px-4 py-3 rounded-xl text-sm font-medium hover:bg-primary/90 transition-opacity"
            >
              {countLoading
                ? 'Загрузка...'
                : (liveCount ?? resultCount) != null
                  ? `Показать ${(liveCount ?? resultCount ?? 0).toLocaleString('ru-RU')} объектов`
                  : 'Применить фильтры'}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiltersOverlay;
