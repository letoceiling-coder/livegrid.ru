import { useState } from 'react';
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

/* ── filter data ── */
const filterSections = [
  { title: 'События', items: ['Дома', 'Квартиры', 'Кондоминиумы', 'Земельные участки', 'Таунхаусы', 'Виллы', 'Коттеджи', 'Шале', 'Острова'] },
  { title: 'Тип недвижимости', items: ['Новостройки', 'Вторичные', 'Доступные квартиры'] },
  { title: 'Район', items: ['Джомтьен', 'Центральная Паттайя', 'Пратамнак', 'Южная Паттайя', 'Восточная Паттайя', 'Вонгамат', 'Северная Паттайя', 'Банг Сарай', 'Восточный Джомтьен, Хуай Яй', 'На Джомтьен', 'Баан Амфур', 'Восточная Наклуа', 'Шоссе 36', 'Мабпрахан', 'Наклуа', 'Laem Mae Phim Beach', 'Baan Dusit', 'Cozy Beach', 'Khamala Beach', 'Nai Yang', 'Лаем-Чабанг', 'Теппразит'] },
  { title: 'Спальни', items: ['Студия', '1+', '2+', '3+', '4+', '5+'] },
  { title: 'Ванные', items: ['1+', '2+', '3+', '4+'] },
];

/* ── mock properties ── */
const images = [building1, building2, building3, building4];

const allProperties: PropertyData[] = Array.from({ length: 60 }, (_, i) => ({
  image: images[i % 4],
  title: ['ЖК Снегири', 'КП Черкизово', 'ЖК Смородина', 'Таунхаусы в центре'][i % 4],
  price: ['от 5.6 млн', 'от 16.6 млн', 'от 3.8 млн', 'от 32.8 млн'][i % 4],
  address: ['Москва, ул. Снежная 12', 'МО, д. Черкизово', 'Москва, ул. Ягодная 5', 'Москва, Центральный р-н'][i % 4],
  area: ['24 м²', '120 м²', '32 м²', '180 м²'][i % 4],
  rooms: ['Студия', '3 комн.', '1 комн.', '4 комн.'][i % 4],
  badges: i % 5 === 0 ? ['Распродано'] : i % 7 === 0 ? ['Скидка'] : undefined,
}));

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

  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }));

  const totalPages = Math.ceil(allProperties.length / perPage);
  const paged = allProperties.slice((currentPage - 1) * perPage, currentPage * perPage);

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
                {['По цене ↑', 'По цене ↓', 'По площади', 'По дате'].map((s, i) => (
                  <button key={i} className="w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors" onClick={() => setSortOpen(false)}>{s}</button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {paged.map((p, i) => (
                <PropertyCard key={i} data={p} />
              ))}
            </div>

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
