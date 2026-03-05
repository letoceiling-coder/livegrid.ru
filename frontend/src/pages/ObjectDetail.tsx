import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight, Building2, Send, GitCompare, Presentation,
  Printer, Download, Home, Phone, MessageSquare, ChevronDown,
  Layers, MapPin, X, ZoomIn, ChevronLeft,
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import BlockDetailMap from '@/components/BlockDetailMap';
import { useApartmentDetail } from '@/hooks/useApartmentDetail';
import { formatDeadline, formatArea } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPrice(p: number | null | undefined): string {
  if (!p) return 'Под запрос';
  return p.toLocaleString('ru-RU') + ' ₽';
}

function fmtPricePerM2(p: number | null | undefined): string {
  if (!p) return '—';
  return p.toLocaleString('ru-RU') + ' ₽/м²';
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

const PageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <div className="max-w-[1200px] mx-auto px-4 py-4">
      <Skeleton className="h-4 w-64 mb-6" />
      <Skeleton className="h-8 w-96 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[440px] rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>
    </div>
    <FooterSection />
  </div>
);

// ── Passport row ──────────────────────────────────────────────────────────────

const PassportRow = ({
  label,
  value,
  badge,
}: {
  label: string;
  value?: React.ReactNode;
  badge?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-0">
    <span className="text-sm text-muted-foreground shrink-0">{label}</span>
    <span className="text-sm font-medium text-right">{badge ?? value ?? '—'}</span>
  </div>
);

// ── Gallery ───────────────────────────────────────────────────────────────────

type GalleryTab = 'photos' | 'plan';

interface GalleryProps {
  photos: string[];
  planUrl: string | null;
  title: string;
}

const ApartmentGallery = ({ photos, planUrl, title }: GalleryProps) => {
  const [tab, setTab] = useState<GalleryTab>(photos.length > 0 ? 'photos' : planUrl ? 'plan' : 'photos');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: photos.length > 1 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo   = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  const lightboxSlides = photos.map(src => ({ src }));

  const openLightbox = (i: number) => {
    setLightboxIndex(i);
    setLightboxOpen(true);
  };

  const currentImages = tab === 'photos' ? photos : (planUrl ? [planUrl] : []);

  return (
    <div>
      {/* Tab buttons */}
      {photos.length > 0 && planUrl && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab('photos')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors',
              tab === 'photos'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-secondary',
            )}
          >
            <Home className="w-3.5 h-3.5" />
            Фото
          </button>
          <button
            onClick={() => setTab('plan')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors',
              tab === 'plan'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:bg-secondary',
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            Поэтажный план
          </button>
        </div>
      )}

      {/* Main viewer */}
      {tab === 'photos' && photos.length > 0 ? (
        <div className="relative">
          <div className="overflow-hidden rounded-2xl bg-muted" style={{ height: '400px' }} ref={emblaRef}>
            <div className="flex h-full">
              {photos.map((src, i) => (
                <div
                  key={i}
                  className="relative min-w-full h-full cursor-zoom-in"
                  onClick={() => openLightbox(i)}
                >
                  <img
                    src={src}
                    alt={`${title} — фото ${i + 1}`}
                    className="w-full h-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                  {/* Zoom hint */}
                  <div className="absolute bottom-3 right-3 bg-black/50 rounded-full p-1.5">
                    <ZoomIn className="w-4 h-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={scrollPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={scrollNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Counter */}
          {photos.length > 1 && (
            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-10">
              {selectedIndex + 1} / {photos.length}
            </div>
          )}

          {/* Thumbnails */}
          {photos.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {photos.map((src, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  className={cn(
                    'shrink-0 rounded-lg overflow-hidden border-2 transition-colors',
                    i === selectedIndex ? 'border-primary' : 'border-transparent hover:border-primary/40',
                  )}
                  style={{ width: '72px', height: '54px' }}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'plan' && planUrl ? (
        /* Floor plan */
        <div
          className="relative rounded-2xl bg-muted overflow-hidden cursor-zoom-in"
          style={{ height: '400px' }}
          onClick={() => {
            setLightboxIndex(0);
            setLightboxOpen(true);
          }}
        >
          <img
            src={planUrl}
            alt={`${title} — поэтажный план`}
            className="w-full h-full object-contain p-4"
          />
          <div className="absolute bottom-3 right-3 bg-black/50 rounded-full p-1.5">
            <ZoomIn className="w-4 h-4 text-white" />
          </div>
          <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Поэтажный план
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl bg-muted flex items-center justify-center"
          style={{ height: '400px' }}
        >
          <div className="text-center text-muted-foreground">
            <Home className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Фото отсутствуют</p>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={tab === 'photos' ? lightboxSlides : planUrl ? [{ src: planUrl }] : []}
        plugins={[Zoom]}
        render={{
          iconClose: () => <X className="w-6 h-6" />,
        }}
      />

      {/* If only plan_url, show Plan tab button */}
      {photos.length === 0 && planUrl && (
        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">Нажмите на план для увеличения</p>
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const ObjectDetail = () => {
  const { slug, id } = useParams<{ slug?: string; id?: string }>();
  const apartmentId = id ?? slug;
  const [inComparison, setInComparison] = useState(false);

  const { apartment, loading, error } = useApartmentDetail(apartmentId);

  if (loading) return <PageSkeleton />;

  if (error || !apartment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[1200px] mx-auto px-4 py-20 text-center">
          <p className="text-destructive text-lg">{error || 'Квартира не найдена'}</p>
          <Link to="/catalog" className="mt-4 inline-block text-primary hover:underline">
            ← Назад к каталогу
          </Link>
        </div>
        <FooterSection />
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const roomLabel =
    apartment.room_label ??
    (apartment.room === 0 ? 'Студия' : apartment.room != null ? `${apartment.room}-к. кв.` : 'Квартира');

  const areaTotal   = apartment.area?.total ?? null;
  const areaGiven   = apartment.area?.given ? parseFloat(String(apartment.area.given)) : null;
  const areaKitchen = apartment.area?.kitchen ?? null;
  const areaLiving  = apartment.area?.living ?? null;

  const blockName    = apartment.block?.name ?? '—';
  const blockSlug    = apartment.block?.id ?? '';
  const builderName  = apartment.block?.builder?.name ?? null;
  const districtName = apartment.block?.district?.name ?? null;
  const lat          = apartment.block?.geo?.lat ?? null;
  const lng          = apartment.block?.geo?.lng ?? null;
  const blockImages  = apartment.block?.images ?? [];
  const blockAddress = apartment.block?.address ?? null;
  const blockDesc    = apartment.block?.description ?? null;

  const deadline      = formatDeadline(apartment.building?.deadline_at);
  const buildingName  = apartment.building?.name ?? null;
  const buildingQueue = apartment.building?.queue ?? null;
  const buildingFloors = apartment.building?.floors_total ?? apartment.floors_total ?? null;

  const finishingName = apartment.finishing?.name ?? null;
  const buildingType  = apartment.building_type?.name ?? null;

  const pageTitle = `${roomLabel}. ЖК ${blockName}`;

  // Gallery: block images first, plan_url as separate tab
  const photos = blockImages.filter(Boolean) as string[];
  const planUrl = apartment.plan_url ?? null;

  // Status
  const isAvailable = apartment.price != null;
  const statusLabel = isAvailable ? 'Свободна' : 'Под запрос';
  const statusClass = isAvailable
    ? 'bg-green-50 border-green-200 text-green-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <div className="border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <Link to="/" className="hover:text-primary">Главная</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link to="/catalog-zhk" className="hover:text-primary">Новостройки</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link to={`/complex/${blockSlug}`} className="hover:text-primary">{blockName}</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-foreground">
              {roomLabel}{areaTotal ? `, ${formatArea(areaTotal)}` : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-4">

        {/* ── Title ────────────────────────────────────────────────────────── */}
        <h1 className="text-xl md:text-2xl font-bold leading-tight mb-4">{pageTitle}</h1>

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            to={`/complex/${blockSlug}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm transition-colors"
          >
            <Building2 className="w-4 h-4" />
            Страница ЖК
          </Link>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm transition-colors"
            title="Отправить клиенту"
          >
            <Send className="w-4 h-4" />
            Отправить клиенту
          </button>
          <button
            onClick={() => setInComparison(!inComparison)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors',
              inComparison
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-card hover:bg-secondary',
            )}
            title="В сравнение"
          >
            <GitCompare className="w-4 h-4" />
            {inComparison ? 'В сравнении' : 'В сравнение'}
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm transition-colors"
            title="В презентацию"
          >
            <Presentation className="w-4 h-4" />
            В презентацию
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm transition-colors"
            title="Распечатать"
          >
            <Printer className="w-4 h-4" />
            Распечатать
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-secondary text-sm transition-colors"
            title="Скачать"
          >
            <Download className="w-4 h-4" />
            Скачать
          </button>
        </div>

        {/* ── Main 2-column layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Left: Gallery */}
          <ApartmentGallery photos={photos} planUrl={planUrl} title={pageTitle} />

          {/* Right: Price + Passport */}
          <div className="space-y-4">

            {/* Price card */}
            <div className="border border-border rounded-xl p-4 bg-card">
              <p className="text-xs text-muted-foreground mb-0.5">Цена, 100% оплата</p>
              <p className="text-2xl font-bold text-primary">{fmtPrice(apartment.price)}</p>
              {apartment.price_per_meter != null && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {fmtPricePerM2(apartment.price_per_meter)}
                </p>
              )}
            </div>

            {/* Highlights */}
            <div className="grid grid-cols-1 gap-2">
              <div className="border border-border rounded-xl p-3 bg-card flex items-center gap-3">
                <span className="text-lg shrink-0">🔥</span>
                <div>
                  <p className="text-xs font-medium">Акции и скидки</p>
                  <p className="text-xs text-muted-foreground">Уточняйте у менеджера</p>
                </div>
              </div>
              <div className="border border-border rounded-xl p-3 bg-card flex items-center gap-3">
                <span className="text-lg shrink-0">🏦</span>
                <div>
                  <p className="text-xs font-medium">Ипотека</p>
                  <p className="text-xs text-muted-foreground">Доступны программы</p>
                </div>
              </div>
              <div className="border border-border rounded-xl p-3 bg-card flex items-center gap-3">
                <span className="text-lg shrink-0">📋</span>
                <div>
                  <p className="text-xs font-medium">Рассрочки</p>
                  <p className="text-xs text-muted-foreground">Уточните у менеджера</p>
                </div>
              </div>
            </div>

            {/* Apartment passport */}
            <div className="border border-border rounded-xl p-4 bg-card">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Параметры квартиры
              </h3>
              <PassportRow
                label="Статус"
                badge={
                  <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium border', statusClass)}>
                    {statusLabel}
                  </span>
                }
              />
              <PassportRow label="Цена за м²" value={fmtPricePerM2(apartment.price_per_meter)} />
              {areaTotal != null && <PassportRow label="S общая" value={formatArea(areaTotal)} />}
              {areaGiven != null && areaGiven > 0 && (
                <PassportRow label="S приведённая" value={formatArea(areaGiven)} />
              )}
              {areaLiving != null && areaLiving > 0 && (
                <PassportRow label="S жилая" value={formatArea(areaLiving)} />
              )}
              {areaKitchen != null && areaKitchen > 0 && (
                <PassportRow label="S кухни" value={formatArea(areaKitchen)} />
              )}
              {apartment.number && (
                <PassportRow label="Номер квартиры" value={apartment.number} />
              )}
              {apartment.wc_count != null && (
                <PassportRow label="Санузлы" value={String(apartment.wc_count)} />
              )}
              <PassportRow
                label="Этаж / Этажность"
                value={
                  apartment.floor && buildingFloors
                    ? `${apartment.floor} / ${buildingFloors}`
                    : apartment.floor
                    ? `${apartment.floor}`
                    : '—'
                }
              />
              {finishingName && <PassportRow label="Отделка" value={finishingName} />}
              {buildingType && <PassportRow label="Тип дома" value={buildingType} />}
            </div>

            {/* CTA buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary text-sm font-medium transition-colors">
                <Phone className="w-4 h-4" />
                Контакты
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                <MessageSquare className="w-4 h-4" />
                Забронировать
              </button>
            </div>
          </div>
        </div>

        {/* ── Map + Building characteristics ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Map */}
          <div>
            <div className="rounded-xl overflow-hidden border border-border" style={{ height: '400px' }}>
              {lat && lng ? (
                <BlockDetailMap lat={lat} lng={lng} name={blockName} />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Карта недоступна</p>
                  </div>
                </div>
              )}
            </div>
            {(blockAddress || districtName) && (
              <div className="mt-2 px-1 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {blockAddress ?? [districtName, blockName].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Building characteristics */}
          <div className="border border-border rounded-xl p-4 bg-card">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Характеристики корпуса
            </h3>
            {deadline !== '—' && <PassportRow label="Срок сдачи" value={deadline} />}
            {builderName && <PassportRow label="Застройщик" value={builderName} />}
            {buildingName && <PassportRow label="Корпус" value={buildingName} />}
            {buildingQueue != null && (
              <PassportRow label="Очередь" value={`${buildingQueue} очередь`} />
            )}
            {buildingType && <PassportRow label="Тип дома" value={buildingType} />}
            {buildingFloors != null && (
              <PassportRow label="Этажность" value={`${buildingFloors} эт.`} />
            )}
            {apartment.building?.height != null && (
              <PassportRow label="Высота здания" value={`${apartment.building.height} м`} />
            )}
            {districtName && <PassportRow label="Район" value={districtName} />}
            {blockAddress && <PassportRow label="Адрес" value={blockAddress} />}
          </div>
        </div>

        {/* ── Finishing ──────────────────────────────────────────────────────── */}
        {finishingName && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Отделка</h2>
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-card">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Home className="w-6 h-6 opacity-30" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{finishingName}</p>
                  <span className="mt-1 inline-block text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                    Учтена в цене
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── About complex ─────────────────────────────────────────────────── */}
        {blockDesc && (
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">О комплексе</h2>
            <div className="border border-border rounded-xl p-4 bg-card">
              <div 
                className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: blockDesc }}
              />
            </div>
          </div>
        )}

        {/* ── Mortgage ──────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Ипотека</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              { icon: '📊', label: 'Программы и ставки' },
              { icon: '💬', label: 'Задать вопрос' },
              { icon: '📝', label: 'Заявка на ипотеку' },
            ].map(({ icon, label }) => (
              <button
                key={label}
                className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-secondary text-sm font-medium transition-colors"
              >
                <span className="text-2xl">{icon}</span>
                {label}
              </button>
            ))}
          </div>
          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {[
              { name: 'Семейная ипотека', banks: 'Несколько банков', rate: 'от 5.75%', pv: 'от 20%' },
              { name: 'Стандартная новостройка', banks: 'Несколько банков', rate: 'от 18.39%', pv: 'от 20%' },
            ].map(prog => (
              <div key={prog.name} className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card/50">
                <div>
                  <p className="font-medium text-sm">{prog.name}</p>
                  <p className="text-xs text-muted-foreground">{prog.banks}</p>
                </div>
                <div className="flex items-center gap-6 text-sm shrink-0">
                  <div>
                    <p className="text-xs text-muted-foreground">Ставка</p>
                    <p className="font-semibold">{prog.rate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ПВ</p>
                    <p className="font-semibold">{prog.pv}</p>
                  </div>
                  <button className="px-2 py-1 rounded-lg border border-border bg-card hover:bg-secondary transition-colors">
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30">
              Обратитесь к менеджеру для подбора ипотеки
            </div>
          </div>
        </div>

        {/* ── Installments ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Рассрочки</h2>
          <div className="border border-border rounded-xl p-4 bg-card">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <p className="font-medium text-sm mb-2">
                  Рассрочка с ежемесячными платежами до 24 месяцев
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-secondary rounded-full text-xs">От 1 года</span>
                </div>
              </div>
              <div className="flex gap-6 text-sm shrink-0">
                <div>
                  <p className="text-xs text-muted-foreground">ПВ</p>
                  <p className="font-semibold">от 30%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Срок</p>
                  <p className="font-semibold">до 2 лет</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-border text-center">
              <p className="text-sm text-muted-foreground mb-2">Рассрочки имеют особенности расчёта</p>
              <button className="text-sm text-primary hover:underline">
                Чат с менеджером
              </button>
            </div>
          </div>
        </div>

      </div>

      <FooterSection />
    </div>
  );
};

export default ObjectDetail;
