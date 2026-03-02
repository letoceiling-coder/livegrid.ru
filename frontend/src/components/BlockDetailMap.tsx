import { useEffect, useRef } from 'react';

interface Props {
  lat: number;
  lng: number;
  name: string;
}

declare global {
  interface Window {
    ymaps: any;
  }
}

export default function BlockDetailMap({ lat, lng, name }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const initMap = () => {
      if (!containerRef.current || !window.ymaps) return;
      initializedRef.current = true;

      window.ymaps.ready(() => {
        if (!containerRef.current) return;

        const map = new window.ymaps.Map(containerRef.current, {
          center: [lat, lng],
          zoom: 15,
          controls: ['zoomControl', 'fullscreenControl'],
        });

        mapRef.current = map;

        const placemark = new window.ymaps.Placemark(
          [lat, lng],
          {
            balloonContentHeader: `<strong>${name}</strong>`,
            hintContent: name,
          },
          {
            preset: 'islands#blueHomeCircleIcon',
          }
        );

        map.geoObjects.add(placemark);
      });
    };

    if (window.ymaps) {
      initMap();
    } else {
      const existing = document.querySelector('script[src*="api-maps.yandex.ru"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU';
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', initMap);
      }
    }

    return () => {
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch (_) { /* ignore */ }
        mapRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [lat, lng, name]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
