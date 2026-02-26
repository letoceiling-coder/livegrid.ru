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
    <div className="group rounded-2xl overflow-hidden bg-card border border-border transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 will-change-transform">
      <Link to={`/object/${slug}`} className="block">
        <div className="relative overflow-hidden" style={{ height: '280px' }}>
          <img src={data.image} alt={data.title} className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-[1.03]" />
          {data.badges && data.badges.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
              {data.badges.map((b, i) => (
                <span key={i} className="px-3 py-1.5 bg-background/85 backdrop-blur-sm rounded-full text-xs font-medium">{b}</span>
              ))}
            </div>
          )}
          <button
            className="absolute top-3 right-3 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLiked(!liked); }}
          >
            <Heart className={cn("w-4 h-4", liked ? "fill-destructive text-destructive" : "text-muted-foreground")} />
          </button>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
            <span className="text-sm font-bold whitespace-nowrap">{data.price}</span>
          </div>
          {data.description ? (
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{data.description}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-1">{data.address}</p>
              <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                {data.area && <span>{data.area}</span>}
                {data.rooms && <span>{data.rooms}</span>}
              </div>
            </>
          )}
          <span className="text-primary text-xs font-medium mt-2 inline-block hover:underline">Подробнее</span>
        </div>
      </Link>
    </div>
  );
};

export default PropertyCard;
