import { useEffect, useState } from 'react';
import api from '@/lib/api';

export interface District {
  id: string;
  name: string;
}

export interface Builder {
  id: string;
  name: string;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface DeadlineRange {
  min: string | null;
  max: string | null;
}

export interface BlockFiltersData {
  districts: District[];
  builders: Builder[];
  price: PriceRange;
  deadline: DeadlineRange;
}

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
    api
      .get<{ data: BlockFiltersData }>('/blocks/filters')
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setFilters(data);
      })
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
