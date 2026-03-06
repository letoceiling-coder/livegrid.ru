import { useEffect, useRef, useState } from 'react';
import { getMapObjects } from '@/api/mapApi';
import { getComplex } from '@/api/blocksApi';
import { type BlockFilters } from '@/hooks/useBlocks';

interface MapBlock {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  price_from: number | null;
  units_count: number;
  image: string | null;
}

export interface MapViewportBounds {
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
}

interface ZhkMapProps {
  filters?: BlockFilters;
  /** When provided, map fetches data; when omitted, pass blocks explicitly */
  blocks?: MapBlock[];
  onBlockClick?: (blockSlug: string) => void;
  /** Center map on this block slug and zoom to 15 */
  centerOnSlug?: string | null;
  /** Called when map bounds change (drag only, debounced) */
  onBoundsChange?: (viewport: MapViewportBounds) => void;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

const BOUNDS_CHANGE_DEBOUNCE_MS = 400;
const VIEWPORT_THRESHOLD = 0.02;

const ZhkMap = ({ filters = {}, blocks: externalBlocks, onBlockClick, centerOnSlug, onBoundsChange }: ZhkMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const objectManagerRef = useRef<any>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onBlockClickRef = useRef(onBlockClick);
  onBoundsChangeRef.current = onBoundsChange;
  onBlockClickRef.current = onBlockClick;
  const [ymapsReady, setYmapsReady] = useState(false);
  const [blocks, setBlocks] = useState<MapBlock[]>(externalBlocks ?? []);
  const [loadingBlocks, setLoadingBlocks] = useState(externalBlocks == null);

  // ── 1. Load Yandex Maps API ─────────────────────────────────────────────
  useEffect(() => {
    if (window.ymaps) {
      setYmapsReady(true);
      return;
    }
    const existing = document.getElementById('ymaps-script');
    if (existing) {
      window.ymaps?.ready(() => setYmapsReady(true));
      return;
    }
    const script = document.createElement('script');
    script.id = 'ymaps-script';
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=a79c56f4-efea-471e-bee5-fe9226cd53fd&lang=ru_RU';
    script.async = true;
    script.onload = () => window.ymaps.ready(() => setYmapsReady(true));
    document.body.appendChild(script);
  }, []);

  // ── 2. Use external blocks or fetch via API layer ───────────────────────
  useEffect(() => {
    if (externalBlocks !== undefined) {
      setBlocks(externalBlocks);
      setLoadingBlocks(false);
      return;
    }
    setLoadingBlocks(true);
    const params: Record<string, unknown> = {};
    if (filters.district?.length) params.district = filters.district;
    if (filters.builder?.length) params.builder = filters.builder;
    if (filters.is_city !== undefined) params.is_city = filters.is_city;
    if (filters.search) params.search = filters.search;
    if (filters.deadline_from) params.deadline_from = filters.deadline_from;
    if (filters.deadline_to) params.deadline_to = filters.deadline_to;

    getMapObjects(params)
      .then((raw) => setBlocks(raw))
      .catch(() => setBlocks([]))
      .finally(() => setLoadingBlocks(false));
  }, [externalBlocks, JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Init map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ymapsReady || !mapRef.current || mapInstanceRef.current) return;

    const map = new window.ymaps.Map(mapRef.current, {
      center: [55.751244, 37.618423],
      zoom: 10,
      controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
    });

    mapInstanceRef.current = map;

    let boundsCleanup: (() => void) | undefined;

    if (onBoundsChangeRef.current) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let lastViewport: MapViewportBounds | null = null;

      const emitBounds = () => {
        if (!mapInstanceRef.current) return;
        try {
          const bounds = mapInstanceRef.current.getBounds();
          if (!bounds) return;
          // Yandex: [[southWestLat, southWestLng], [northEastLat, northEastLng]]
          const lat_min = bounds[0][0];
          const lat_max = bounds[1][0];
          const lng_min = bounds[0][1];
          const lng_max = bounds[1][1];
          const viewport: MapViewportBounds = {
            lat_min,
            lat_max,
            lng_min,
            lng_max,
          };
          const changed = !lastViewport ||
            Math.abs(viewport.lat_min - lastViewport.lat_min) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lat_max - lastViewport.lat_max) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lng_min - lastViewport.lng_min) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lng_max - lastViewport.lng_max) > VIEWPORT_THRESHOLD;
          if (changed) {
            lastViewport = viewport;
            onBoundsChangeRef.current?.(viewport);
          }
        } catch { /* ignore */ }
      };

      const handleActionEnd = (e: any) => {
        const action = e && typeof e.get === 'function' ? e.get('action') : null;
        if (action === 'drag' || action === 'pan') {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(emitBounds, BOUNDS_CHANGE_DEBOUNCE_MS);
        }
      };

      map.events.add('actionend', handleActionEnd);
      emitBounds();

      boundsCleanup = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        try {
          map.events.remove('actionend', handleActionEnd);
        } catch { /* ignore */ }
      };
    }

    return () => {
      boundsCleanup?.();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
        objectManagerRef.current = null;
      }
    };
  }, [ymapsReady]);

  const initialBoundsFittedRef = useRef(false);

  // ── 4. Create ObjectManager once ────────────────────────────────────────
  useEffect(() => {
    if (!ymapsReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (!objectManagerRef.current) {
      const om = new window.ymaps.ObjectManager({
        clusterize: true,
        gridSize: 64,
        clusterDisableClickZoom: false,
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
      });

      om.objects.events.add('click', (e: any) => {
        const obj = om.objects.getById(e.get('objectId'));
        if (obj?.properties?.blockSlug) onBlockClickRef.current?.(obj.properties.blockSlug);
      });

      map.geoObjects.add(om);
      objectManagerRef.current = om;
    }
  }, [ymapsReady]);

  // ── 5. Update ObjectManager objects in place (do not recreate) ──────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const om = objectManagerRef.current;

    // eslint-disable-next-line no-console
    console.log('blocks effect', { blocksLen: blocks.length, loadingBlocks, hasMap: !!map, hasOM: !!om });

    if (!om) {
      // eslint-disable-next-line no-console
      console.error('ObjectManager missing');
      return;
    }
    if (loadingBlocks) return;

    // eslint-disable-next-line no-console
    console.log('blocks received', blocks.length);

    if (blocks.length === 0) {
      try {
        if (typeof om.removeAll === 'function') om.removeAll();
      } catch { /* ignore */ }
      return;
    }

    const features = blocks.map(block => ({
      type: 'Feature' as const,
      id: block.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [Number(block.lat), Number(block.lng)] as [number, number],
      },
      properties: {
        balloonContent: `<div><strong>${block.name}</strong><br/>от ${block.price_from?.toLocaleString?.() ?? 0} ₽<br/><a href="/complex/${block.slug}">Открыть ЖК</a></div>`,
      },
    }));

    // eslint-disable-next-line no-console
    console.log('features created', features.length);
    // eslint-disable-next-line no-console
    if (features[0]) console.log('first marker', features[0].geometry.coordinates);
    if (features.length === 0) {
      // eslint-disable-next-line no-console
      console.error('FEATURES EMPTY');
      return;
    }

    const geoJson = { type: 'FeatureCollection' as const, features };
    // eslint-disable-next-line no-console
    console.log('geojson', geoJson);
    // eslint-disable-next-line no-console
    console.log('adding features to map');

    try {
      if (typeof om.removeAll === 'function') om.removeAll();
    } catch { /* ignore */ }
    om.add(geoJson);
    // eslint-disable-next-line no-console
    console.log('markers added');

    if (!initialBoundsFittedRef.current && map) {
      initialBoundsFittedRef.current = true;
      const bounds = om.getBounds();
      if (bounds) {
        map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
      }
    }
  }, [blocks, loadingBlocks, ymapsReady]);

  // ── 6. Center on slug when selected from search ─────────────────────────
  useEffect(() => {
    if (!centerOnSlug || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const block = blocks.find(b => b.slug === centerOnSlug);
    if (block && map.setCenter) {
      map.setCenter([block.lat, block.lng], 15, { duration: 300 });
    } else if (centerOnSlug && map.setCenter) {
      getComplex(centerOnSlug).then((complex) => {
        const lat = complex.geo?.lat ?? 55.75;
        const lng = complex.geo?.lng ?? 37.62;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter([lat, lng], 15, { duration: 300 });
        }
      }).catch(() => { /* ignore */ });
    }
  }, [centerOnSlug, blocks]);

  const isLoading = !ymapsReady || loadingBlocks;

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-border" style={{ height: '600px' }}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted/40 flex flex-col items-center justify-center z-10">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">
            {!ymapsReady ? 'Загрузка карты...' : `Загрузка объектов...`}
          </p>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      {!isLoading && blocks.length > 0 && (
        <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium shadow z-10">
          {blocks.length.toLocaleString('ru-RU')} объектов на карте
        </div>
      )}
    </div>
  );
};

export default ZhkMap;
