import { useState, useEffect } from 'react';
import { ChevronDown, SlidersHorizontal, Search, X } from 'lucide-react';
import { useBlockFilters } from '@/hooks/useBlockFilters';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface BlockFilterValues {
  districts: string[];
  builders: string[];
  priceMin: number | null;
  priceMax: number | null;
  deadlineFrom: string | null;
  deadlineTo: string | null;
}

interface BlockFiltersProps {
  values: BlockFilterValues;
  onChange: (values: BlockFilterValues) => void;
  onSearch: () => void;
  resultsCount?: number;
}

const BlockFilters = ({ values, onChange, onSearch, resultsCount }: BlockFiltersProps) => {
  const { filters, loading } = useBlockFilters();
  const [localValues, setLocalValues] = useState<BlockFilterValues>(values);

  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const handleDistrictToggle = (districtId: string) => {
    const updated = localValues.districts.includes(districtId)
      ? localValues.districts.filter(id => id !== districtId)
      : [...localValues.districts, districtId];
    setLocalValues({ ...localValues, districts: updated });
  };

  const handleBuilderToggle = (builderId: string) => {
    const updated = localValues.builders.includes(builderId)
      ? localValues.builders.filter(id => id !== builderId)
      : [...localValues.builders, builderId];
    setLocalValues({ ...localValues, builders: updated });
  };

  const handlePriceChange = (field: 'priceMin' | 'priceMax', value: string) => {
    const numValue = value ? parseFloat(value) : null;
    setLocalValues({ ...localValues, [field]: numValue });
  };

  const handleDeadlineChange = (field: 'deadlineFrom' | 'deadlineTo', value: string) => {
    setLocalValues({ ...localValues, [field]: value || null });
  };

  const applyFilters = () => {
    onChange(localValues);
  };

  const resetFilters = () => {
    const empty: BlockFilterValues = {
      districts: [],
      builders: [],
      priceMin: null,
      priceMax: null,
      deadlineFrom: null,
      deadlineTo: null,
    };
    setLocalValues(empty);
    onChange(empty);
  };

  const hasActiveFilters = 
    localValues.districts.length > 0 ||
    localValues.builders.length > 0 ||
    localValues.priceMin !== null ||
    localValues.priceMax !== null ||
    localValues.deadlineFrom !== null ||
    localValues.deadlineTo !== null;

  if (loading || !filters) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-32 bg-secondary/50 rounded-full animate-pulse" />
        <div className="h-10 w-32 bg-secondary/50 rounded-full animate-pulse" />
        <div className="h-10 w-32 bg-secondary/50 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Районы */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full min-w-[140px]"
          >
            <span className={localValues.districts.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
              {localValues.districts.length > 0 ? `Районы (${localValues.districts.length})` : 'Районы'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Районы</h4>
              {localValues.districts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalValues({ ...localValues, districts: [] })}
                  className="h-6 text-xs"
                >
                  Сбросить
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filters.districts.map(district => (
                  <div key={district.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`district-${district.id}`}
                      checked={localValues.districts.includes(district.id)}
                      onCheckedChange={() => handleDistrictToggle(district.id)}
                    />
                    <Label
                      htmlFor={`district-${district.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {district.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button onClick={applyFilters} className="w-full">
              Применить
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Застройщики */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full min-w-[140px]"
          >
            <span className={localValues.builders.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>
              {localValues.builders.length > 0 ? `Застройщики (${localValues.builders.length})` : 'Застройщики'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Застройщики</h4>
              {localValues.builders.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalValues({ ...localValues, builders: [] })}
                  className="h-6 text-xs"
                >
                  Сбросить
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filters.builders.map(builder => (
                  <div key={builder.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`builder-${builder.id}`}
                      checked={localValues.builders.includes(builder.id)}
                      onCheckedChange={() => handleBuilderToggle(builder.id)}
                    />
                    <Label
                      htmlFor={`builder-${builder.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {builder.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button onClick={applyFilters} className="w-full">
              Применить
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Цена */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full min-w-[140px]"
          >
            <span className={(localValues.priceMin !== null || localValues.priceMax !== null) ? 'text-foreground' : 'text-muted-foreground'}>
              Цена
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Цена</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="price-min" className="text-xs text-muted-foreground">От, ₽</Label>
                <Input
                  id="price-min"
                  type="number"
                  placeholder={filters.price.min.toLocaleString('ru-RU')}
                  value={localValues.priceMin ?? ''}
                  onChange={(e) => handlePriceChange('priceMin', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="price-max" className="text-xs text-muted-foreground">До, ₽</Label>
                <Input
                  id="price-max"
                  type="number"
                  placeholder={filters.price.max.toLocaleString('ru-RU')}
                  value={localValues.priceMax ?? ''}
                  onChange={(e) => handlePriceChange('priceMax', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={applyFilters} className="w-full">
              Применить
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Срок сдачи */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full min-w-[140px]"
          >
            <span className={(localValues.deadlineFrom !== null || localValues.deadlineTo !== null) ? 'text-foreground' : 'text-muted-foreground'}>
              Срок сдачи
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Срок сдачи</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="deadline-from" className="text-xs text-muted-foreground">От</Label>
                <Input
                  id="deadline-from"
                  type="date"
                  value={localValues.deadlineFrom ?? ''}
                  onChange={(e) => handleDeadlineChange('deadlineFrom', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="deadline-to" className="text-xs text-muted-foreground">До</Label>
                <Input
                  id="deadline-to"
                  type="date"
                  value={localValues.deadlineTo ?? ''}
                  onChange={(e) => handleDeadlineChange('deadlineTo', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={applyFilters} className="w-full">
              Применить
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Все фильтры */}
      <Button
        variant="outline"
        onClick={resetFilters}
        disabled={!hasActiveFilters}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full"
      >
        <SlidersHorizontal className="w-4 h-4" />
        {hasActiveFilters && <X className="w-4 h-4" />}
      </Button>

      {/* Кнопка поиска */}
      <Button
        onClick={onSearch}
        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium whitespace-nowrap"
      >
        <Search className="w-4 h-4 inline mr-1.5" />
        {resultsCount !== undefined ? `Найти ${resultsCount.toLocaleString('ru-RU')} ${getObjectsLabel(resultsCount)}` : 'Найти'}
      </Button>
    </div>
  );
};

function getObjectsLabel(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'объектов';
  }

  if (lastDigit === 1) {
    return 'объект';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'объекта';
  }

  return 'объектов';
}

export default BlockFilters;
