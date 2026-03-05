/**
 * Map page — displays blocks (ЖК) on Yandex Map.
 * Data: useMapObjects() → GET /api/v1/blocks/map
 */

import Header from '@/components/Header';
import ZhkMap from '@/components/ZhkMap';
import { useMapObjects } from '@/hooks/useMapObjects';
export default function MapPage() {
  const { objects, loading, error } = useMapObjects({});

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-6">
        <div className="max-w-[1400px] mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4">Карта объектов</h1>
          {error && (
            <p className="text-destructive text-sm mb-4">{error}</p>
          )}
          <div className="rounded-2xl overflow-hidden border border-border" style={{ minHeight: '600px' }}>
            {loading ? (
              <div className="w-full h-[600px] flex items-center justify-center bg-muted/30">
                <Skeleton className="w-full h-full" />
              </div>
            ) : (
              <ZhkMap
                blocks={objects}
                onBlockClick={(slug) => (window.location.href = `/complex/${slug}`)}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
