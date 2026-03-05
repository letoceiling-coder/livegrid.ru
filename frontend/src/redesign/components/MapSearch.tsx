import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { BlockForDisplay } from '@/lib/blockDisplay';
import { formatPrice } from '@/lib/format';
import { MapPin, Building2 } from 'lucide-react';

declare global {
  interface Window { ymaps: any; }
}

const DEFAULT_CENTER = [55.751244, 37.618423];
const DEFAULT_ZOOM = 11;

interface Props {
  complexes: BlockForDisplay[];
  activeSlug?: string | null;
  onSelect?: (slug: string) => void;
  height?: string;
  fitAllMarkers?: boolean;
}

const MapSearch = ({ complexes, activeSlug, onSelect, height = '70vh', fitAllMarkers }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const objectManagerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.ymaps) { window.ymaps.ready(() => setReady(true)); return; }
    const s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    s.async = true;
    s.onload = () => window.ymaps.ready(() => setReady(true));
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    mapInstance.current = new window.ymaps.Map(mapRef.current, {
      center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
      controls: ['zoomControl', 'geolocationControl'],
    });
  }, [ready]);

  // ObjectManager — handle many markers (e.g. 490) without viewport filtering
  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const map = mapInstance.current;

    if (!objectManagerRef.current) {
      const om = new window.ymaps.ObjectManager({
        clusterize: true,
        gridSize: 64,
        clusterDisableClickZoom: false,
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
      });
      om.objects.events.add('click', (e: any) => {
        const obj = om.objects.getById(e.get('objectId'));
        if (obj?.properties?.blockSlug) onSelectRef.current?.(obj.properties.blockSlug);
      });
      map.geoObjects.add(om);
      objectManagerRef.current = om;
    }
  }, [ready]);

  useEffect(() => {
    const map = mapInstance.current;
    const om = objectManagerRef.current;
    if (!om) return;

    try {
      if (typeof om.removeAll === 'function') om.removeAll();
    } catch { /* ignore */ }

    if (complexes.length === 0) return;

    const features = complexes.map(c => ({
      type: 'Feature' as const,
      id: c.id,
      geometry: {
        type: 'Point' as const,
        coordinates: c.coords as [number, number],
      },
      properties: {
        blockSlug: c.slug,
        balloonContent: `<div><strong>${c.name}</strong><br/>от ${c.priceFrom?.toLocaleString?.() ?? 0} ₽<br/><a href="/complex/${c.slug}">Открыть ЖК</a></div>`,
      },
    }));

    om.add({ type: 'FeatureCollection' as const, features });

    if (fitAllMarkers && map) {
      try {
        const bounds = om.getBounds();
        if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
      } catch { /* ignore */ }
    }
  }, [complexes, ready, fitAllMarkers]);

  const centerOn = useCallback((slug: string) => {
    const c = complexes.find(x => x.slug === slug);
    if (c && mapInstance.current) mapInstance.current.setCenter(c.coords, 14, { duration: 400 });
    onSelect?.(slug);
  }, [complexes, onSelect]);

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ height }}>
      <div ref={mapRef} className="flex-1 rounded-2xl overflow-hidden border border-border bg-muted min-h-[300px]" />
      <div className="w-full lg:w-[360px] overflow-y-auto space-y-2 shrink-0">
        {complexes.map(c => (
          <button
            key={c.slug}
            onClick={() => centerOn(c.slug)}
            className={cn(
              'w-full text-left rounded-xl border p-3.5 transition-all duration-200',
              activeSlug === c.slug ? 'border-primary bg-accent shadow-sm' : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
            )}
          >
            <div className="flex gap-3">
              <img src={c.images[0] ?? '/placeholder.svg'} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {c.district} · м. {c.subway}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3" /> {c.builder}
                </p>
                <p className="text-sm font-bold mt-1">{formatPrice(c.priceFrom)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapSearch;
