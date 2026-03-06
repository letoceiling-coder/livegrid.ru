import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FiltersData } from '@/hooks/useFilters';
import type { ApartmentCatalogFilters } from '@/redesign/data/types';

export type ApartmentFilterOptions = FiltersData & { subways?: Array<{ id: string; name: string }> };

interface Props {
  filterOptions: ApartmentFilterOptions | null;
  filtersLoading: boolean;
  filters: ApartmentCatalogFilters;
  onChange: (upd: Partial<ApartmentCatalogFilters>) => void;
  onClear: () => void;
  totalCount: number;
  hasFilters: boolean;
  className?: string;
}

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

const ApartmentFilterSidebar = ({ filterOptions, filtersLoading, filters, onChange, onClear, totalCount, hasFilters, className }: Props) => {
  const districts = filterOptions?.districts ?? [];
  const builders = filterOptions?.builders ?? [];
  const subways = filterOptions?.subways ?? [];
  const finishings = filterOptions?.finishings ?? [];
  const priceRange = filterOptions?.price ?? { min: 0, max: 0 };
  const areaRange = filterOptions?.area ?? { min: 0, max: 0 };

  const roomLabels: Record<number, string> = { 0: 'Студия', 1: '1к', 2: '2к', 3: '3к', 4: '4+' };

  return (
    <div className={cn('space-y-1', className)}>
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5 pb-3 border-b border-border">
          {filters.room.map(r => (
            <button key={r} onClick={() => onChange({ room: filters.room.filter(x => x !== r) })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              {roomLabels[r] ?? `${r}к`} <X className="w-3 h-3" />
            </button>
          ))}
          {filters.district.map(id => {
            const d = districts.find(x => x.id === id);
            return (
              <button key={id} onClick={() => onChange({ district: filters.district.filter(x => x !== id) })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                {d?.name ?? id} <X className="w-3 h-3" />
              </button>
            );
          })}
          {filters.builder.map(id => {
            const b = builders.find(x => x.id === id);
            return (
              <button key={id} onClick={() => onChange({ builder: filters.builder.filter(x => x !== id) })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                {b?.name ?? id} <X className="w-3 h-3" />
              </button>
            );
          })}
          {filters.subway.map(id => {
            const s = subways.find(x => x.id === id);
            return (
              <button key={id} onClick={() => onChange({ subway: filters.subway.filter(x => x !== id) })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                м. {s?.name ?? id} <X className="w-3 h-3" />
              </button>
            );
          })}
          {filters.finishing.map(id => {
            const f = finishings.find(x => x.id === id);
            return (
              <button key={id} onClick={() => onChange({ finishing: filters.finishing.filter(x => x !== id) })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
                {f?.name ?? id} <X className="w-3 h-3" />
              </button>
            );
          })}
          {(filters.deadline_from || filters.deadline_to) && (
            <button onClick={() => onChange({ deadline_from: '', deadline_to: '' })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              Срок сдачи <X className="w-3 h-3" />
            </button>
          )}
          {(filters.price_min != null || filters.price_max != null) && (
            <button onClick={() => onChange({ price_min: undefined, price_max: undefined })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              Цена <X className="w-3 h-3" />
            </button>
          )}
          {(filters.area_min != null || filters.area_max != null) && (
            <button onClick={() => onChange({ area_min: undefined, area_max: undefined })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              Площадь <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {filtersLoading ? (
        <div className="space-y-3 py-4">
          <div className="h-10 bg-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
        </div>
      ) : (
        <>
          <FilterSection title="Количество комнат">
            <div className="flex flex-wrap gap-2">
              {([0, 1, 2, 3, 4] as const).map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer text-sm hover:text-foreground">
                  <Checkbox checked={filters.room.includes(r)} onCheckedChange={checked => onChange({ room: checked ? [...filters.room, r] : filters.room.filter(x => x !== r) })} />
                  {roomLabels[r]}
                </label>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Цена, млн ₽" defaultOpen={false}>
            <div className="flex gap-2">
              <Input type="number" placeholder="От" className="h-9 text-sm" value={filters.price_min != null ? filters.price_min / 1e6 : ''} onChange={e => { const v = e.target.value ? Number(e.target.value) * 1e6 : undefined; onChange({ price_min: v }); }} />
              <Input type="number" placeholder="До" className="h-9 text-sm" value={filters.price_max != null ? filters.price_max / 1e6 : ''} onChange={e => { const v = e.target.value ? Number(e.target.value) * 1e6 : undefined; onChange({ price_max: v }); }} />
            </div>
          </FilterSection>

          <FilterSection title="Площадь, м²" defaultOpen={false}>
            <div className="flex gap-2">
              <Input type="number" placeholder="От" className="h-9 text-sm" value={filters.area_min ?? ''} onChange={e => onChange({ area_min: e.target.value ? Number(e.target.value) : undefined })} />
              <Input type="number" placeholder="До" className="h-9 text-sm" value={filters.area_max ?? ''} onChange={e => onChange({ area_max: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
          </FilterSection>

          <FilterSection title="Район" defaultOpen={false}>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {districts.map(d => (
                <label key={d.id} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground">
                  <Checkbox checked={filters.district.includes(d.id)} onCheckedChange={checked => onChange({ district: checked ? [...filters.district, d.id] : filters.district.filter(x => x !== d.id) })} />
                  {d.name}
                </label>
              ))}
              {districts.length === 0 && <p className="text-xs text-muted-foreground">Нет данных</p>}
            </div>
          </FilterSection>

          <FilterSection title="Метро" defaultOpen={false}>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {subways.map(s => (
                <label key={s.id} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground">
                  <Checkbox checked={(filters.subway ?? []).includes(s.id)} onCheckedChange={checked => onChange({ subway: checked ? [...(filters.subway ?? []), s.id] : (filters.subway ?? []).filter(x => x !== s.id) })} />
                  {s.name}
                </label>
              ))}
              {subways.length === 0 && <p className="text-xs text-muted-foreground">Нет данных</p>}
            </div>
          </FilterSection>

          <FilterSection title="Застройщик" defaultOpen={false}>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {builders.map(b => (
                <label key={b.id} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground">
                  <Checkbox checked={filters.builder.includes(b.id)} onCheckedChange={checked => onChange({ builder: checked ? [...filters.builder, b.id] : filters.builder.filter(x => x !== b.id) })} />
                  {b.name}
                </label>
              ))}
              {builders.length === 0 && <p className="text-xs text-muted-foreground">Нет данных</p>}
            </div>
          </FilterSection>

          <FilterSection title="Срок сдачи" defaultOpen={false}>
            <div className="flex gap-2">
              <Input type="date" placeholder="От" className="h-9 text-sm" value={filters.deadline_from} onChange={e => onChange({ deadline_from: e.target.value })} />
              <Input type="date" placeholder="До" className="h-9 text-sm" value={filters.deadline_to} onChange={e => onChange({ deadline_to: e.target.value })} />
            </div>
          </FilterSection>

          <FilterSection title="Отделка" defaultOpen={false}>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {finishings.map(f => (
                <label key={f.id} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground">
                  <Checkbox checked={filters.finishing.includes(f.id)} onCheckedChange={checked => onChange({ finishing: checked ? [...filters.finishing, f.id] : filters.finishing.filter(x => x !== f.id) })} />
                  {f.name}
                </label>
              ))}
              {finishings.length === 0 && <p className="text-xs text-muted-foreground">Нет данных</p>}
            </div>
          </FilterSection>

          <FilterSection title="Сортировка">
            <div className="space-y-1.5">
              {(['price', 'area_total', 'building_deadline_at', 'floor'] as const).map(sort => (
                <label key={sort} className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input type="radio" name="apt-sort" checked={filters.sort === sort} onChange={() => onChange({ sort })} className="rounded-full" />
                  {sort === 'price' && 'По цене'}
                  {sort === 'area_total' && 'По площади'}
                  {sort === 'building_deadline_at' && 'По сроку сдачи'}
                  {sort === 'floor' && 'По этажу'}
                </label>
              ))}
              <div className="flex gap-2 pt-1">
                <button onClick={() => onChange({ order: 'asc' })} className={cn('px-2 py-1 rounded text-xs font-medium', filters.order === 'asc' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>По возрастанию</button>
                <button onClick={() => onChange({ order: 'desc' })} className={cn('px-2 py-1 rounded text-xs font-medium', filters.order === 'desc' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80')}>По убыванию</button>
              </div>
            </div>
          </FilterSection>

          <div className="pt-3 space-y-2">
            <Button className="w-full h-11 text-sm font-medium">Показать {totalCount} квартир</Button>
            {hasFilters && (
              <Button variant="ghost" className="w-full h-9 text-sm text-muted-foreground" onClick={onClear}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Сбросить фильтры
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ApartmentFilterSidebar;
