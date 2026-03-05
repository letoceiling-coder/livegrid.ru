import { useEffect, useRef, useState } from 'react';
import { type ApartmentListItem } from '@/types/apartment';
import { formatPrice, formatArea } from '@/lib/format';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface YandexMapViewProps {
  apartments: ApartmentListItem[];
  loading?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

// ── Yandex Maps types ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    ymaps?: {
      ready: (callback: () => void) => void;
      Map: new (container: HTMLElement, options: {
        center: [number, number];
        zoom: number;
        controls?: string[];
      }) => {
        geoObjects: {
          add: (object: any) => void;
          remove: (object: any) => void;
        };
        events: {
          add: (event: string, handler: (e: any) => void) => void;
          remove: (event: string, handler: (e: any) => void) => void;
        };
        destroy: () => void;
        setCenter: (center: [number, number]) => void;
        setZoom: (zoom: number) => void;
      };
      Placemark: new (
        coordinates: [number, number],
        properties: {
          balloonContent?: string;
        },
        options: {
          preset?: string;
        }
      ) => any;
    };
  }
}

// ── Script loading state (global to prevent multiple loads) ───────────────────

let scriptLoading = false;
let scriptLoaded = false;
let scriptLoadCallbacks: Array<() => void> = [];

const loadYandexMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (scriptLoaded && window.ymaps) {
      resolve();
      return;
    }

    // If script is already loading, add callback to queue
    if (scriptLoading) {
      scriptLoadCallbacks.push(resolve);
      return;
    }

    scriptLoading = true;

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');
    if (existingScript) {
      // Script exists, wait for it to load
      if (window.ymaps) {
        scriptLoaded = true;
        scriptLoading = false;
        resolve();
        return;
      }
      // Wait for existing script to load
      const checkInterval = setInterval(() => {
        if (window.ymaps) {
          clearInterval(checkInterval);
          scriptLoaded = true;
          scriptLoading = false;
          resolve();
          scriptLoadCallbacks.forEach(cb => cb());
          scriptLoadCallbacks = [];
        }
      }, 100);
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=a79c56f4-efea-471e-bee5-fe9226cd53fd&lang=ru_RU';
    script.async = true;
    script.onload = () => {
      if (window.ymaps) {
        window.ymaps.ready(() => {
          scriptLoaded = true;
          scriptLoading = false;
          resolve();
          scriptLoadCallbacks.forEach(cb => cb());
          scriptLoadCallbacks = [];
        });
      } else {
        scriptLoading = false;
        reject(new Error('Yandex Maps API failed to load'));
      }
    };
    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('Failed to load Yandex Maps script'));
    };
    document.head.appendChild(script);
  });
};

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * YandexMapView component for displaying apartments on Yandex Maps.
 *
 * Features:
 * - Dynamic script loading (only once)
 * - Map initialization with markers
 * - Click handler for radius filter
 * - Proper cleanup on unmount
 */
