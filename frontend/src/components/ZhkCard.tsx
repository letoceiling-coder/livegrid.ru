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
  const touchRef = useRef(0);
  const navigate = useNavigate();
  const slug = data.slug || 'smorodina';

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.min(data.images.length - 1, Math.max(0, Math.floor((x / rect.width) * data.images.length)));
    setPhotoIdx(prev => prev !== idx ? idx : prev);
  }, [data.images.length]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return;
    navigate(`/zhk/${slug}`);
  };

  const handleTap = (e: React.TouchEvent) => {
    // Ignore if swiping photos
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return;
    if (tapped) {
      navigate(`/zhk/${slug}`);
    } else {
      setTapped(true);
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/zhk/${slug}`);
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-card border border-border transition-shadow duration-300 ease-in-out hover:shadow-xl cursor-pointer will-change-transform"
      style={{ height: '420px' }}
      onClick={handleCardClick}
      onTouchEnd={handleTap}
      onMouseLeave={() => setTapped(false)}
    >
      {/* Photo area - fixed height */}
      <div
        className="relative overflow-hidden"
        style={{ height: '250px' }}
        onMouseMove={handleMouseMove}
        onTouchStart={e => { touchRef.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          e.stopPropagation();
          const diff = e.changedTouches[0].clientX - touchRef.current;
          if (Math.abs(diff) > 50) {
            if (diff > 0) setPhotoIdx(p => Math.max(0, p - 1));
            else setPhotoIdx(p => Math.min(data.images.length - 1, p + 1));
          }
        }}
      >
        <img
          src={data.images[photoIdx]}
          alt={data.name}
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-[1.04]"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {data.badges.map((b, i) => (
            <span key={i} className="px-2.5 py-1 bg-background/90 backdrop-blur-sm rounded-full text-xs font-medium">{b}</span>
          ))}
        </div>

        {/* Heart */}
        <button
          data-no-nav
          className="absolute top-3 right-3 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
          onClick={e => { e.stopPropagation(); setLiked(!liked); }}
        >
          <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-muted-foreground")} />
        </button>

        {/* Dots */}
        {data.images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {data.images.map((_, i) => (
              <div key={i} className={cn("w-2 h-2 rounded-full transition-colors duration-200", i === photoIdx ? "bg-background" : "bg-background/40")} />
            ))}
          </div>
        )}
      </div>

      {/* Info area - fixed position below image */}
      <div className="absolute bottom-0 left-0 right-0 p-4" style={{ top: '250px' }}>
        <div className="flex justify-between items-start gap-2">
          <div>
            <h3 className="font-semibold text-sm">{data.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{data.unitsCount}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="font-bold text-sm">{data.price}</span>
          </div>
        </div>
        <button
          data-no-nav
          className="text-primary text-xs font-medium mt-2 hover:underline transition-colors cursor-pointer float-right"
          onClick={handleDetailsClick}
        >
          Подробнее
        </button>
      </div>

      {/* Apartment overlay - absolute, no layout shift */}
      <div className={cn(
        "absolute left-0 right-0 bottom-0 bg-card/95 backdrop-blur-sm px-4 py-3 z-20 transition-all duration-[250ms] ease-in-out will-change-transform",
        "opacity-0 translate-y-5 pointer-events-none",
        "group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto",
        tapped && "opacity-100 translate-y-0 pointer-events-auto"
      )}>
        {data.apartments.slice(0, 4).map((apt, i) => (
          <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 gap-2">
            <span className="text-primary text-xs font-medium whitespace-nowrap">{apt.type}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{apt.area}</span>
            <span className="text-xs font-medium whitespace-nowrap">{apt.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ZhkCard;
