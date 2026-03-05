import { useEffect, useState } from 'react';
import { getBlockFilters, type BlockFiltersData } from '@/api/blocksApi';

export type { BlockFiltersData };
export type District = BlockFiltersData['districts'][number];
export type Builder = BlockFiltersData['builders'][number];
export type PriceRange = BlockFiltersData['price'];
export type DeadlineRange = BlockFiltersData['deadline'];

export interface UseBlockFiltersResult {
  filters: BlockFiltersData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches available filter options for blocks (ЖК) from GET /api/v1/blocks/filters.
 * Filters include: districts, builders, price range, deadline range.
 */
export function useBlockFilters(): UseBlockFiltersResult {
  const [filters, setFilters] = useState<BlockFiltersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBlockFilters()
      .then((data) => setFilters(data))
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки фильтров';
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { filters, loading, error };
}
