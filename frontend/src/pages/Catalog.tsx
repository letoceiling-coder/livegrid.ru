import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Grid3X3, List, ChevronDown } from 'lucide-react';
import Header from '@/components/Header';
import FooterSection from '@/components/FooterSection';
import PropertyCard, { type PropertyData } from '@/components/PropertyCard';
import PropertyGridSection from '@/components/PropertyGridSection';
import QuizSection from '@/components/QuizSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
} from '@/components/ui/pagination';
import building1 from '@/assets/building1.jpg';
import building2 from '@/assets/building2.jpg';
import building3 from '@/assets/building3.jpg';
import building4 from '@/assets/building4.jpg';
import { cn } from '@/lib/utils';
import { getApartments, type ApartmentListItem } from '@/lib/apartments-api';

const images = [building1, building2, building3, building4];

function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)} тыс`;
  }
  return String(value);
}

function apartmentToProperty(item: ApartmentListItem, imagePlaceholder: string): PropertyData {
  const areaTotal = item.area?.total;
  const address = [item.block?.district?.name, item.block?.builder?.name].filter(Boolean).join(', ') || '—';
  const badges: string[] = [];
  if (item.building?.deadline_at) {
    const y = item.building.deadline_at.slice(0, 4);
    badges.push(`Сдача ${y}`);
  }
  return {
    image: (item.plan_url && (item.plan_url.startsWith('http') || item.plan_url.startsWith('/'))) ? item.plan_url : imagePlaceholder,
    title: item.block?.name ?? 'Объект',
    price: formatPrice(Number(item.price)),
    address,
    area: areaTotal != null ? `${Math.round(areaTotal)} м²` : undefined,
    rooms: item.room_label,
    badges: badges.length ? badges : undefined,
    slug: item.id,
  };
}

/* ── filter data ── */
const filterSections = [
  { title: 'События', items: ['Дома', 'Квартиры', 'Кондоминиумы', 'Земельные участки', 'Таунхаусы', 'Виллы', 'Коттеджи', 'Шале', 'Острова'] },
  { title: 'Тип недвижимости', items: ['Новостройки', 'Вторичные', 'Доступные квартиры'] },
  { title: 'Район', items: ['Джомтьен', 'Центральная Паттайя', 'Пратамнак', 'Южная Паттайя', 'Восточная Паттайя', 'Вонгамат', 'Северная Паттайя', 'Банг Сарай', 'Восточный Джомтьен, Хуай Яй', 'На Джомтьен', 'Баан Амфур', 'Восточная Наклуа', 'Шоссе 36', 'Мабпрахан', 'Наклуа', 'Laem Mae Phim Beach', 'Baan Dusit', 'Cozy Beach', 'Khamala Beach', 'Nai Yang', 'Лаем-Чабанг', 'Теппразит'] },
  { title: 'Спальни', items: ['Студия', '1+', '2+', '3+', '4+', '5+'] },
  { title: 'Ванные', items: ['1+', '2+', '3+', '4+'] },
];

const perPageOptions = [15, 30, 50, 100];
const tabs = ['Объекты', 'Избранное'];
const viewTabs = ['Квартиры', 'Паркинги', 'Участки', 'Дома', 'Коммерческая'];

const Catalog = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [activeTab, setActiveTab] = useState(0);
  const [activeViewTab, setActiveViewTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'area_total' | 'building_deadline_at' | 'floor'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [list, setList] = useState<PropertyData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getApartments({
      page: currentPage,
      per_page: perPage,
      sort: sortBy,
      order: sortOrder,
    })
      .then((res) => {
        const placeholder = images[0];
        setList((res.data || []).map((item) => apartmentToProperty(item, placeholder)));
        setTotalPages(res.meta?.last_page ?? 1);
        setTotal(res.meta?.total ?? 0);
      })
      .catch((err) => {
        setError(err?.response?.data?.message ?? err?.message ?? 'Ошибка загрузки');
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [currentPage, perPage, sortBy, sortOrder]);

  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  const paged = list;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* BLOCK 1 — Top bar */}
      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-4">
          {tabs.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "text-lg font-bold pb-1 border-b-2 transition-colors",
                i === activeTab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >{t}</button>
          ))}
        </div>

        {/* Search + filter + sort + view */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex items-center bg-background rounded-full px-4 py-2.5 border border-border">
            <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
            <input type="text" placeholder="Поиск по сайту" className="bg-transparent outline-none w-full text-sm" />
          </div>
          <button
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0 lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm hover:bg-secondary transition-colors"
            >
              Сортировка <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute top-full mt-1 right-0 bg-card border border-border rounded-xl shadow-lg z-30 py-1 min-w-[180px]">
                {[
                  { label: 'По цене ↑', sort: 'price' as const, order: 'asc' as const },
                  { label: 'По цене ↓', sort: 'price' as const, order: 'desc' as const },
                  { label: 'По площади', sort: 'area_total' as const, order: 'asc' as const },
                  { label: 'По дате', sort: 'building_deadline_at' as const, order: 'asc' as const },
                ].map((s, i) => (
                  <button key={i} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors" onClick={() => { setSortBy(s.sort); setSortOrder(s.order); setSortOpen(false); }}>{s.label}</button>
                ))}
              </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1 border border-border rounded-full p-1">
            <button className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          {viewTabs.map((vt, i) => (
            <button
              key={i}
              onClick={() => setActiveViewTab(i)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                i === activeViewTab ? "bg-primary text-primary-foreground" : "bg-background border border-border hover:bg-secondary"
              )}
            >{vt}</button>
          ))}
        </div>
      </div>

      {/* BLOCK 2 & 3 — Sidebar + Grid */}
      <div className="max-w-[1400px] mx-auto px-4 pb-8">
        <div className="flex gap-6">
          {/* Left sidebar filters — desktop */}
          <aside className={cn(
            "w-[240px] shrink-0 space-y-6 hidden lg:block",
          )}>
            {filterSections.map((section, si) => (
              <div key={si}>
                <h3 className="font-bold text-sm mb-3">{section.title}</h3>
                <div className="space-y-2.5">
                  {section.items.map((item, ii) => {
                    const key = `${si}-${ii}`;
                    return (
                      <label key={ii} className="flex items-center gap-2.5 cursor-pointer text-sm">
                        <Checkbox
                          checked={!!checked[key]}
                          onCheckedChange={() => toggle(key)}
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* Mobile filter offcanvas */}
          {showFilters && (
            <div className="fixed inset-0 z-[90] bg-background overflow-y-auto lg:hidden">
              <div className="px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-bold">Фильтры</span>
                  <button className="text-sm font-medium text-primary" onClick={() => setShowFilters(false)}>Закрыть ✕</button>
                </div>
                {filterSections.map((section, si) => (
                  <div key={si} className="mb-6">
                    <h3 className="font-bold text-sm mb-3">{section.title}</h3>
                    <div className="space-y-2.5">
                      {section.items.map((item, ii) => {
                        const key = `${si}-${ii}`;
                        return (
                          <label key={ii} className="flex items-center gap-2.5 cursor-pointer text-sm">
                            <Checkbox checked={!!checked[key]} onCheckedChange={() => toggle(key)} />
                            {item}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button className="w-full bg-primary text-primary-foreground py-3 rounded-full font-medium text-sm" onClick={() => setShowFilters(false)}>
                  Применить
                </button>
              </div>
            </div>
          )}

          {/* Property grid */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
                    <div className="h-[280px] bg-muted" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {paged.map((p, i) => (
                  <PropertyCard key={p.slug ?? i} data={p} />
                ))}
              </div>
            )}

            {/* BLOCK 4 — Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
              <Pagination>
                <PaginationContent>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === i + 1}
                        onClick={(e) => { e.preventDefault(); setCurrentPage(i + 1); }}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Показывать:</span>
                <div className="relative">
                  <select
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="appearance-none bg-background border border-border rounded-lg px-3 py-1.5 pr-8 text-sm cursor-pointer"
                  >
                    {perPageOptions.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCK 5 — Hot deals */}
      <PropertyGridSection title="Горячие предложения" type="hot" />

      {/* BLOCK 6 — Quiz */}
      <QuizSection />

      {/* BLOCK 7 — About platform */}
      <AboutPlatform />

      {/* BLOCK 8 — Additional features */}
      <AdditionalFeatures />

      {/* BLOCK 9 — Latest news */}
      <LatestNews />

      {/* BLOCK 10 — Contacts */}
      <ContactsSection />

      <FooterSection />
    </div>
  );
};

export default Catalog;
