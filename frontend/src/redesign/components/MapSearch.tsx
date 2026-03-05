import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { BlockForDisplay } from '@/lib/blockDisplay';
import { formatPrice } from '@/lib/format';
import { MapPin, Building2 } from 'lucide-react';
import type { MapViewportBounds } from '@/components/ZhkMap';

declare global {
  interface Window { ymaps: any; }
}

const DEFAULT_CENTER = [55.751244, 37.618423];
const DEFAULT_ZOOM = 11;
const BOUNDS_CHANGE_DEBOUNCE_MS = 400;
const VIEWPORT_THRESHOLD = 0.02;

interface Props {
  /** All complexes for the list panel (~490) */
  listComplexes: BlockForDisplay[];
  /** Viewport-filtered complexes for map markers (~300–400) */
  mapComplexes: BlockForDisplay[];
  activeSlug?: string | null;
  onSelect?: (slug: string) => void;
  onViewportChange?: (v: MapViewportBounds) => void;
  height?: string;
  /** Fit map to markers only once on initial load */
  fitBoundsOnce?: boolean;
}

const MapSearch = ({ listComplexes, mapComplexes, activeSlug, onSelect, onViewportChange, height = '70vh', fitBoundsOnce }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const objectManagerRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);
  const onViewportChangeRef = useRef(onViewportChange);
  onSelectRef.current = onSelect;
  onViewportChangeRef.current = onViewportChange;
  const initialBoundsFittedRef = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.ymaps) { window.ymaps.ready(() => setReady(true)); return; }
    const s = document.createElement('script');
    s.src = 'https://api-maps.yandex.ru/2.1/?apikey=a79c56f4-efea-471e-bee5-fe9226cd53fd&lang=ru_RU';
    s.async = true;
    s.onload = () => window.ymaps.ready(() => setReady(true));
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstance.current) return;
    const map = new window.ymaps.Map(mapRef.current, {
      center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM,
      controls: ['zoomControl', 'geolocationControl'],
    });
    mapInstance.current = map;

    let boundsCleanup: (() => void) | undefined;
    if (onViewportChangeRef.current) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let lastViewport: MapViewportBounds | null = null;

      const emitBounds = () => {
        if (!mapInstance.current) return;
        try {
          const bounds = mapInstance.current.getBounds();
          if (!bounds) return;
          const lat_min = bounds[0][0];
          const lat_max = bounds[1][0];
          const lng_min = bounds[0][1];
          const lng_max = bounds[1][1];
          const viewport: MapViewportBounds = { lat_min, lat_max, lng_min, lng_max };
          const changed = !lastViewport ||
            Math.abs(viewport.lat_min - lastViewport.lat_min) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lat_max - lastViewport.lat_max) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lng_min - lastViewport.lng_min) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lng_max - lastViewport.lng_max) > VIEWPORT_THRESHOLD;
          if (changed) {
            lastViewport = viewport;
            onViewportChangeRef.current?.(viewport);
          }
        } catch { /* ignore */ }
      };

      const handleActionEnd = (e: any) => {
        const action = e?.get?.('action');
        if (action === 'drag' || action === 'pan') {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(emitBounds, BOUNDS_CHANGE_DEBOUNCE_MS);
        }
      };

      map.events.add('actionend', handleActionEnd);
      emitBounds();

      boundsCleanup = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        try { map.events.remove('actionend', handleActionEnd); } catch { /* ignore */ }
      };
    }

    return () => {
      boundsCleanup?.();
      mapInstance.current?.destroy?.();
      mapInstance.current = null;
      objectManagerRef.current = null;
      initialBoundsFittedRef.current = false;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const map = mapInstance.current;

    if (!objectManagerRef.current) {
      const om = new window.ymaps.ObjectManager({
        clusterize: true, gridSize: 64,
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

    if (mapComplexes.length === 0) return;

    const features = mapComplexes.map(c => ({
      type: 'Feature' as const,
      id: c.id,
      geometry: { type: 'Point' as const, coordinates: c.coords as [number, number] },
      properties: {
        blockSlug: c.slug,
        balloonContent: `<div><strong>${c.name}</strong><br/>от ${c.priceFrom?.toLocaleString?.() ?? 0} ₽<br/><a href="/complex/${c.slug}">Открыть ЖК</a></div>`,
      },
    }));

    om.add({ type: 'FeatureCollection' as const, features });

    if (fitBoundsOnce && !initialBoundsFittedRef.current && map) {
      initialBoundsFittedRef.current = true;
      try {
        const bounds = om.getBounds();
        if (bounds) map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
      } catch { /* ignore */ }
    }
  }, [mapComplexes, ready, fitBoundsOnce]);

  const centerOn = useCallback((slug: string) => {
    const c = listComplexes.find(x => x.slug === slug);
    if (c && mapInstance.current) mapInstance.current.setCenter(c.coords, 14, { duration: 400 });
    onSelect?.(slug);
  }, [listComplexes, onSelect]);

  return (
    <div className="flex flex-col lg:flex-row gap-4" style={{ height }}>
      <div ref={mapRef} className="flex-1 rounded-2xl overflow-hidden border border-border bg-muted min-h-[300px]" />
      <div className="w-full lg:w-[360px] overflow-y-auto space-y-2 shrink-0">
        {listComplexes.map(c => (
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
