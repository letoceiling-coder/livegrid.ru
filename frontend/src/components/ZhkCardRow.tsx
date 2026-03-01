import { Heart, MapPin, Building2, CircleDot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ZhkData } from '@/components/ZhkCard';

function formatPriceRub(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

// Маппинг номеров комнат в названия типов
function getRoomTypeName(room: string): string {
  if (room === '0') return 'Студии';
  if (room === '22') return '2Е-к.кв';
  if (room === '23') return '3Е-к.кв';
  if (room === '24') return '4Е-к.кв';
  if (room === '25') return '5Е-к.кв';
  if (room === '30') return 'Своб. план';
  return `${room}-к.кв`;
}

function formatTravel(subway: { name: string; travel_time?: number; travel_type?: number | string }): string {
  const parts = [subway.name];
  if (subway.travel_time != null) {
    parts.push(`${subway.travel_time} минут`);
    const typeMap: Record<number, string> = { 1: 'пешком', 2: 'транспортом' };
    const typeStr = typeof subway.travel_type === 'number' ? typeMap[subway.travel_type] : subway.travel_type;
    if (typeStr) parts.push(typeStr);
  }
  return parts.join(', ');
}

interface ZhkCardRowProps {
  data: ZhkData;
}

const ZhkCardRow = ({ data }: ZhkCardRowProps) => {
  const [liked, setLiked] = useState(false);
  const slug = data.slug ?? '';

  return (
    <Link
      to={`/zhk/${slug}`}
      className={cn(
        'group flex flex-col sm:flex-row rounded-2xl overflow-hidden bg-card border border-border transition-shadow duration-300 hover:shadow-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
    >
      {/* Изображение слева (сверху на мобиле) */}
      <figure className="relative w-full sm:w-[280px] sm:min-w-[280px] md:w-[320px] md:min-w-[320px] shrink-0">
        <div className="relative h-[200px] sm:h-[220px] bg-muted">
          <img
            src={data.images[0]}
            alt={data.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {data.badges.length > 0 && (
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
              {data.badges.map((b, i) => (
                <span key={i} className="px-2.5 py-1 bg-background/90 backdrop-blur-sm rounded-lg text-xs font-medium">
                  {b}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            className="absolute top-3 right-3 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
            onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
          >
            <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-muted-foreground")} />
          </button>
          {(data.statusText || data.statusLabel) && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-3 py-2">
              <div>{data.statusText === 'Сдан' ? 'Сдан' : 'Срок сдачи'}</div>
              <div className="font-medium">{data.statusText === 'Сдан' ? '' : data.statusLabel}</div>
            </div>
          )}
        </div>
      </figure>

      {/* Контент справа (снизу на мобиле) */}
      <figcaption className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-base truncate" title={data.name}>
              {data.name}
            </h2>
            {data.statusText && (
              <span className="text-xs font-bold text-foreground shrink-0">
                {data.statusText}
              </span>
            )}
          </div>

          {data.subways && data.subways.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleDot className="w-4 h-4 shrink-0" style={{ color: data.subways[0].line_color || '#FFA500' }} />
              <span>{formatTravel(data.subways[0])}</span>
            </div>
          )}

          {data.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="line-clamp-2" title={data.address}>{data.address}</span>
            </div>
          )}

          {data.builderName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Застройщик: {data.builderName}</span>
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col sm:items-end gap-1 border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
          {/* Цены по типам комнат */}
          {data.roomPrices && Object.keys(data.roomPrices).length > 0 ? (
            <div className="space-y-1.5">
              {Object.entries(data.roomPrices).slice(0, 5).map(([room, price]) => (
                <div key={room} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{getRoomTypeName(room)}</span>
                  <span className="font-medium whitespace-nowrap">от {formatPriceRub(price)}</span>
                </div>
              ))}
            </div>
          ) : (
            data.priceRaw != null && (
              <div className="text-sm">
                <span className="text-muted-foreground">от </span>
                <span className="font-semibold">{formatPriceRub(data.priceRaw)}</span>
              </div>
            )
          )}
          <span className="text-xs text-muted-foreground mt-1">{data.unitsCount}</span>
          <span className="text-primary text-sm font-medium hover:underline mt-1">
            Подробнее →
          </span>
          <span className="mt-2 inline-flex px-3 py-1 rounded-2xl bg-muted text-xs font-medium text-muted-foreground">
            Новостройки
          </span>
        </div>
      </figcaption>
    </Link>
  );
};

export default ZhkCardRow;
