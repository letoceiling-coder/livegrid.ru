import { Link } from 'react-router-dom';
import { MapPin, Building2, CalendarDays, Heart, Train } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';

interface Props {
  complex: ResidentialComplex;
  variant?: 'grid' | 'list';
}

const statusLabels: Record<string, { label: string; className: string }> = {
  completed: { label: 'Сдан', className: 'bg-green-500/90 text-primary-foreground' },
  building: { label: 'Строится', className: 'bg-primary/90 text-primary-foreground' },
  planned: { label: 'Проект', className: 'bg-muted text-muted-foreground' },
};

const ComplexCard = ({ complex, variant = 'grid' }: Props) => {
  const [liked, setLiked] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const totalApts = complex.buildings.reduce((s, b) => s + b.apartments.filter(a => a.status === 'available').length, 0);
  const status = statusLabels[complex.status];

  // Группировка квартир по типам
  const availableApts = complex.buildings.flatMap(b => b.apartments.filter(a => a.status === 'available'));
  const aptTypes = [0, 1, 2, 3].map(rooms => {
    const apts = availableApts.filter(a => a.rooms === rooms);
    if (apts.length === 0) return null;
    const minArea = Math.min(...apts.map(a => a.area));
    const minPrice = Math.min(...apts.map(a => a.price));
    return { rooms, area: minArea, price: minPrice, count: apts.length };
  }).filter(Boolean);

  const roomLabels: Record<number, string> = {
    0: 'Студии',
    1: '1-к.кв',
    2: '2-к.кв',
    3: '3-к.кв',
  };

  if (variant === 'list') {
    return (
      <Link
        to={`/complex/${complex.slug}`}
        className="group flex rounded-2xl overflow-hidden bg-card border border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      >
        {/* Image */}
        <div className="relative w-[320px] shrink-0 overflow-hidden bg-muted">
          <img src={complex.images[0]} alt={complex.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm', status.className)}>
              {status.label}
            </span>
          </div>
          <button
            className="absolute top-3 right-3 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center"
            onClick={e => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
          >
            <Heart className={cn('w-4 h-4', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors mb-2">{complex.name}</h3>
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{complex.district} · {complex.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Train className="w-3.5 h-3.5 shrink-0" />
                <span>м. {complex.subway} · {complex.subwayDistance}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>{complex.builder}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                <span>Сдача: {complex.deadline}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {complex.advantages.slice(0, 3).map((a, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs">{a}</span>
              ))}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-border flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">от {formatPrice(complex.priceFrom)}</p>
              <p className="text-xs text-muted-foreground">{totalApts} квартир</p>
            </div>
            <span className="text-primary font-medium text-sm">Подробнее →</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/complex/${complex.slug}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border border-border cursor-pointer transition-[transform,box-shadow] duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5"
      style={{ height: '420px', minHeight: '420px' }}
    >
      <div
        className="relative flex-shrink-0 overflow-hidden rounded-t-2xl h-[260px] group-hover:h-[180px] transition-[height] duration-250 ease-out"
        data-no-nav="true"
      >
        <img
          src={complex.images[currentImageIndex] || complex.images[0]}
          alt={complex.name}
          className="w-full h-full object-cover object-center"
        />
        <button
          type="button"
          data-no-nav="true"
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center z-10 bg-background/75 backdrop-blur-sm transition-[opacity] duration-200 hover:bg-background/90 active:scale-95"
          aria-label="Добавить в избранное"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
        >
          <Heart className={cn('w-5 h-5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
        </button>
        {complex.images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10" data-no-nav="true">
            {complex.images.map((_, index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  'w-2 h-2 rounded-full transition-colors duration-200 cursor-pointer',
                  index === currentImageIndex ? 'bg-background' : 'bg-background/40'
                )}
                onClick={e => { e.preventDefault(); e.stopPropagation(); setCurrentImageIndex(index); }}
                aria-label={`Изображение ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{complex.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">В продаже {totalApts} квартир</p>
          </div>
          <span className="font-bold text-sm shrink-0">от {formatPrice(complex.priceFrom)}</span>
        </div>
        <div className={cn(
          'mt-2 overflow-hidden transition-[max-height,opacity] duration-250 ease-out',
          'group-hover:max-h-[200px] group-hover:opacity-100',
          'max-h-0 opacity-0'
        )}>
          {aptTypes.map((apt, index) => (
            <div key={index} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 gap-2 text-xs">
              <span className="font-medium text-foreground shrink-0">{roomLabels[apt!.rooms]}</span>
              <span className="text-muted-foreground shrink-0">от {Math.round(apt!.area)} м²</span>
              <span className="font-medium shrink-0">от {formatPrice(apt!.price)}</span>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-2">
          <span
            data-no-nav="true"
            className="text-primary text-xs font-medium hover:underline transition-opacity cursor-pointer"
            onClick={e => e.preventDefault()}
          >
            Подробнее
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ComplexCard;
