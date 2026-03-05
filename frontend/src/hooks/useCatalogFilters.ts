/**
 * useCatalogFilters — block filter options for catalog.
 * Uses API layer: blocksApi.getBlockFilters().
 */

import { useQuery } from '@tanstack/react-query';
import { getBlockFilters } from '@/api/blocksApi';

export function useCatalogFilters() {
  const query = useQuery({
    queryKey: ['block-filters'],
    queryFn: getBlockFilters,
  });

  return {
    filters: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message ?? 'Ошибка загрузки фильтров' : null,
    refetch: query.refetch,
  };
}
