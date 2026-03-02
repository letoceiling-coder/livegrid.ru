import { Link } from 'react-router-dom';
import { Heart, MapPin, HardHat, Calendar } from 'lucide-react';
import { type BlockListItem } from '@/types/block';

interface ZhkCardRowProps {
  block: BlockListItem;
}

/** crm_id → human-readable label (from rooms table) */
const ROOM_LABELS: Record<string, string> = {
  '0':    'Студии',
  '1':    '1-к.кв',
  '2':    '2-к.кв',
  '3':    '3-к.кв',
  '4':    '4-к.кв',
  '5':    '5-к.кв',
  '6':    '6-к.кв',
  '22':   '2Е-к.кв',
  '23':   '3Е-к.кв',
  '24':   '4Е-к.кв',
  '25':   '5Е-к.кв',
  '30':   'Коттеджи',
  '40':   'Таунхаусы',
  '50':   'К. пом.',
  '60':   'Своб. план.',
};

/** Preferred display order */
const ROOM_ORDER = ['0', '1', '2', '3', '4', '5', '6', '22', '23', '24', '25', '60', '30', '40', '50'];

function formatPriceMillions(price: number): string {
  const m = price / 1_000_000;
  if (m >= 100) return `${Math.round(m)} млн`;
  if (m >= 10)  return `${Math.round(m * 10) / 10} млн`;
  return `${Math.round(m * 100) / 100} млн`;
}

function formatDeadlineLabel(label: string | null | undefined): string {
  if (!label) return 'Сдан';
  return label;
}

const ZhkCardRow = ({ block }: ZhkCardRowProps) => {
  const mainImage = block.images?.[0] || '';

  // Sort room_prices by preferred order, take up to 5
  const roomPriceEntries = block.room_prices
    ? ROOM_ORDER
        .filter(k => k in (block.room_prices!))
        .map(k => [k, (block.room_prices!)[k]] as [string, number])
        .slice(0, 5)
    : [];

  const hasRoomPrices = roomPriceEntries.length > 0;

  return (
    <div className="group flex flex-col sm:flex-row rounded-2xl overflow-hidden bg-card border transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-0.5 border-border">
      {/* ── Image ──────────────────────────────────────────────────────────── */}
      <Link
        to={`/zhk/${block.slug}`}
        className="block sm:w-[220px] lg:w-[260px] shrink-0 relative overflow-hidden"
      >
        <div className="h-[180px] sm:h-full min-h-[180px]">
          {mainImage ? (
            <img
              src={mainImage}
              alt={block.name}
              className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Нет фото</span>
            </div>
          )}
        </div>
        <button
          className="absolute top-3 right-3 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center z-10"
          onClick={e => e.preventDefault()}
        >
          <Heart className="w-4 h-4 text-muted-foreground" />
        </button>
      </Link>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 sm:p-5 flex gap-4 min-w-0">

        {/* Left info column */}
        <div className="flex-1 min-w-0">
          {/* Name + deadline */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link to={`/zhk/${block.slug}`} className="block min-w-0">
              <h3 className="font-semibold text-base leading-tight hover:text-primary transition-colors truncate">
                {block.name}
              </h3>
            </Link>
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
              {formatDeadlineLabel(block.deadline_label)}
            </span>
          </div>

          {/* Metro / subways */}
          {block.subways && block.subways.length > 0 && (
            <div className="space-y-1 mb-2">
              {block.subways.slice(0, 2).map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: s.line_color || '#9ca3af' }}
                  />
                  <span className="truncate max-w-[120px]">{s.name}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="shrink-0">{s.travel_time} мин</span>
                  <span className="text-muted-foreground/50 shrink-0">
                    {s.travel_type === 'walk' ? 'пешком' : 'транспортом'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Address */}
          {block.address && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-1">{block.address}</span>
            </div>
          )}

          {/* Builder */}
          {block.builder?.name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <HardHat className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Застройщик: {block.builder.name}</span>
            </div>
          )}

          {/* District (if no address) */}
          {!block.address && block.district?.name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{block.district.name}</span>
            </div>
          )}

          {/* Mobile price (shown when no sidebar) */}
          {!hasRoomPrices && block.price_from && (
            <div className="mt-3">
              <span className="text-base font-bold">
                от {formatPriceMillions(block.price_from)} ₽
              </span>
            </div>
          )}

          {/* Mobile room prices (compact) */}
          {hasRoomPrices && (
            <div className="sm:hidden mt-3 space-y-1">
              {roomPriceEntries.slice(0, 3).map(([roomId, price]) => (
                <div key={roomId} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{ROOM_LABELS[roomId] ?? `${roomId}-к`}</span>
                  <span className="font-medium">от {formatPriceMillions(price)} ₽</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: prices + count + link ─────────────────────────────────── */}
        <div className="hidden sm:flex flex-col justify-between shrink-0 min-w-[160px] max-w-[200px]">
          {hasRoomPrices ? (
            <div className="space-y-1.5">
              {roomPriceEntries.map(([roomId, price]) => (
                <div key={roomId} className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {ROOM_LABELS[roomId] ?? `${roomId}-к`}
                  </span>
                  <div className="flex-1 border-b border-dashed border-border mx-1" />
                  <span className="text-xs font-medium whitespace-nowrap">
                    от {formatPriceMillions(price)} ₽
                  </span>
                </div>
              ))}
            </div>
          ) : block.price_from ? (
            <div>
              <span className="text-base font-bold">
                от {formatPriceMillions(block.price_from)} ₽
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Цена по запросу</span>
          )}

          <div className="mt-3 space-y-1">
            {block.units_count > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Квартир {block.units_count.toLocaleString('ru-RU')}</span>
              </div>
            )}
            <Link
              to={`/zhk/${block.slug}`}
              className="text-primary text-xs font-medium hover:underline block"
            >
              Подробнее →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZhkCardRow;
