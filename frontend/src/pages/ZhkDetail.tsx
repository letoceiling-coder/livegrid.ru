import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Heart, ChevronRight, ChevronDown, Building, Layers, Maximize, Play, LayoutList, Grid3X3 } from 'lucide-react';
import Header from '@/components/Header';
import PropertyGridSection from '@/components/PropertyGridSection';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import ZhkCard from '@/components/ZhkCard';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useBlockDetail } from '@/hooks/useBlockDetail';
import { useBlockApartments } from '@/hooks/useBlockApartments';
import { useBlocks } from '@/hooks/useBlocks';
import { formatPrice, formatDeadline, formatArea } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { type ApartmentListItem } from '@/types/apartment';
import BlockDetailMap from '@/components/BlockDetailMap';

// ── Helper: Group apartments by room number (integer) ────────────────────────
// Using room number as key avoids label-mismatch between room_groups and apartments.

function groupApartmentsByRoom(apartments: ApartmentListItem[]): Record<number, ApartmentListItem[]> {
  const grouped: Record<number, ApartmentListItem[]> = {};
  apartments.forEach((apt) => {
    const key = apt.room ?? -1;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(apt);
  });
  return grouped;
}

// ── Loading Skeletons ────────────────────────────────────────────────────────

const HeroSkeleton = () => (
  <div className="relative h-[320px] md:h-[420px] overflow-hidden bg-muted">
    <Skeleton className="w-full h-full" />
    <div className="absolute top-4 left-0 right-0 max-w-[1400px] mx-auto px-4">
      <Skeleton className="h-6 w-24 mb-3" />
      <Skeleton className="h-4 w-64" />
    </div>
  </div>
);

const InfoCardSkeleton = () => (
  <div className="max-w-[1400px] mx-auto px-4 -mt-16 relative z-10">
    <div className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-12 w-32" />
          <Skeleton className="h-12 w-24" />
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-0 border border-border rounded-2xl overflow-hidden">
    {[1, 2, 3].map((i) => (
      <div key={i} className={i < 3 ? 'border-b border-border' : ''}>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32 hidden sm:block" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-5" />
        </div>
      </div>
    ))}
  </div>
);

const ZhkDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [liked, setLiked] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);
  const [aptViewMode, setAptViewMode] = useState<'table' | 'plans'>('table');

  // Fetch block detail
  const { block, loading: blockLoading, error: blockError } = useBlockDetail(slug);

  // Fetch apartments for this block (all, no filters initially)
  const { apartments, loading: apartmentsLoading } = useBlockApartments(slug, {}, 1, 5000);

  // Fetch similar blocks (exclude current block)
  const { blocks: allBlocks, loading: similarLoading } = useBlocks({}, 1, 4);
  const similarZhk = allBlocks.filter((b) => b.slug !== slug).slice(0, 4);

  // Group apartments by room number (integer key) for reliable matching
  const apartmentsByRoom = groupApartmentsByRoom(apartments);

  // Building id → name lookup map (populated once block loads)
  const buildingMap: Record<string, string> = Object.fromEntries(
    (block?.buildings || []).map((b) => [b.id, b.name])
  );

  // Map room_groups to display shape — carry room number for matching
  const apartmentTypes = block?.room_groups?.map((g) => ({
    room: g.room,              // integer key used for matching
    type: g.room_label,        // display label
    count: g.count,
    area: g.area_from && g.area_to
      ? `${formatArea(g.area_from)} – ${formatArea(g.area_to)}`
      : g.area_from
      ? `от ${formatArea(g.area_from)}`
      : '—',
    price: formatPrice(g.price_from),
  })) || [];

  // Loading state
  const loading = blockLoading || apartmentsLoading;

  // Error state
  if (blockError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[1400px] mx-auto px-4 py-20 text-center">
          <p className="text-red-500">{blockError}</p>
        </div>
        <FooterSection />
      </div>
    );
  }

  // Loading skeleton
  if (loading || !block) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <HeroSkeleton />
        <InfoCardSkeleton />
        <section className="py-8">
          <div className="max-w-[1400px] mx-auto px-4">
            <TableSkeleton />
          </div>
        </section>
        <FooterSection />
      </div>
    );
  }

  // Map block data to component props
  const heroImage = block.images && block.images.length > 0 ? block.images[0] : '';
  // Use deadline_at from BlockDetailResource (which comes from nearest_deadline_at)
  const deliveryDate = formatDeadline(block.deadline_at);
  const priceFrom = formatPrice(block.price_from);
  const pricePerM2 = block.price_per_m2_from
    ? `от ${block.price_per_m2_from.toLocaleString('ru-RU')} за м²`
    : '—';
  const quota = `${block.units_count.toLocaleString('ru-RU')} квартир`;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[320px] md:h-[420px] overflow-hidden">
          {heroImage ? (
            <img src={heroImage} alt={block.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-0 bg-foreground/40" />

          {/* Back + breadcrumb */}
          <div className="absolute top-4 left-0 right-0 max-w-[1400px] mx-auto px-4">
            <Link to="/catalog-zhk" className="inline-flex items-center gap-2 text-background text-sm hover:underline mb-3">
              <ArrowLeft className="w-4 h-4" /> Назад
            </Link>
            <div className="flex items-center gap-1.5 text-background/80 text-xs flex-wrap mt-2">
              <Link to="/" className="hover:text-background">Главная</Link>
              <ChevronRight className="w-3 h-3" />
              <span>Новостройки</span>
              <ChevronRight className="w-3 h-3" />
              <span>Объекты в Москве</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-background">{block.name}</span>
            </div>
          </div>

          {/* Video mini-block */}
          {block.images && block.images.length > 1 && (
            <div className="absolute bottom-6 right-6 hidden md:flex w-28 h-20 rounded-xl overflow-hidden border-2 border-background/50 cursor-pointer group">
              <img src={block.images[1]} alt="video" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center group-hover:bg-foreground/50 transition-colors">
                <Play className="w-6 h-6 text-background fill-background" />
              </div>
            </div>
          )}
        </div>

        {/* Info card overlapping hero */}
        <div className="max-w-[1400px] mx-auto px-4 -mt-16 relative z-10">
          <div className="bg-card rounded-2xl border border-border p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{block.name}</h1>
                {deliveryDate && (
                  <p className="text-sm text-primary mt-0.5">Сдача в эксплуатацию: {deliveryDate}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Стоимость квартир</p>
                  <p className="font-bold text-sm">{priceFrom}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ипотека</p>
                  <p className="font-bold text-sm">от 3%</p>
                </div>
                <button
                  onClick={() => setLiked(!liked)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors"
                >
                  <Heart className={cn("w-4 h-4", liked ? "fill-primary text-primary" : "text-muted-foreground")} />
                  <span className="hidden sm:inline">Добавить в избранное</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Apartment types + contact form */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: apartment table */}
            <div className="lg:col-span-2">
              {/* Header: title + view-mode toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <h2 className="text-lg md:text-xl font-bold">Стоимость квартир {priceFrom}</h2>
                <div className="flex items-center gap-3">
                  <span className="px-4 py-2 rounded-full bg-secondary text-sm font-medium">{pricePerM2}</span>
                  {/* Table / Plans toggle */}
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setAptViewMode('table')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                        aptViewMode === 'table' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      )}
                      title="Таблица"
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Таблица</span>
                    </button>
                    <button
                      onClick={() => setAptViewMode('plans')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                        aptViewMode === 'plans' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      )}
                      title="Планировки"
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Планировки</span>
                    </button>
                  </div>
                </div>
              </div>

              {apartmentsLoading ? (
                <TableSkeleton />
              ) : (
                <div className="space-y-0 border border-border rounded-2xl overflow-hidden">
                  {apartmentTypes.map((group, i) => {
                    const isExpanded = expandedRoom === group.room;
                    // Match apartments by room number (integer) — avoids label-mismatch
                    const flats = apartmentsByRoom[group.room] || [];
                    return (
                      <div key={i} className={cn(i < apartmentTypes.length - 1 && !isExpanded && "border-b border-border")}>
                        <div
                          className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                          onClick={() => setExpandedRoom(isExpanded ? null : group.room)}
                        >
                          <span className="font-medium text-sm w-28 shrink-0">{group.type}</span>
                          <span className="text-primary text-sm font-medium">{group.count} квартир</span>
                          <span className="text-sm text-muted-foreground hidden sm:block">{group.area}</span>
                          <span className="text-sm font-semibold">{group.price}</span>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-180")} />
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border">
                            {flats.length === 0 ? (
                              <p className="px-5 py-4 text-sm text-muted-foreground">Квартиры не найдены</p>
                            ) : aptViewMode === 'plans' ? (
                              /* ── Plans card grid view ─────────────────────── */
                              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {flats.map((flat) => {
                                  const bldName = buildingMap[flat.building?.id] ?? null;
                                  const priceText = flat.price
                                    ? flat.price.toLocaleString('ru-RU') + ' ₽'
                                    : 'Под запрос';
                                  return (
                                    <Link
                                      key={flat.id}
                                      to={`/object/${flat.id}`}
                                      className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                                    >
                                      {/* Plan image */}
                                      <div className="relative bg-muted aspect-square overflow-hidden">
                                        {flat.plan_url ? (
                                          <img
                                            src={flat.plan_url}
                                            alt="Plan"
                                            className="w-full h-full object-contain"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                            Нет плана
                                          </div>
                                        )}
                                      </div>

                                      {/* Card info */}
                                      <div className="p-3 flex flex-col gap-1.5">
                                        {/* Type + area */}
                                        <p className="text-sm font-semibold leading-tight">
                                          {flat.room_label ?? group.type}
                                          {flat.area?.total ? `, ${formatArea(flat.area.total)}` : ''}
                                        </p>

                                        {/* Price */}
                                        <p className="text-sm font-bold text-primary">{priceText}</p>

                                        {/* Floor / Building */}
                                        <p className="text-xs text-muted-foreground">
                                          {bldName ? `${bldName}, ` : ''}
                                          {flat.floor != null ? `этаж ${flat.floor}` : '—'}
                                        </p>

                                        {/* Finishing */}
                                        {flat.finishing?.name && (
                                          <p className="text-xs text-muted-foreground">{flat.finishing.name}</p>
                                        )}

                                        {/* Status badge */}
                                        <span className="mt-0.5 self-start px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-800">
                                          {flat.price ? 'Свободна' : 'Под запрос'}
                                        </span>
                                      </div>
                                    </Link>
                                  );
                                })}
                              </div>
                            ) : (
                              /* ── Table view ───────────────────────────────── */
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[860px]">
                                  <thead>
                                    <tr className="border-b border-border bg-secondary/30">
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-[52px]"></th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Корп.</th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Эт.</th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">№ кв.</th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">S прив.</th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">S кухни</th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Отделка</th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Цена</th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">За м²</th>
                                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Статус</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {flats.map((flat) => {
                                      const buildingName = buildingMap[flat.building?.id] ?? '—';
                                      return (
                                        <tr key={flat.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                                          <td className="px-3 py-2">
                                            <Link to={`/object/${flat.id}`}>
                                              {flat.plan_url ? (
                                                <img src={flat.plan_url} alt="План" className="w-10 h-10 rounded object-contain bg-muted" />
                                              ) : (
                                                <div className="w-10 h-10 rounded bg-muted" />
                                              )}
                                            </Link>
                                          </td>
                                          <td className="px-3 py-2 text-xs">
                                            <Link to={`/object/${flat.id}`} className="hover:text-primary">{buildingName}</Link>
                                          </td>
                                          <td className="px-3 py-2">
                                            <Link to={`/object/${flat.id}`} className="hover:text-primary">{flat.floor ?? '—'}</Link>
                                          </td>
                                          <td className="px-3 py-2 text-xs">
                                            <Link to={`/object/${flat.id}`} className="hover:text-primary">{flat.number ?? '—'}</Link>
                                          </td>
                                          <td className="px-3 py-2">
                                            <Link to={`/object/${flat.id}`} className="hover:text-primary">{formatArea(flat.area?.total)}</Link>
                                          </td>
                                          <td className="px-3 py-2">
                                            <Link to={`/object/${flat.id}`} className="hover:text-primary">{formatArea(flat.area?.kitchen)}</Link>
                                          </td>
                                          <td className="px-3 py-2 text-xs">
                                            <Link to={`/object/${flat.id}`} className="hover:text-primary">{flat.finishing?.name ?? '—'}</Link>
                                          </td>
                                          <td className="px-3 py-2 font-medium text-xs">
                                            <Link to={`/object/${flat.id}`} className="hover:text-primary">
                                              {flat.price ? `${flat.price.toLocaleString('ru-RU')} ₽` : 'Под запрос'}
                                            </Link>
                                          </td>
                                          <td className="px-3 py-2 text-xs">
                                            <Link to={`/object/${flat.id}`} className="hover:text-primary">
                                              {flat.price_per_meter ? `${Math.round(flat.price_per_meter).toLocaleString('ru-RU')} ₽` : '—'}
                                            </Link>
                                          </td>
                                          <td className="px-3 py-2">
                                            <Link to={`/object/${flat.id}`}>
                                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-800">
                                                Свободна
                                              </span>
                                            </Link>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <div className="flex justify-center py-3 border-t border-border">
                              <button
                                onClick={() => setExpandedRoom(null)}
                                className="px-6 py-2 rounded-xl bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                              >
                                Свернуть
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: contact form */}
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="font-semibold text-sm mb-1">Свяжитесь сейчас</p>
              <p className="text-xs text-muted-foreground mb-4">или оставьте заявку</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Ваше имя"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 px-3 py-2.5 rounded-xl border border-border text-sm bg-background shrink-0">
                    🇷🇺
                  </span>
                  <input
                    type="tel"
                    placeholder="+7 900 121 46 07"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm shrink-0">→</button>
                </div>
                <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium">
                  Отправить заявку
                </button>
              </div>
              <div className="flex gap-2 mt-4 justify-center">
                {['VK', 'TG', 'YT', 'OK'].map((s) => (
                  <a key={s} href="#" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                    {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About project */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-2xl overflow-hidden">
              {block.images && block.images.length > 2 ? (
                <img src={block.images[2]} alt={block.name} className="w-full h-full object-cover min-h-[300px]" />
              ) : (
                <div className="w-full h-[300px] bg-muted" />
              )}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold mb-4">О проекте</h2>
              {block.description ? (
                <div
                  className="text-sm text-muted-foreground mb-3 leading-relaxed prose prose-sm max-w-none [&_p]:mb-3 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: block.description }}
                />
              ) : (
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  Информация о проекте будет добавлена позже.
                </p>
              )}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-secondary rounded-2xl p-4 text-center">
                  <Building className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Квота</p>
                  <p className="font-bold text-sm">{quota}</p>
                </div>
                <div className="bg-secondary rounded-2xl p-4 text-center">
                  <Layers className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Этажность</p>
                  <p className="font-bold text-sm">
                    {block.buildings && block.buildings.length > 0
                      ? `${block.buildings[0].floors_total || '—'} этажей`
                      : '—'}
                  </p>
                </div>
                <div className="bg-secondary rounded-2xl p-4 text-center">
                  <Maximize className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Площадь</p>
                  <p className="font-bold text-sm">
                    {block.area_from && block.area_to
                      ? `${formatArea(block.area_from)} – ${formatArea(block.area_to)}`
                      : block.area_from
                      ? `от ${formatArea(block.area_from)}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Infrastructure */}
      {block.images && block.images.length > 3 && (
        <section className="py-8">
          <div className="max-w-[1400px] mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Инфраструктура ЖК</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              Инфраструктура жилого комплекса включает современные удобства для комфортной жизни.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Accent card */}
              <div className="bg-primary rounded-2xl p-6 flex flex-col justify-between min-h-[200px] sm:row-span-2">
                <div>
                  <span className="px-3 py-1 bg-primary-foreground/20 text-primary-foreground rounded-full text-xs font-medium">Особенности</span>
                </div>
                <p className="text-primary-foreground text-sm leading-relaxed mt-4">
                  Проект получил свое название, благодаря своей внутренней инфраструктуре, террасе с бассейном на крыше, фитнесу, сауне.
                </p>
              </div>

              {block.images.slice(3, 6).map((img, i) => (
                <div key={i} className="rounded-2xl overflow-hidden relative group cursor-pointer">
                  <img src={img} alt={`Инфраструктура ${i + 1}`} className="w-full h-full object-cover min-h-[160px] group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Map */}
      {block.geo?.lat && block.geo?.lng && (
        <section className="py-8">
          <div className="max-w-[1400px] mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold mb-4">На карте</h2>
            <div className="rounded-2xl overflow-hidden" style={{ height: '460px' }}>
              <BlockDetailMap lat={block.geo.lat} lng={block.geo.lng} name={block.name} />
            </div>
          </div>
        </section>
      )}

      {/* Developer */}
      {block.builder_info && (
        <section className="py-8">
          <div className="max-w-[1400px] mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-bold mb-4">О застройщике</h2>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed max-w-3xl">
              {block.builder_info.name}
            </p>
          </div>
        </section>
      )}

      {/* Similar ZHK */}
      <section className="py-8">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Похожие объекты</h2>
            <Link to="/catalog-zhk" className="text-primary text-sm font-medium hover:underline">Все предложения →</Link>
          </div>
          {similarLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border" style={{ height: '420px' }}>
                  <Skeleton className="w-full" style={{ height: '250px' }} />
                  <div className="p-4">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-4 w-1/3 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarZhk.map((zhk) => (
                <ZhkCard key={zhk.slug} data={zhk} />
              ))}
            </div>
          )}
        </div>
      </section>

      <AdditionalFeatures />
      <LatestNews />
      <ContactsSection />
      <FooterSection />
    </div>
  );
};

export default ZhkDetail;
