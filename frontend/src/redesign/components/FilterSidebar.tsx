import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogFilters } from '@/redesign/data/types';
import { districts, subways, builders, deadlines } from '@/redesign/data/mock-data';

interface Props {
  filters: CatalogFilters;
  onChange: (f: CatalogFilters) => void;
  totalCount: number;
  className?: string;
}

const roomOptions = [0, 1, 2, 3, 4];
const roomLabels: Record<number, string> = { 0: 'Ст', 1: '1', 2: '2', 3: '3', 4: '4+' };
const finishingOptions = ['без отделки', 'черновая', 'чистовая', 'под ключ'];
const statusOptions = [
  { value: 'building', label: 'Строится' },
  { value: 'completed', label: 'Сдан' },
  { value: 'planned', label: 'Планируется' },
];

const FilterSection = ({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-3">
      <button className="flex items-center justify-between w-full py-2.5 group" onClick={() => setOpen(!open)}>
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pt-1 space-y-2 animate-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );
};

const FilterSidebar = ({ filters, onChange, totalCount, className }: Props) => {
  const update = useCallback(<K extends keyof CatalogFilters>(key: K, val: CatalogFilters[K]) => {
    onChange({ ...filters, [key]: val });
  }, [filters, onChange]);

  const toggleArray = useCallback((key: 'rooms' | 'district' | 'subway' | 'builder' | 'finishing' | 'deadline' | 'status', val: string | number) => {
    const arr = filters[key] as (string | number)[];
    const next = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
    onChange({ ...filters, [key]: next });
  }, [filters, onChange]);

  const hasFilters = useMemo(() => {
    return filters.rooms.length > 0 || filters.district.length > 0 || filters.subway.length > 0 ||
      filters.builder.length > 0 || filters.finishing.length > 0 || filters.deadline.length > 0 ||
      filters.status.length > 0 || filters.search !== '' ||
      filters.priceMin !== undefined || filters.priceMax !== undefined ||
      filters.areaMin !== undefined || filters.areaMax !== undefined;
  }, [filters]);

  // Active filter tags
  const activeTags = useMemo(() => {
    const tags: { label: string; clear: () => void }[] = [];
    filters.rooms.forEach(r => tags.push({ label: roomLabels[r] || `${r}к`, clear: () => toggleArray('rooms', r) }));
    filters.district.forEach(d => tags.push({ label: d, clear: () => toggleArray('district', d) }));
    filters.subway.forEach(s => tags.push({ label: `м. ${s}`, clear: () => toggleArray('subway', s) }));
    filters.builder.forEach(b => tags.push({ label: b, clear: () => toggleArray('builder', b) }));
    filters.status.forEach(s => {
      const opt = statusOptions.find(o => o.value === s);
      tags.push({ label: opt?.label || s, clear: () => toggleArray('status', s) });
    });
    return tags;
  }, [filters, toggleArray]);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию, району..."
          className="pl-9 h-10 text-sm"
          value={filters.search}
          onChange={e => update('search', e.target.value)}
        />
      </div>

      {/* Active tags */}
      {activeTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-3 border-b border-border">
          {activeTags.map((tag, i) => (
            <button
              key={i}
              onClick={tag.clear}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              {tag.label}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Rooms */}
      <FilterSection title="Комнатность">
        <div className="flex gap-1">
          {roomOptions.map(r => (
            <button
              key={r}
              onClick={() => toggleArray('rooms', r)}
              className={cn(
                'h-9 flex-1 rounded-lg text-sm font-medium border transition-colors',
                filters.rooms.includes(r)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-foreground hover:border-primary/50'
              )}
            >
              {roomLabels[r]}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price */}
      <FilterSection title="Цена, ₽">
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="от 3 000 000"
            className="h-9 text-sm"
            value={filters.priceMin ?? ''}
            onChange={e => update('priceMin', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            type="number"
            placeholder="до 60 000 000"
            className="h-9 text-sm"
            value={filters.priceMax ?? ''}
            onChange={e => update('priceMax', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </FilterSection>

      {/* Area */}
      <FilterSection title="Площадь, м²">
        <div className="flex gap-2">
          <Input type="number" placeholder="от" className="h-9 text-sm" value={filters.areaMin ?? ''} onChange={e => update('areaMin', e.target.value ? Number(e.target.value) : undefined)} />
          <Input type="number" placeholder="до" className="h-9 text-sm" value={filters.areaMax ?? ''} onChange={e => update('areaMax', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
      </FilterSection>

      {/* District */}
      <FilterSection title="Район" defaultOpen={false}>
        <div className="space-y-2 max-h-44 overflow-y-auto">
          {districts.map(d => (
            <label key={d} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground transition-colors">
              <Checkbox checked={filters.district.includes(d)} onCheckedChange={() => toggleArray('district', d)} />
              {d}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Subway */}
      <FilterSection title="Метро" defaultOpen={false}>
        <div className="space-y-2 max-h-44 overflow-y-auto">
          {subways.map(s => (
            <label key={s} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground transition-colors">
              <Checkbox checked={filters.subway.includes(s)} onCheckedChange={() => toggleArray('subway', s)} />
              {s}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Builder */}
      <FilterSection title="Застройщик" defaultOpen={false}>
        <div className="space-y-2 max-h-44 overflow-y-auto">
          {builders.map(b => (
            <label key={b} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground transition-colors">
              <Checkbox checked={filters.builder.includes(b)} onCheckedChange={() => toggleArray('builder', b)} />
              {b}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Finishing */}
      <FilterSection title="Отделка" defaultOpen={false}>
        <div className="space-y-2">
          {finishingOptions.map(f => (
            <label key={f} className="flex items-center gap-2.5 cursor-pointer text-sm capitalize hover:text-foreground transition-colors">
              <Checkbox checked={filters.finishing.includes(f)} onCheckedChange={() => toggleArray('finishing', f)} />
              {f}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Deadline */}
      <FilterSection title="Срок сдачи" defaultOpen={false}>
        <div className="space-y-2">
          {deadlines.map(d => (
            <label key={d} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground transition-colors">
              <Checkbox checked={filters.deadline.includes(d)} onCheckedChange={() => toggleArray('deadline', d)} />
              {d}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Status */}
      <FilterSection title="Статус" defaultOpen={false}>
        <div className="space-y-2">
          {statusOptions.map(s => (
            <label key={s.value} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground transition-colors">
              <Checkbox checked={filters.status.includes(s.value)} onCheckedChange={() => toggleArray('status', s.value)} />
              {s.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Floor */}
      <FilterSection title="Этаж" defaultOpen={false}>
        <div className="flex gap-2">
          <Input type="number" placeholder="от" className="h-9 text-sm" value={filters.floorMin ?? ''} onChange={e => update('floorMin', e.target.value ? Number(e.target.value) : undefined)} />
          <Input type="number" placeholder="до" className="h-9 text-sm" value={filters.floorMax ?? ''} onChange={e => update('floorMax', e.target.value ? Number(e.target.value) : undefined)} />
        </div>
      </FilterSection>

      {/* Actions */}
      <div className="pt-3 space-y-2">
        <Button className="w-full h-11 text-sm font-medium">
          Показать {totalCount} объектов
        </Button>
        {hasFilters && (
          <Button variant="ghost" className="w-full h-9 text-sm text-muted-foreground" onClick={() => onChange({ rooms: [], district: [], subway: [], builder: [], finishing: [], deadline: [], status: [], search: '' })}>
            <X className="w-3.5 h-3.5 mr-1.5" /> Сбросить фильтры
          </Button>
        )}
      </div>
    </div>
  );
};

export default FilterSidebar;
