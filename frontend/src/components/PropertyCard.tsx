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
}

const PropertyCard = ({ data }: { data: PropertyData }) => {
  const [liked, setLiked] = useState(false);
  const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-яё0-9-]/gi, '');
  return (
    <div className="group rounded-2xl overflow-hidden bg-card border border-border transition-[transform,box-shadow,opacity] duration-200 ease-out hover:shadow-lg hover:-translate-y-0.5">
      <Link to={`/object/${slug}`} className="block">
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
