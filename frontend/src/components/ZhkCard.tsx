import { useState, useRef, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface ZhkApartment { type: string; area: string; price: string; }
export interface ZhkData {
  images: string[];
  name: string;
  price: string;
  unitsCount: string;
  badges: string[];
  apartments: ZhkApartment[];
  slug?: string;
}

const ZhkCard = ({ data }: { data: ZhkData }) => {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [liked, setLiked] = useState(false);
  const [tapped, setTapped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const touchRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const x = clientX - rect.left;
      const zoneCount = Math.max(2, Math.min(3, data.images.length));
      const zoneWidth = rect.width / zoneCount;
      const zone = Math.min(zoneCount - 1, Math.floor(x / zoneWidth));
      const idx = Math.min(data.images.length - 1, Math.floor((zone / zoneCount) * data.images.length));
      setPhotoIdx(prev => prev !== idx ? idx : prev);
    }, 300);
  }, [data.images.length]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return;
    navigate(`/complex/${slug}`);
  };

  const handleTap = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return;
    if (tapped) {
      navigate(`/complex/${slug}`);
    } else {
      setTapped(true);
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/complex/${slug}`);
  };

  const handleSwipe = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchRef.current;
    if (Math.abs(diff) > 50) {
      e.stopPropagation();
      if (diff > 0) setPhotoIdx(p => Math.max(0, p - 1));
      else setPhotoIdx(p => Math.min(data.images.length - 1, p + 1));
    }
  };

  const visibleBadges = data.badges?.slice(0, 4) ?? [];
  const apartments = data.apartments?.slice(0, 4) ?? [];
  const isExpanded = hovered || tapped;

  return (
    <div
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border border-border cursor-pointer transition-[transform,box-shadow] duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5"
      style={{ height: '420px', minHeight: '420px' }}
      onClick={handleCardClick}
      onTouchEnd={handleTap}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTapped(false); }}
    >
      {/* Photo area: 260px default, 160px on hover — transitions without layout shift */}
      <div
        className="relative flex-shrink-0 overflow-hidden rounded-t-2xl transition-[height] duration-250 ease-out"
        style={{ height: isExpanded ? 160 : 260 }}
        onMouseMove={handleMouseMove}
        onTouchStart={e => { touchRef.current = e.touches[0].clientX; }}
        onTouchEnd={e => { handleSwipe(e); }}
        data-no-nav
      >
        {(data.images?.length ?? 0) > 0 ? (
          <img
            src={data.images[photoIdx] || data.images[0]}
            alt={data.name}
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div className="w-full h-full bg-muted/60 flex items-center justify-center text-muted-foreground text-sm">
            Нет фото
          </div>
        )}

        {/* Badges — pill, max 1-2 per row, light bg */}
        {visibleBadges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10 max-w-[80%]">
            {visibleBadges.map((b, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-background/95 backdrop-blur-sm rounded-full text-xs font-medium shadow-sm border border-border/50"
              >
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Heart — 44px tap area, no layout change on hover */}
        <button
          type="button"
          data-no-nav
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center z-10 bg-background/75 backdrop-blur-sm transition-[opacity] duration-200 hover:bg-background/90 active:scale-95"
          onClick={e => { e.stopPropagation(); e.preventDefault(); setLiked(!liked); }}
          aria-label={liked ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          <Heart className={cn("w-5 h-5", liked ? "fill-destructive text-destructive" : "text-muted-foreground")} />
        </button>

        {/* Dots */}
        {data.images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {data.images.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  i === photoIdx ? "bg-background" : "bg-background/40"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info area — grows when photo shrinks, no external reflow */}
      <div
        className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden"
        style={{ minHeight: isExpanded ? 260 : 160 }}
      >
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight truncate">{data.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{data.unitsCount}</p>
          </div>
          <span className="font-bold text-sm shrink-0">{data.price}</span>
        </div>

        {/* 4 lines — visible on hover (desktop) or tap (mobile) */}
        <div
          className={cn(
            "mt-2 overflow-hidden transition-[max-height,opacity] duration-250 ease-out",
            isExpanded ? "max-h-[140px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {apartments.map((apt, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-1.5 border-b border-border last:border-0 gap-2 text-xs"
            >
              <span className="font-medium text-foreground shrink-0">{apt.type}</span>
              <span className="text-muted-foreground shrink-0">{apt.area === '—' ? apt.area : `от ${apt.area}`}</span>
              <span className="font-medium shrink-0">{apt.price}</span>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-2">
          <button
            data-no-nav
            className="text-primary text-xs font-medium hover:underline transition-opacity cursor-pointer"
            onClick={handleDetailsClick}
          >
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZhkCard;
