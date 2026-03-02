import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import {
  type ApartmentListItem,
  type PaginatedApartments,
  type PaginationMeta,
} from '@/types/apartment';

// ── Filters shape ─────────────────────────────────────────────────────────────

export interface BlockApartmentFilters {
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
  room?: number[];
  finishing?: string[];
  floor_min?: number;
  floor_max?: number;
  deadline_from?: string;
  deadline_to?: string;
  sort?: 'price' | 'area_total' | 'building_deadline_at' | 'floor';
  order?: 'asc' | 'desc';
}

// ── Result shape ──────────────────────────────────────────────────────────────

export interface UseBlockApartmentsResult {
  apartments: ApartmentListItem[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches apartments for a specific block from GET /api/v1/blocks/{id}/apartments.
 *
 * @param slugOrId Block slug (e.g., "symphony-34-60f7efce519291389ab3bbc0") or ID (24 hex chars)
 * @param filters  Query-param filters (optional, stable reference recommended)
 * @param page     Current page number (1-based)
 * @param perPage  Items per page (matches backend per_page param)
 */
export function useBlockApartments(
  slugOrId: string | undefined,
  filters: BlockApartmentFilters = {},
  page: number = 1,
  perPage: number = 20,
): UseBlockApartmentsResult {
  const [apartments, setApartments] = useState<ApartmentListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable serialisation key — avoids infinite loops from object identity
  const filtersKey = JSON.stringify(filters);

  // Track in-flight request for cancellation
  const abortRef = useRef<AbortController | null>(null);

  // Extract ID from slug if needed
  const extractId = (input: string): string => {
    if (/^[a-f0-9]{24}$/i.test(input)) {
      return input;
    }
    const parts = input.split('-');
    const lastPart = parts[parts.length - 1];
    if (/^[a-f0-9]{24}$/i.test(lastPart)) {
      return lastPart;
    }
    return input.slice(-24);
  };

  useEffect(() => {
    if (!slugOrId) {
      setLoading(false);
      setError('Block ID is required');
      return;
    }

    const blockId = extractId(slugOrId);

    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    api
      .get<PaginatedApartments>(`/blocks/${blockId}/apartments`, {
        params: {
          ...filters,
          page,
          per_page: perPage,
        },
        signal: controller.signal,
      })
      .then((res) => {
        // The axios interceptor may unwrap paginator responses
        const paginator = res.data as unknown as PaginatedApartments;
        const rawItems = paginator?.data ?? [];

        setApartments(rawItems);
        setMeta(paginator?.meta ?? null);
      })
      .catch((err) => {
        // Ignore AbortError from cancelled requests
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки квартир';
        setError(msg);
        setApartments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugOrId, filtersKey, page, perPage]);

  return { apartments, meta, loading, error };
}
