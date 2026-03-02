import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
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

interface ZhkMapProps {
  filters?: BlockFilters;
  onBlockClick?: (blockSlug: string) => void;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

const ZhkMap = ({ filters = {}, onBlockClick }: ZhkMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const objectManagerRef = useRef<any>(null);
  const [ymapsReady, setYmapsReady] = useState(false);
  const [blocks, setBlocks] = useState<MapBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);

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
    script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
    script.async = true;
    script.onload = () => window.ymaps.ready(() => setYmapsReady(true));
    document.body.appendChild(script);
  }, []);

  // ── 2. Fetch ALL blocks for map (no pagination) ─────────────────────────
  useEffect(() => {
    setLoadingBlocks(true);
    const params: Record<string, any> = {};
    if (filters.district?.length) params.district = filters.district;
    if (filters.builder?.length) params.builder = filters.builder;
    if (filters.is_city !== undefined) params.is_city = filters.is_city;
    if (filters.search) params.search = filters.search;
    if (filters.deadline_from) params.deadline_from = filters.deadline_from;
    if (filters.deadline_to) params.deadline_to = filters.deadline_to;

    api
      .get<{ data: MapBlock[] }>('/blocks/map', { params })
      .then(res => {
        const raw = (res.data as any)?.data ?? [];
        setBlocks(raw);
      })
      .catch(() => setBlocks([]))
      .finally(() => setLoadingBlocks(false));
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3. Init map ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ymapsReady || !mapRef.current || mapInstanceRef.current) return;

    const map = new window.ymaps.Map(mapRef.current, {
      center: [55.751244, 37.618423],
      zoom: 10,
      controls: ['zoomControl', 'fullscreenControl', 'geolocationControl'],
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
        objectManagerRef.current = null;
      }
    };
  }, [ymapsReady]);

  // ── 4. Render markers ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ymapsReady || !mapInstanceRef.current || loadingBlocks) return;

    const map = mapInstanceRef.current;

    // Remove old object manager
    if (objectManagerRef.current) {
      map.geoObjects.remove(objectManagerRef.current);
      objectManagerRef.current = null;
    }

    if (blocks.length === 0) return;

    const om = new window.ymaps.ObjectManager({
      clusterize: true,
      gridSize: 60,
      clusterDisableClickZoom: false,
      clusterBalloonContentLayout: 'cluster#balloonCarousel',
    });

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
          <a href="/zhk/${block.slug}"
             style="display:block;margin-top:8px;color:#2563eb;font-size:13px;text-decoration:none;font-weight:500">
            Подробнее →
          </a>`,
        hintContent: block.name,
      },
      options: {
        preset: 'islands#blueCircleDotIcon',
      },
    }));

    om.add({ type: 'FeatureCollection', features });

    om.objects.events.add('click', (e: any) => {
      const obj = om.objects.getById(e.get('objectId'));
      if (obj && onBlockClick) onBlockClick(obj.properties.blockSlug);
    });

    map.geoObjects.add(om);
    objectManagerRef.current = om;

    // Fit bounds
    const bounds = om.getBounds();
    if (bounds) {
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
    }
  }, [ymapsReady, blocks, loadingBlocks, onBlockClick]);

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
