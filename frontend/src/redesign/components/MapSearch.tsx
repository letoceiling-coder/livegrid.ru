import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { ResidentialComplex } from '@/redesign/data/types';
import { formatPrice } from '@/redesign/data/mock-data';
import { MapPin, Building2 } from 'lucide-react';

declare global {
  interface Window { ymaps: any; }
}

const DEFAULT_CENTER = [55.751244, 37.618423];
const DEFAULT_ZOOM = 11;

interface Props {
  complexes: ResidentialComplex[];
  activeSlug?: string | null;
  onSelect?: (slug: string) => void;
  height?: string;
}

const MapSearch = ({ complexes, activeSlug, onSelect, height = '70vh' }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
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

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    markersRef.current.forEach(m => map.geoObjects.remove(m));
    markersRef.current = [];

    complexes.forEach(c => {
      const pm = new window.ymaps.Placemark(c.coords, {
        balloonContentHeader: `<strong>${c.name}</strong>`,
        balloonContentBody: `<div style="max-width:240px"><img src="${c.images[0]}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px" /><div style="font-weight:700;margin-bottom:4px">от ${formatPrice(c.priceFrom)}</div><div style="font-size:12px;color:#666">${c.district} · м.${c.subway}</div><a href="/complex/${c.slug}" style="color:hsl(206,89%,60%);font-size:13px;margin-top:8px;display:block;font-weight:500">Подробнее →</a></div>`,
      }, { preset: 'islands#blueCircleDotIcon' });
      pm.events.add('click', () => onSelect?.(c.slug));
      map.geoObjects.add(pm);
      markersRef.current.push(pm);
    });
  }, [complexes, ready]);

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
              <img src={c.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {c.district} · м. {c.subway}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3" /> {c.builder}
                </p>
                <p className="text-sm font-bold mt-1">от {formatPrice(c.priceFrom)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapSearch;
