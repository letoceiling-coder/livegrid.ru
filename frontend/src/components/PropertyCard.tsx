import { Heart } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface PropertyData {
  image: string;
  title: string;
  price: string;
  address: string;
  area?: string;
  rooms?: string;
  badges?: string[];
  slug?: string;
  description?: string;
  priceRaw?: number | null;
  unitsCount?: number | null;
  promoStrip?: string | null;
}

const PropertyCard = ({ data, variant }: { data: PropertyData; variant?: 'hotDeals' | 'list' }) => {
  const [liked, setLiked] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');

  const isHotDeals = variant === 'hotDeals';
  const isList = variant === 'list';

  const priceDisplay = isHotDeals && data.priceRaw != null && data.priceRaw > 0
    ? `от ${data.priceRaw.toLocaleString('ru-RU')} ₽`
    : data.price;

  if (isList) {
    return (
      <div className="rounded-2xl overflow-hidden bg-card border border-border transition-[transform,box-shadow] duration-200 hover:shadow-md flex gap-3 p-3 h-[140px]">
        <Link to={`/apartment/${slug}`} className="flex flex-1 min-w-0 gap-3">
          <div className="relative w-[140px] h-full shrink-0 rounded-lg overflow-hidden bg-muted/60">
            <img src={data.image} alt={data.title} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-sm leading-snug line-clamp-2">{data.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{data.address}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-3 text-xs text-muted-foreground">
                {data.area && <span>{data.area}</span>}
                {data.rooms && <span>{data.rooms}</span>}
              </div>
              <span className="text-sm font-bold whitespace-nowrap">{data.price}</span>
            </div>
          </div>
        </Link>
        <button
          type="button"
          className="shrink-0 self-start p-2 rounded-full hover:bg-muted"
          onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
          aria-label={liked ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          <Heart className={cn('w-5 h-5', liked ? 'fill-destructive text-destructive' : 'text-muted-foreground')} />
        </button>
      </div>
    );
  }

  if (isHotDeals) {
    return (
      <div className="group flex flex-col rounded-2xl overflow-hidden bg-card border border-border transition-[transform,box-shadow,opacity] duration-200 ease-out hover:shadow-lg hover:scale-[1.01]">
        <Link to={`/apartment/${slug}`} className="flex flex-col flex-1 min-h-0">
          <div className="relative h-[200px] lg:h-[220px] xl:h-[240px] overflow-hidden rounded-2xl bg-muted/60 shrink-0">
            {!imgLoaded && (
              <div className="absolute inset-0 bg-muted animate-pulse" aria-hidden />
            )}
            <img
              src={data.image}
              alt={data.title}
              className="w-full h-full object-cover"
              onLoad={() => setImgLoaded(true)}
            />
            {data.badges && data.badges.length > 0 && (
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 max-w-[80%]">
                {data.badges.slice(0, 3).map((b, i) => (
                  <span key={i} className="px-3 py-1 bg-white text-black rounded-full text-xs font-medium shadow-sm">{b}</span>
                ))}
              </div>
            )}
            <button
              type="button"
              className="absolute top-3 right-3 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center z-10 bg-background/75 backdrop-blur-sm transition-opacity duration-200 hover:opacity-90 active:scale-95"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
              aria-label={liked ? 'Убрать из избранного' : 'Добавить в избранное'}
            >
              <Heart className={cn("w-5 h-5", liked ? "fill-destructive text-destructive" : "text-muted-foreground")} />
            </button>
          </div>
          <div className="flex flex-col flex-1 p-4 min-h-0">
            <h3 className="font-semibold text-base truncate">{data.address}</h3>
            {(data.unitsCount != null && data.unitsCount > 0) && (
              <p className="text-sm text-muted-foreground mt-0.5">В продаже {data.unitsCount.toLocaleString('ru-RU')} квартир</p>
            )}
            {!(data.unitsCount != null && data.unitsCount > 0) && (data.rooms || data.area) ? (
              <p className="text-sm text-muted-foreground mt-0.5">
                {[data.rooms, data.area].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            <div className="flex justify-between items-center gap-2 mt-2">
              <span className="font-semibold text-sm shrink-0">{priceDisplay}</span>
            </div>
            <span className="text-primary text-sm font-medium mt-3 inline-block hover:opacity-80 transition-opacity">
              Подробнее
            </span>
            {data.promoStrip && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
                  {data.promoStrip}
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="group rounded-2xl overflow-hidden bg-card border border-border transition-[transform,box-shadow,opacity] duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5">
      <Link to={`/apartment/${slug}`} className="block">
        <div className="relative h-[200px] overflow-hidden rounded-t-2xl bg-muted/60">
          <img
            src={data.image}
            alt={data.title}
            className="w-full h-full object-contain"
          />
          {data.badges && data.badges.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
              {data.badges.map((b, i) => (
                <span key={i} className="px-3 py-1.5 bg-background/85 backdrop-blur-sm rounded-full text-xs font-medium">{b}</span>
              ))}
            </div>
          )}
          <button
            type="button"
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center z-10 bg-background/75 backdrop-blur-sm transition-[opacity,transform] duration-200 hover:bg-background/90 active:scale-95"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
            aria-label={liked ? 'Убрать из избранного' : 'Добавить в избранное'}
          >
            <Heart className={cn("w-5 h-5", liked ? "fill-destructive text-destructive" : "text-muted-foreground")} />
          </button>
        </div>
        <div className="p-3 pt-2">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-sm leading-snug">{data.title}</h3>
            <span className="text-sm font-bold whitespace-nowrap">{data.price}</span>
          </div>
          {data.description ? (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">{data.description}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">{data.address}</p>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                {data.area && <span>{data.area}</span>}
                {data.rooms && <span>{data.rooms}</span>}
              </div>
            </>
          )}
        </div>
      </Link>
    </div>
  );
};

export default PropertyCard;
