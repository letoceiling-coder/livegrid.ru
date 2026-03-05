/**
 * useMapObjects — blocks for map view.
 * Uses API layer: mapApi.getMapObjects(params).
 */

import { useQuery } from '@tanstack/react-query';
import { getMapObjects, type MapBlocksParams } from '@/api/mapApi';

export function useMapObjects(params: MapBlocksParams = {}) {
  const query = useQuery({
    queryKey: ['map-objects', JSON.stringify(params)],
    queryFn: () => getMapObjects(params),
  });

  return {
    objects: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message ?? 'Ошибка загрузки карты' : null,
    isError: query.isError,
    refetch: query.refetch,
  };
}
