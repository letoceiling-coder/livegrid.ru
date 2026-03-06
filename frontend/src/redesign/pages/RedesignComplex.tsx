import { useParams, Link } from 'react-router-dom';
import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RedesignHeader from '@/redesign/components/RedesignHeader';
import ComplexHero from '@/redesign/components/ComplexHero';
import ApartmentTable from '@/redesign/components/ApartmentTable';
import Chessboard from '@/redesign/components/Chessboard';
import LayoutGrid from '@/redesign/components/LayoutGrid';
import { getComplex, getComplexApartments } from '@/api/blocksApi';
import { mapBlockDetailToComplex } from '@/lib/complexPageAdapter';
import { getLayoutGroups } from '@/redesign/data/mock-data';
import { formatPrice } from '@/lib/format';
import FooterSection from '@/components/FooterSection';
import type { SortField, SortDir } from '@/redesign/data/types';

declare global {
  interface Window { ymaps: any; }
}

const APARTMENTS_PER_PAGE = 500;

const RedesignComplex = () => {
  const { slug } = useParams<{ slug: string }>();
  const slugOrId = slug || '';

  const { data: block, isLoading: blockLoading, error: blockError } = useQuery({
    queryKey: ['block', slugOrId],
    queryFn: () => getComplex(slugOrId),
    enabled: !!slugOrId,
  });

  const [roomFilter, setRoomFilter] = useState<number | null>(null);

  const { data: aptsResult } = useQuery({
    queryKey: ['block-apartments', slugOrId, roomFilter],
    queryFn: () => getComplexApartments(slugOrId, {
      per_page: APARTMENTS_PER_PAGE,
      ...(roomFilter !== null && { room: [roomFilter] }),
    }),
    enabled: !!slugOrId,
  });

  const complex = useMemo(() => {
    if (!block) return null;
    const apts = aptsResult?.data ?? [];
    return mapBlockDetailToComplex(block, apts);
  }, [block, aptsResult?.data]);

  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'price', dir: 'asc' });
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  const allApartments = useMemo(() => {
    if (!complex) return [];
    let apts = complex.buildings.flatMap(b => b.apartments).filter(a => a.status !== 'sold');
    if (roomFilter !== null) apts = apts.filter(a => a.rooms === roomFilter);
    apts.sort((a, b) => {
      const m = sort.dir === 'asc' ? 1 : -1;
      return (a[sort.field] - b[sort.field]) * m;
    });
    return apts;
  }, [complex, sort, roomFilter]);

  const layouts = useMemo(() => complex ? getLayoutGroups(complex.id) : [], [complex]);

  const roomCounts = useMemo(() => {
    const fromBlock = block?.room_groups?.map(g => g.room) ?? [];
    const fromApts = complex ? [...new Set(complex.buildings.flatMap(b => b.apartments).filter(a => a.status !== 'sold').map(a => a.rooms))] : [];
    return [...new Set([...fromBlock, ...fromApts])].sort((a, b) => a - b);
  }, [block?.room_groups, complex]);

  const handleSort = (field: SortField) => {
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc' }));
  };

  // Init map for map tab
  const initMap = () => {
    if (!complex || mapInstanceRef.current || !mapRef.current) return;
    if (!window.ymaps) {
      const s = document.createElement('script');
      s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
      s.async = true;
      s.onload = () => window.ymaps.ready(() => createMap());
      document.head.appendChild(s);
    } else {
      window.ymaps.ready(() => createMap());
    }
  };

  const createMap = () => {
    if (!complex || !mapRef.current || mapInstanceRef.current) return;
    const map = new window.ymaps.Map(mapRef.current, {
      center: complex.coords,
      zoom: 15,
      controls: ['zoomControl'],
    });
    const pm = new window.ymaps.Placemark(complex.coords, {
      balloonContentHeader: `<strong>${complex.name}</strong>`,
      balloonContentBody: `<div>${complex.address}</div>`,
    }, { preset: 'islands#blueCircleDotIcon' });
    map.geoObjects.add(pm);
    mapInstanceRef.current = map;
  };

  if (blockLoading || (!block && !blockError)) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1400px] mx-auto px-4 py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <FooterSection />
      </div>
    );
  }

  if (blockError || !complex) {
    return (
      <div className="min-h-screen bg-background">
        <RedesignHeader />
        <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Комплекс не найден</p>
          <Link to="/catalog" className="text-primary text-sm mt-2 inline-block">← Вернуться в каталог</Link>
        </div>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 lg:pb-0">
      <RedesignHeader />
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/catalog" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Каталог
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{complex.name}</span>
        </div>

        <ComplexHero complex={complex} />

        <Tabs defaultValue="apartments" className="mt-8" onValueChange={v => { if (v === 'map') setTimeout(initMap, 100); }}>
          <TabsList className="w-full justify-start bg-muted/50 rounded-xl p-1 h-auto flex-wrap gap-0.5">
            <TabsTrigger value="apartments" className="rounded-lg text-sm data-[state=active]:shadow-sm">
              Квартиры <span className="ml-1 text-xs text-muted-foreground">({allApartments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="layouts" className="rounded-lg text-sm data-[state=active]:shadow-sm">
              Планировки <span className="ml-1 text-xs text-muted-foreground">({layouts.length})</span>
            </TabsTrigger>
            <TabsTrigger value="chess" className="rounded-lg text-sm data-[state=active]:shadow-sm">Шахматка</TabsTrigger>
            <TabsTrigger value="about" className="rounded-lg text-sm data-[state=active]:shadow-sm">О комплексе</TabsTrigger>
            <TabsTrigger value="infra" className="rounded-lg text-sm data-[state=active]:shadow-sm">Инфраструктура</TabsTrigger>
            <TabsTrigger value="map" className="rounded-lg text-sm data-[state=active]:shadow-sm">Карта</TabsTrigger>
          </TabsList>

          {/* Apartments */}
          <TabsContent value="apartments" className="mt-6">
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setRoomFilter(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${roomFilter === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 bg-background'}`}
              >
                Все
              </button>
              {roomCounts.map(r => (
                <button
                  key={r}
                  onClick={() => setRoomFilter(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${roomFilter === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 bg-background'}`}
                >
                  {r === 0 ? 'Студия' : `${r}-комн`}
                </button>
              ))}
            </div>
            <ApartmentTable apartments={allApartments} sort={sort} onSort={handleSort} />
          </TabsContent>

          {/* Layouts */}
          <TabsContent value="layouts" className="mt-6">
            <LayoutGrid layouts={layouts} complexSlug={complex.slug} />
          </TabsContent>

          {/* Chessboard */}
          <TabsContent value="chess" className="mt-6 space-y-8">
            {complex.buildings.map(b => (
              <Chessboard key={b.id} apartments={b.apartments} floors={b.floors} sections={b.sections} buildingName={b.name} />
            ))}
          </TabsContent>

          {/* About */}
          <TabsContent value="about" className="mt-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <h3 className="font-semibold text-lg">О комплексе</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{complex.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 pt-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Адрес</p>
                  <p className="text-sm font-medium">{complex.address}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Застройщик</p>
                  <p className="text-sm font-medium">{complex.builder}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Район</p>
                  <p className="text-sm font-medium">{complex.district}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Метро</p>
                  <p className="text-sm font-medium">{complex.subway} ({complex.subwayDistance})</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Срок сдачи</p>
                  <p className="text-sm font-medium">{complex.deadline}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Корпусов</p>
                  <p className="text-sm font-medium">{complex.buildings.length}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Цена</p>
                  <p className="text-sm font-medium">{formatPrice(complex.priceFrom)} — {formatPrice(complex.priceTo)}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Infrastructure */}
          <TabsContent value="infra" className="mt-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-semibold text-lg mb-5">Инфраструктура</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {complex.infrastructure.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Map */}
          <TabsContent value="map" className="mt-6">
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{complex.address}</span>
                <span className="text-xs text-muted-foreground">· м. {complex.subway} · {complex.subwayDistance}</span>
              </div>
              <div ref={mapRef} className="h-[400px] bg-muted" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <FooterSection />
    </div>
  );
};

export default RedesignComplex;