export default function YandexMapView({ apartments, loading, onMapClick, className }: YandexMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<ReturnType<typeof window.ymaps.Map> | null>(null);
  const markersRef = useRef<any[]>([]);
  const clickHandlerRef = useRef<((e: any) => void) | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // ── Load Yandex Maps script ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    loadYandexMapsScript()
      .then(() => {
        if (mounted) {
          setScriptLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load Yandex Maps:', err);
        if (mounted) {
          setScriptLoaded(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ── Initialize map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scriptLoaded || !window.ymaps || !containerRef.current || mapRef.current) {
      return;
    }

    window.ymaps.ready(() => {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      try {
        // Calculate center from apartments or use default (Moscow)
        const apartmentsWithGeo = apartments.filter(
          (apt) => apt.block?.geo?.lat != null && apt.block?.geo?.lng != null
        );

        let centerLat = 55.75;
        let centerLng = 37.61;

        if (apartmentsWithGeo.length > 0) {
          const lats = apartmentsWithGeo.map((apt) => apt.block?.geo?.lat ?? 0);
          const lngs = apartmentsWithGeo.map((apt) => apt.block?.geo?.lng ?? 0);
          centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
          centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;
        }

        mapRef.current = new window.ymaps.Map(containerRef.current, {
          center: [centerLat, centerLng],
          zoom: 11,
          controls: ['zoomControl'],
        });

        setMapReady(true);

        // Add click handler for radius filter
        if (onMapClick) {
          clickHandlerRef.current = (e: any) => {
            const coords = e.get('coords');
            const lat = coords[0];
            const lng = coords[1];
            onMapClick(lat, lng);
          };
          mapRef.current.events.add('click', clickHandlerRef.current);
        }
      } catch (err) {
        console.error('Failed to initialize Yandex Map:', err);
      }
    });
  }, [scriptLoaded, apartments, onMapClick]);

  // ── Update markers when apartments change ───────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.ymaps) {
      return;
    }

    // Remove old markers
    markersRef.current.forEach((marker) => {
      try {
        mapRef.current?.geoObjects.remove(marker);
      } catch (err) {
        // Marker might already be removed
      }
    });
    markersRef.current = [];

    // Filter apartments with valid coordinates
    const apartmentsWithGeo = apartments.filter(
      (apt) => apt.block?.geo?.lat != null && apt.block?.geo?.lng != null
    );

    // Add new markers
    apartmentsWithGeo.forEach((apt) => {
      const lat = apt.block?.geo?.lat ?? 0;
      const lng = apt.block?.geo?.lng ?? 0;

      if (lat === 0 || lng === 0) return;

      const roomLabel = apt.room_label ?? (apt.room === 0 ? 'Студия' : apt.room != null ? `${apt.room}-комн.` : '—');
      const areaTotal = apt.area?.total ?? null;
      const price = apt.price ?? null;

      const balloonContent = `
        <div style="min-width:180px; padding: 8px;">
          <b style="font-size: 14px; display: block; margin-bottom: 4px;">${roomLabel}</b>
          <span style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">${formatArea(areaTotal)}</span>
          <span style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">${formatPrice(price)}</span>
          <a href='/apartment/${apt.id}' style="display: inline-block; padding: 6px 12px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;">Открыть</a>
        </div>
      `;

      try {
        const placemark = new window.ymaps.Placemark(
          [lat, lng],
          {
            balloonContent,
          },
          {
            preset: 'islands#blueDotIcon',
          }
        );

        mapRef.current.geoObjects.add(placemark);
        markersRef.current.push(placemark);
      } catch (err) {
        console.error('Failed to create placemark:', err);
      }
    });

    // Update map center if we have apartments
    if (apartmentsWithGeo.length > 0 && mapRef.current) {
      const lats = apartmentsWithGeo.map((apt) => apt.block?.geo?.lat ?? 0);
      const lngs = apartmentsWithGeo.map((apt) => apt.block?.geo?.lng ?? 0);
      const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
      const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;
      mapRef.current.setCenter([centerLat, centerLng]);
    }
  }, [apartments, mapReady]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Remove click handler
      if (mapRef.current && clickHandlerRef.current) {
        try {
          mapRef.current.events.remove('click', clickHandlerRef.current);
        } catch (err) {
          // Handler might already be removed
        }
        clickHandlerRef.current = null;
      }

      // Remove markers
      if (mapRef.current) {
        markersRef.current.forEach((marker) => {
          try {
            mapRef.current?.geoObjects.remove(marker);
          } catch (err) {
            // Marker might already be removed
          }
        });
        markersRef.current = [];
      }

      // Destroy map
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch (err) {
          console.error('Error destroying map:', err);
        }
        mapRef.current = null;
      }
    };
  }, []);

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (loading || !scriptLoaded) {
    return (
      <div
        ref={containerRef}
        className={cn('bg-muted rounded-2xl overflow-hidden relative', className)}
        style={{ height: '600px', minHeight: '400px' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Загрузка карты...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render map container ───────────────────────────────────────────────────────
  return (
    <div className={cn('relative rounded-2xl overflow-hidden border border-border', className)}>
      <div
        ref={containerRef}
        className="w-full bg-secondary"
        style={{ height: '600px', minHeight: '400px' }}
      />
      {onMapClick && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-muted-foreground">
          Кликните на карте, чтобы установить радиус поиска
        </div>
      )}
    </div>
  );
}
