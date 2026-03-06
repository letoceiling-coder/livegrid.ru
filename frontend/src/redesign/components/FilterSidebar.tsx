import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockFiltersData } from '@/api/blocksApi';
import type { CatalogBlockFilters } from '@/redesign/data/types';

interface Props {
  filterOptions: BlockFiltersData | null;
  filtersLoading: boolean;
  filters: CatalogBlockFilters;
  onChange: (upd: Partial<CatalogBlockFilters>) => void;
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

const FilterSidebar = ({ filterOptions, filtersLoading, filters, onChange, onClear, totalCount, hasFilters, className }: Props) => {
  const districts = filterOptions?.districts ?? [];
  const builders = filterOptions?.builders ?? [];
  const priceRange = filterOptions?.price ?? { min: 0, max: 0 };
  const deadlineRange = filterOptions?.deadline ?? { min: null, max: null };

  return (
    <div className={cn('space-y-1', className)}>
      {/* Active tags */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5 pb-3 border-b border-border">
          {filters.district.map(id => {
            const d = districts.find(x => x.id === id);
            return (
              <button
                key={id}
                onClick={() => onChange({ district: filters.district.filter(x => x !== id) })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
              >
                {d?.name ?? id} <X className="w-3 h-3" />
              </button>
            );
          })}
          {filters.builder.map(id => {
            const b = builders.find(x => x.id === id);
            return (
              <button
                key={id}
                onClick={() => onChange({ builder: filters.builder.filter(x => x !== id) })}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20"
              >
                {b?.name ?? id} <X className="w-3 h-3" />
              </button>
            );
          })}
          {(filters.deadline_from || filters.deadline_to) && (
            <button onClick={() => onChange({ deadline_from: '', deadline_to: '' })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              Срок сдачи <X className="w-3 h-3" />
            </button>
          )}
          {filters.price_max != null && filters.price_max > 0 && (
            <button onClick={() => onChange({ price_max: null })} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              До {(filters.price_max / 1_000_000).toFixed(0)} млн <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {filtersLoading ? (
        <div className="space-y-3 py-4">
          <div className="h-10 bg-muted animate-pulse rounded-lg" />
          <div className="h-24 bg-muted animate-pulse rounded-lg" />
          <div className="h-16 bg-muted animate-pulse rounded-lg" />
        </div>
      ) : (
        <>
          {/* District */}
          <FilterSection title="Район" defaultOpen={false}>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {districts.map(d => (
                <label key={d.id} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground">
                  <Checkbox
                    checked={filters.district.includes(d.id)}
                    onCheckedChange={checked =>
                      onChange({
                        district: checked ? [...filters.district, d.id] : filters.district.filter(x => x !== d.id),
                      })
                    }
                  />
                  {d.name}
                </label>
              ))}
              {districts.length === 0 && <p className="text-xs text-muted-foreground">Нет данных</p>}
            </div>
          </FilterSection>

          {/* Builder */}
          <FilterSection title="Застройщик" defaultOpen={false}>
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {builders.map(b => (
                <label key={b.id} className="flex items-center gap-2.5 cursor-pointer text-sm hover:text-foreground">
                  <Checkbox
                    checked={filters.builder.includes(b.id)}
                    onCheckedChange={checked =>
                      onChange({
                        builder: checked ? [...filters.builder, b.id] : filters.builder.filter(x => x !== b.id),
                      })
                    }
                  />
                  {b.name}
                </label>
              ))}
              {builders.length === 0 && <p className="text-xs text-muted-foreground">Нет данных</p>}
            </div>
          </FilterSection>

          {/* Deadline */}
          <FilterSection title="Срок сдачи">
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="От"
                className="h-9 text-sm"
                value={filters.deadline_from}
                onChange={e => onChange({ deadline_from: e.target.value })}
              />
              <Input
                type="date"
                placeholder="До"
                className="h-9 text-sm"
                value={filters.deadline_to}
                onChange={e => onChange({ deadline_to: e.target.value })}
              />
            </div>
          </FilterSection>

          {/* Sort */}
          <FilterSection title="Сортировка">
            <div className="space-y-1.5">
              {(['price_from', 'deadline', 'name'] as const).map(sort => (
                <label key={sort} className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === sort}
                    onChange={() => onChange({ sort })}
                    className="rounded-full"
                  />
                  {sort === 'price_from' && 'По цене'}
                  {sort === 'deadline' && 'По сроку сдачи'}
                  {sort === 'name' && 'По названию'}
                </label>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onChange({ order: 'asc' })}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    filters.order === 'asc' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  По возрастанию
                </button>
                <button
                  onClick={() => onChange({ order: 'desc' })}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    filters.order === 'desc' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  По убыванию
                </button>
              </div>
            </div>
          </FilterSection>

          {/* Actions */}
          <div className="pt-3 space-y-2">
            <Button className="w-full h-11 text-sm font-medium">Показать {totalCount} объектов</Button>
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

export default FilterSidebar;
