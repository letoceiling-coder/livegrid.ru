import { useEffect, useRef, useState, useMemo } from 'react';
import { MapPin, X } from 'lucide-react';
import { formatPrice, formatArea } from '@/lib/format';
import { type ApartmentListItem } from '@/types/apartment';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MapViewProps {
  apartments: ApartmentListItem[];
  loading?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * MapView component for displaying apartments on a map.
 *
 * Uses a simple approach with Mapbox Static API or Leaflet.
 * For production, install: npm install react-map-gl mapbox-gl
 *
 * Current implementation uses a placeholder that can be replaced
 * with actual Mapbox GL integration.
 */
export default function MapView({ apartments, loading, onMapClick, className }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [selectedApartment, setSelectedApartment] = useState<ApartmentListItem | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Filter apartments with valid coordinates
  const apartmentsWithGeo = apartments.filter(
    (apt) => apt.block?.geo?.lat != null && apt.block?.geo?.lng != null
  );

  // Calculate center point and bounds
  const bounds = useMemo(() => {
    if (apartmentsWithGeo.length === 0) {
      return {
        minLat: 55.7558,
        maxLat: 55.7558,
        minLng: 37.6173,
        maxLng: 37.6173,
        centerLat: 55.7558,
        centerLng: 37.6173,
      };
    }

    const lats = apartmentsWithGeo.map((apt) => apt.block?.geo?.lat ?? 0).filter((lat) => lat !== 0);
    const lngs = apartmentsWithGeo.map((apt) => apt.block?.geo?.lng ?? 0).filter((lng) => lng !== 0);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Add padding
    const latPadding = (maxLat - minLat) * 0.1 || 0.01;
    const lngPadding = (maxLng - minLng) * 0.1 || 0.01;

    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
      centerLat: (minLat + maxLat) / 2,
      centerLng: (minLng + maxLng) / 2,
    };
  }, [apartmentsWithGeo]);

  // Convert lat/lng to pixel coordinates (simple mercator projection approximation)
  const latLngToPixel = useMemo(() => {
    return (lat: number, lng: number) => {
      const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * containerSize.width;
      const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * containerSize.height;
      return { x, y };
    };
  }, [bounds, containerSize]);

  // Convert pixel coordinates to lat/lng
  const pixelToLatLng = useMemo(() => {
    return (x: number, y: number) => {
      const lng = bounds.minLng + (x / containerSize.width) * (bounds.maxLng - bounds.minLng);
      const lat = bounds.maxLat - (y / containerSize.height) * (bounds.maxLat - bounds.minLat);
      return { lat, lng };
    };
  }, [bounds, containerSize]);

  // Update container size on mount and resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    const updateSize = () => {
      if (mapContainerRef.current) {
        setContainerSize({
          width: mapContainerRef.current.offsetWidth,
          height: mapContainerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    setMapLoaded(true);

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(mapContainerRef.current);

    return () => resizeObserver.disconnect();
  }, [apartmentsWithGeo.length]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onMapClick || !mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { lat, lng } = pixelToLatLng(x, y);
    onMapClick(lat, lng);
  };

  if (loading) {
    return (
      <div
        ref={mapContainerRef}
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

  return (
    <div className={cn('relative rounded-2xl overflow-hidden border border-border', className)}>
      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="relative w-full bg-secondary"
        style={{ height: '600px', minHeight: '400px' }}
        onClick={onMapClick ? handleMapClick : undefined}
      >
        {/* Map background (placeholder - replace with actual Mapbox map) */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: `url(https://api.mapbox.com/styles/v1/mapbox/light-v11/static/${bounds.centerLng},${bounds.centerLat},11,0/800x600@2x?access_token=YOUR_TOKEN)`,
          }}
        />

        {/* Markers */}
        {apartmentsWithGeo.map((apt) => {
          const lat = apt.block?.geo?.lat ?? 0;
          const lng = apt.block?.geo?.lng ?? 0;
          
          if (lat === 0 || lng === 0) return null;

          const { x, y } = latLngToPixel(lat, lng);

          return (
            <button
              key={apt.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedApartment(apt);
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: `${x}px`,
                top: `${y}px`,
              }}
            >
              <div className="w-8 h-8 bg-primary rounded-full border-2 border-background shadow-lg flex items-center justify-center hover:scale-110 transition-transform cursor-pointer">
                <MapPin className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
              </div>
            </button>
          );
        })}

        {/* Center marker (if no apartments) */}
        {apartmentsWithGeo.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-8 h-8 bg-primary rounded-full border-2 border-background shadow-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
            </div>
          </div>
        )}

        {/* Click hint */}
        {onMapClick && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-muted-foreground">
            Кликните на карте, чтобы установить радиус поиска
          </div>
        )}
      </div>

      {/* Popup */}
      {selectedApartment && (
        <div className="absolute top-4 right-4 z-30 bg-card border border-border rounded-xl shadow-lg p-4 max-w-[280px]">
          <button
            onClick={() => setSelectedApartment(null)}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
          
          <div className="pr-6">
            <h3 className="font-semibold text-sm mb-2">
              {selectedApartment.room_label ?? `${selectedApartment.room}-комн.`} · {formatArea(selectedApartment.area?.total)}
            </h3>
            <p className="text-xs text-muted-foreground mb-1">
              {selectedApartment.block?.name ?? '—'}
            </p>
            <p className="font-bold text-sm mb-3">
              {formatPrice(selectedApartment.price)}
            </p>
            <a
              href={`/object/${selectedApartment.id}`}
              className="block w-full bg-primary text-primary-foreground text-center py-2 rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Открыть
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
