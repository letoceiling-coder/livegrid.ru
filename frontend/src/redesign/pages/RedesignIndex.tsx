import { Link } from 'react-router-dom';
import { Search, ArrowRight, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import ComplexCard from '@/redesign/components/ComplexCard';
import MapSearch from '@/redesign/components/MapSearch';
import QuizSection from '@/components/QuizSection';
import PropertyGridSection from '@/components/PropertyGridSection';
import AboutPlatform from '@/components/AboutPlatform';
import AdditionalFeatures from '@/components/AdditionalFeatures';
import CategoryTiles from '@/components/CategoryTiles';
import LatestNews from '@/components/LatestNews';
import ContactsSection from '@/components/ContactsSection';
import FooterSection from '@/components/FooterSection';
import { getBlocks } from '@/api/blocksApi';
import { mapBlockToDisplay } from '@/lib/blockDisplay';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';

const quickFilters = [
  { label: 'Студии', search: '' },
  { label: '1-комнатные', search: '' },
  { label: '2-комнатные', search: '' },
  { label: 'До 6 млн ₽', search: '' },
  { label: 'Сданные ЖК', search: '' },
  { label: 'Бизнес-класс', search: '' },
];

const regions = [
  'Москва и МО',
  'Санкт-Петербург и ЛО',
  'Краснодарский край',
  'Московская область',
  'Ленинградская область',
  'Татарстан',
  'Крым',
  'Сочи',
  'Другой регион',
];

const CARD_COUNT = 8;
const MAP_PER_PAGE = 100; // API max per_page

const RedesignIndex = () => {
  const [q, setQ] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Москва и МО');
  const [regionOpen, setRegionOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');
  const [activeComplex, setActiveComplex] = useState<string | null>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  const { data: blocksData, isLoading: blocksLoading, error: blocksError } = useQuery({
    queryKey: ['blocks', 'popular', MAP_PER_PAGE],
    queryFn: () => getBlocks({ per_page: MAP_PER_PAGE }),
  });

  const allBlocks = (blocksData?.data ?? []).map(mapBlockToDisplay);
  const featured = allBlocks.slice(0, CARD_COUNT);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) {
        setRegionOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />

      {/* Hero */}
      <section className="relative bg-background overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 py-8 sm:py-12 relative">
          <div className="mb-6">
            <div className="relative inline-block" ref={regionRef}>
              <button
                onClick={() => setRegionOpen(!regionOpen)}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors cursor-pointer min-h-[44px] py-2"
                aria-expanded={regionOpen}
                aria-haspopup="listbox"
              >
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>{selectedRegion}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${regionOpen ? 'rotate-180' : ''}`} />
              </button>
              {regionOpen && (
                <ul
                  role="listbox"
                  className="absolute top-full left-0 mt-1 py-2 bg-background border border-border rounded-xl shadow-lg z-50 min-w-[220px] max-h-[300px] overflow-y-auto"
                >
                  {regions.map((region) => (
                    <li key={region} role="option">
                      <button
                        onClick={() => {
                          setSelectedRegion(region);
                          setRegionOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition-colors cursor-pointer min-h-[44px] flex items-center ${
                          selectedRegion === region ? 'text-primary font-medium' : ''
                        }`}
                      >
                        {region}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl md:text-4xl font-bold mb-8 leading-tight">
              <span className="text-primary italic">Live Grid.</span> 62 000+ квартир в 1284+ комплексах по России
            </h1>
            <div className="flex gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <Input
                  placeholder="Район, метро, ЖК или застройщик..."
                  className="pl-10 h-12 text-sm bg-background shadow-sm"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') window.location.href = `/catalog${q ? `?search=${q}` : ''}`; }}
                />
              </div>
              <Link to={`/catalog${q ? `?search=${q}` : ''}`}>
                <Button className="h-12 px-8 shadow-sm">Найти</Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              {quickFilters.map(tag => (
                <Link key={tag.label} to="/catalog" className="px-3.5 py-2 rounded-full bg-background border border-border text-xs font-medium hover:border-primary/50 hover:bg-accent transition-colors shadow-sm">
                  {tag.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Tiles */}
      <CategoryTiles />

      {/* Featured */}
      <section className="max-w-[1400px] mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Популярные комплексы</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Самые востребованные ЖК Москвы</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setViewMode('map')}
              className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-colors bg-background border-border hover:bg-secondary"
            >
              <MapPin className="w-4 h-4" />
              На карте
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className="px-4 py-2 rounded-full border text-sm transition-colors bg-background border-border hover:bg-secondary"
            >
              Все предложения
            </button>
          </div>
        </div>
        {blocksError ? (
          <p className="text-destructive text-sm py-8">Не удалось загрузить популярные комплексы. Попробуйте позже.</p>
        ) : viewMode === 'cards' ? (
          blocksLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: CARD_COUNT }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-muted/50 h-[280px] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.map(c => <ComplexCard key={c.id} complex={c} />)}
            </div>
          )
        ) : blocksLoading ? (
          <div className="h-[450px] rounded-2xl border border-border bg-muted/30 animate-pulse flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Загрузка карты...</span>
          </div>
        ) : (
          <MapSearch complexes={allBlocks} activeSlug={activeComplex} onSelect={setActiveComplex} height="450px" />
        )}
      </section>

      {/* Горячие предложения */}
      <PropertyGridSection title="Горячие предложения" type="hot" />

      {/* Старт продаж */}
      <PropertyGridSection title="Старт продаж" type="start" />

      {/* Подберем объект под Ваш запрос */}
      <QuizSection />

      {/* О платформе Live Grid */}
      <AboutPlatform />

      {/* Map CTA */}
      <section className="max-w-[1400px] mx-auto px-4 pb-8">
        <Link to="/map" className="block rounded-2xl bg-muted border border-border p-8 sm:p-10 hover:border-primary/30 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">Поиск на карте</h3>
              <p className="text-sm text-muted-foreground">Найдите ЖК рядом с нужным метро или районом</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto hidden sm:block" />
          </div>
        </Link>
      </section>

      {/* CTA */}
      <section className="max-w-[1400px] mx-auto px-4 pb-12">
        <div className="rounded-2xl bg-primary p-8 sm:p-12 text-primary-foreground text-center">
          <h2 className="text-2xl font-bold mb-2">Нужна помощь с выбором?</h2>
          <p className="text-sm opacity-90 mb-6 max-w-md mx-auto">Наши эксперты подберут квартиру по вашим критериям бесплатно</p>
          <Button variant="secondary" size="lg" className="shadow-sm">Получить консультацию</Button>
        </div>
      </section>

      {/* Дополнительные возможности */}
      <AdditionalFeatures />

      {/* Последние новости */}
      <LatestNews />

      {/* Свяжитесь с LiveGrid */}
      <ContactsSection />

      {/* Footer */}
      <FooterSection />
    </div>
  );
};

export default RedesignIndex;
