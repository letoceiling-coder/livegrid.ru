/**
 * useCatalogFilters — block filter options for catalog.
 * Uses blocksApi.getBlockFilters(). Fallback to filtersApi for builders if empty.
 */

import { useQuery } from '@tanstack/react-query';
import { getBlockFilters } from '@/api/blocksApi';
import { getFilters } from '@/api/filtersApi';

export function useCatalogFilters() {
  const query = useQuery({
    queryKey: ['block-filters'],
    queryFn: async () => {
      const data = await getBlockFilters();
      if (data.builders.length === 0) {
        try {
          const filters = await getFilters();
          if (filters.builders?.length) {
            return { ...data, builders: filters.builders };
          }
        } catch { /* ignore */ }
      }
      return data;
    },
  });

  return {
    filters: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message ?? 'Ошибка загрузки фильтров' : null,
    refetch: query.refetch,
  };
}
