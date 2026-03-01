import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Search, SlidersHorizontal, Grid3X3, List } from 'lucide-react';
import Header from '@/components/Header';
import ZhkCard, { type ZhkData } from '@/components/ZhkCard';
import ZhkCardRow from '@/components/ZhkCardRow';
import PropertyGridSection from '@/components/PropertyGridSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';
import { getBlocks, type BlockListItem } from '@/lib/blocks-api';

const placeholders = [building1, building2, building3, building4];

function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    return `от ${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн`;
  }
  if (value >= 1_000) {
    return `от ${(value / 1_000).toFixed(0)} тыс`;
  }
  return `от ${value}`;
}

function blockToZhkData(block: BlockListItem, imagePlaceholder: string): ZhkData {
  const images = block.images?.length
    ? block.images.filter((u): u is string => typeof u === 'string' && (u.startsWith('http') || u.startsWith('/')))
    : [];
  const price = block.price_from != null ? formatPrice(block.price_from) : '—';
  const unitsCount = `В продаже ${block.units_count} ${block.units_count === 1 ? 'квартира' : block.units_count < 5 ? 'квартиры' : 'квартир'}`;
  const badges: string[] = [];
  if (block.deadline_label) badges.push(block.deadline_label);
  const apartments = block.price_from != null
    ? [{ type: 'Квартиры', area: '—', price: formatPrice(block.price_from) }]
    : [];
  
  // Формируем полный адрес: район + адрес
  const addressParts: string[] = [];
  if (block.district?.name) addressParts.push(block.district.name);
  if (block.address) addressParts.push(block.address);
  const fullAddress = addressParts.length ? addressParts.join(', ') : undefined;
  
  // Определяем статус: если срок сдачи в прошлом — «Сдан», иначе — deadline_label
  const now = new Date();
  const deadlineDate = block.deadline_at ? new Date(block.deadline_at) : null;
  const isBuildingCompleted = deadlineDate && deadlineDate < now;
  const statusText = isBuildingCompleted ? 'Сдан' : (block.deadline_label || undefined);
  const statusLabel = block.deadline_label || undefined;
  
  // Метро (первые 3)
  const subways = block.subways?.slice(0, 3);

  // Цены по типам комнат
  const roomPrices = block.room_prices;
  
  return {
    images: images.length ? images : [imagePlaceholder],
    name: block.name ?? 'ЖК',
    price,
    unitsCount,
    badges,
    apartments,
    slug: block.id,
    address: fullAddress,
    builderName: block.builder?.name,
    statusLabel,
    statusText,
    subways,
    priceRaw: block.price_from ?? undefined,
    roomPrices,
  };
}

const filterCategories = ['Тд недвижимости', 'Цена', 'Площадь', 'Срок сдачи'];

const ITEMS_PER_PAGE_OPTIONS = [50, 80, 100];

const CatalogZhkPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [list, setList] = useState<ZhkData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getBlocks({ page: currentPage, per_page: perPage, sort: 'price_from', order: 'asc' })
      .then((res) => {
        const placeholder = placeholders[0];
        setList((res.data || []).map((b) => blockToZhkData(b, placeholder)));
        setTotalPages(res.meta?.last_page ?? 1);
        setTotalItems(res.meta?.total ?? 0);
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Ошибка загрузки');
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [currentPage, perPage]);

  const pageNumbers = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1;
    if (currentPage <= 4) return i + 1;
    if (currentPage >= totalPages - 3) return totalPages - 6 + i;
    return currentPage - 3 + i;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page title + location */}
      <section className="py-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold">
              Каталог объектов в{' '}
              <button className="text-primary inline-flex items-center gap-1 underline decoration-primary underline-offset-4">
                Москве <ChevronDown className="w-5 h-5" />
              </button>
            </h1>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
                <MapPin className="w-4 h-4" /> На карте
              </button>
              <button className="px-4 py-2 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
                Все предложения
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters bar */}
      <section className="pb-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            {filterCategories.map((f, i) => (
              <button
                key={i}
                className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors min-w-[140px]"
              >
                <span className="text-muted-foreground">{f}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> Фильтры
            </button>
            <div className="flex items-center gap-1 border border-border rounded-full p-1 ml-auto">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center' : 'w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors'}
                title="Плитка"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center' : 'w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors'}
                title="Строки"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium whitespace-nowrap">
              <Search className="w-4 h-4 inline mr-1.5" />
              Найти {totalItems} объект{totalItems === 1 ? '' : totalItems < 5 ? 'а' : 'ов'}
            </button>
          </div>
        </div>
      </section>

      {/* ZhK Grid */}
      <section className="pb-8">
        <div className="max-w-[1400px] mx-auto px-4">
          {error && (
            <div className="rounded-xl border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}
          {loading ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse" style={{ height: '420px' }}>
                    <div className="h-[250px] bg-muted" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                    <div className="w-[280px] h-[220px] bg-muted shrink-0" />
                    <div className="flex-1 p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {list.map((zhk) => (
                <ZhkCardRow key={zhk.slug ?? zhk.name} data={zhk} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {list.map((zhk) => (
                <ZhkCard key={zhk.slug ?? zhk.name} data={zhk} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pagination */}
      <section className="pb-10">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Page numbers */}
            <div className="flex items-center gap-2">
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    p === currentPage
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-secondary'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium ml-2"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Следующая →
              </button>
            </div>

            {/* Per page */}
            <div className="flex items-center gap-2">
              {ITEMS_PER_PAGE_OPTIONS.map(n => (
                <button
                  key={n}
                  onClick={() => { setPerPage(n); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    n === perPage
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-secondary'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Показано {list.length} из {totalItems} в Москве и области
          </p>
        </div>
      </section>

      {/* Start Sales */}
      <PropertyGridSection title="Старт продаж" type="start" />

      {/* About Platform */}
      <AboutPlatform />

      {/* Additional Features */}
      <AdditionalFeatures />

      {/* Latest News */}
      <LatestNews />

      {/* Contacts */}
      <ContactsSection />

      {/* Footer */}
      <FooterSection />
    </div>
  );
};

export default CatalogZhkPage;
