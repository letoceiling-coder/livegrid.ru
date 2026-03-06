import { useEffect, useState } from 'react';
import { getFilters } from '@/api/filtersApi';

// ── Filter data types ─────────────────────────────────────────────────────────

export interface FilterOption {
  value: number | string;
  label: string;
}

export interface FilterRange {
  min: number;
  max: number;
}

export interface FilterDeadlineRange {
  min: string | null;
  max: string | null;
}

export interface FiltersData {
  rooms: FilterOption[];
  districts: Array<{ id: string; name: string }>;
  builders: Array<{ id: string; name: string }>;
  finishings: Array<{ id: string; name: string }>;
  price: FilterRange;
  area: FilterRange;
  floor: FilterRange;
  deadline: FilterDeadlineRange;
}

// ── Result shape ──────────────────────────────────────────────────────────────

export interface UseFiltersResult {
  filters: FiltersData | null;
  loading: boolean;
  error: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches filter options from GET /api/v1/filters.
 *
 * Returns available filter options for rooms, districts, builders, finishings,
 * and ranges for price, area, floor, and deadline.
 */
export function useFilters(): UseFiltersResult {
  const [filters, setFilters] = useState<FiltersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFilters()
      .then((filtersData) => setFilters(filtersData as FiltersData))
      .catch((err) => {
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки фильтров';
        setError(msg);
        setFilters(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { filters, loading, error };
}
