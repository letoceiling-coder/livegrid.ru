import { useEffect, useRef, useState } from 'react';
import { getMapObjects } from '@/api/mapApi';
import { getComplex } from '@/api/blocksApi';
import { formatPrice } from '@/lib/format';
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

    if (onBoundsChange) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let lastViewport: MapViewportBounds | null = null;

      const emitBounds = () => {
        if (!mapInstanceRef.current) return;
        try {
          const bounds = mapInstanceRef.current.getBounds();
          if (!bounds) return;
          const [[lngMin, latMin], [lngMax, latMax]] = bounds;
          const viewport: MapViewportBounds = {
            lat_min: latMin,
            lat_max: latMax,
            lng_min: lngMin,
            lng_max: lngMax,
          };
          const changed = !lastViewport ||
            Math.abs(viewport.lat_min - lastViewport.lat_min) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lat_max - lastViewport.lat_max) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lng_min - lastViewport.lng_min) > VIEWPORT_THRESHOLD ||
            Math.abs(viewport.lng_max - lastViewport.lng_max) > VIEWPORT_THRESHOLD;
          if (changed) {
            lastViewport = viewport;
            onBoundsChange(viewport);
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
  }, [ymapsReady, onBoundsChange]);

  const initialBoundsFittedRef = useRef(false);

  // ── 4. Create ObjectManager once ────────────────────────────────────────
  useEffect(() => {
    if (!ymapsReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (!objectManagerRef.current) {
      const om = new window.ymaps.ObjectManager({
        clusterize: true,
        gridSize: 60,
        clusterDisableClickZoom: false,
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
      });

      om.objects.events.add('click', (e: any) => {
        const obj = om.objects.getById(e.get('objectId'));
        if (obj && obj.properties?.blockSlug && onBlockClick) onBlockClick(obj.properties.blockSlug);
      });

      map.geoObjects.add(om);
      objectManagerRef.current = om;
    }
  }, [ymapsReady, onBlockClick]);

  // ── 5. Update ObjectManager objects in place (do not recreate) ──────────
  useEffect(() => {
    if (!objectManagerRef.current || loadingBlocks) return;

    const om = objectManagerRef.current;

    if (blocks.length === 0) {
      try {
        if (typeof om.removeAll === 'function') om.removeAll();
      } catch { /* ignore */ }
      return;
    }

    const features = blocks.map((block, index) => ({
      type: 'Feature',
      id: index,
      geometry: {
        type: 'Point',
        coordinates: [block.lat, block.lng],
      },
      properties: {
        blockSlug: block.slug,
        balloonContentHeader: `<strong style="font-size:14px">${block.name}</strong>`,
        balloonContentBody: `
          <div style="min-width:200px;padding:6px 0">
            ${block.image
              ? `<img src="${block.image}" alt="${block.name}" style="width:100%;height:130px;object-fit:cover;border-radius:8px;margin-bottom:8px" />`
              : ''
            }
            <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px">
              <div>
                <div style="font-size:11px;color:#888">от</div>
                <div style="font-size:15px;font-weight:600">${formatPrice(block.price_from)}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:11px;color:#888">В продаже</div>
                <div style="font-size:13px">${block.units_count.toLocaleString('ru-RU')} кв.</div>
              </div>
            </div>
          </div>
        `,
        balloonContentFooter: `
          <a href='/complex/${block.slug}'
             style="display:block;margin-top:8px;color:#2563eb;font-size:13px;text-decoration:none;font-weight:500">
            Подробнее →
          </a>`,
        hintContent: block.name,
      },
      options: {
        preset: 'islands#blueCircleDotIcon',
      },
    }));

    try {
      if (typeof om.removeAll === 'function') om.removeAll();
    } catch { /* ignore */ }
    om.add({ type: 'FeatureCollection', features });

    if (!initialBoundsFittedRef.current && mapInstanceRef.current) {
      initialBoundsFittedRef.current = true;
      const bounds = om.getBounds();
      if (bounds) {
        mapInstanceRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
      }
    }
  }, [blocks, loadingBlocks]);

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
