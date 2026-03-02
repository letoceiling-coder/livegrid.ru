import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { formatArea, formatPrice } from '@/lib/format';
import { type PropertyData } from '@/components/PropertyCard';
import {
  type ApartmentListItem,
  type PaginatedApartments,
  type PaginationMeta,
} from '@/types/apartment';

// ── Filters shape ─────────────────────────────────────────────────────────────

export interface ApartmentFilters {
  search?: string;
  room?: number[];
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
  floor_min?: number;
  floor_max?: number;
  district?: string[];
  builder?: string[];
  finishing?: string[];
  deadline_from?: string;
  deadline_to?: string;
  is_city?: boolean;
  is_hot?: boolean;
  is_start_sales?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: 'price' | 'area_total' | 'building_deadline_at' | 'floor';
  order?: 'asc' | 'desc';
}

// ── Result shape ──────────────────────────────────────────────────────────────

export interface UseApartmentsResult {
  items: PropertyData[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
}

// ── Transform: API item → PropertyData ───────────────────────────────────────

/**
 * Maps a single ApartmentListItem from the API to the PropertyData shape
 * expected by PropertyCard.
 *
 * Mapping:
 *   image   = plan_url (floor plan)
 *   title   = "<room_label> · <area> м²"   e.g. "2-комнатная · 63.2 м²"
 *   price   = formatPrice(price)            e.g. "от 5.6 млн"
 *   address = block.name                    e.g. "ЖК Смородина"
 *   area    = formatArea(area.total)        e.g. "63.2 м²"
 *   rooms   = room_label                    e.g. "2-комнатная"
 *   slug    = id                            UUID for /object/:slug route
 */
function toPropertyData(apt: ApartmentListItem): PropertyData {
  // Resolve room label: prefer API value, fall back to numeric derivation
  const roomLabel =
    apt.room_label ??
    (apt.room === 0 ? 'Студия' : apt.room != null ? `${apt.room}-комн.` : '—');

  const areaTotal = apt.area?.total ?? null;

  return {
    image:   apt.plan_url ?? '',
    title:   `${roomLabel} · ${formatArea(areaTotal)}`,
    price:   formatPrice(apt.price),
    address: apt.block?.name ?? '—',
    area:    formatArea(areaTotal),
    rooms:   roomLabel,
    slug:    apt.id,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated apartment list from GET /api/v1/apartments.
 *
 * @param filters  Query-param filters (optional, stable reference recommended)
 * @param page     Current page number (1-based)
 * @param perPage  Items per page (matches backend per_page param)
 */
export function useApartments(
  filters: ApartmentFilters = {},
  page: number = 1,
  perPage: number = 15,
): UseApartmentsResult {
  const [items, setItems]   = useState<PropertyData[]>([]);
  const [meta, setMeta]     = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // Stable serialisation key — avoids infinite loops from object identity
  const filtersKey = JSON.stringify(filters);

  // Track in-flight request for cancellation
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    console.log('[useApartments] Starting fetch', { filters, page, perPage, baseURL: import.meta.env.VITE_API_URL });

    setLoading(true);
    setError(null);

    api
      .get<PaginatedApartments>('/apartments', {
        params: {
          ...filters,
          page,
          per_page: perPage,
        },
        signal: controller.signal,
      })
      .then((res) => {
        console.log('[useApartments] Success', { dataLength: res.data?.data?.length });
        // The axios interceptor does NOT unwrap paginator responses
        // (no `success` key) — res.data IS the full paginator object.
        const paginator = res.data as unknown as PaginatedApartments;
        const rawItems  = paginator?.data ?? [];

        // DEBUG: Проверка типов первого элемента
        if (rawItems.length > 0) {
          const first = rawItems[0];
          console.log('[useApartments] First item types:', {
            price: typeof first.price,
            priceValue: first.price,
            areaTotal: typeof first.area?.total,
            areaTotalValue: first.area?.total,
          });
        }

        setItems(rawItems.map(toPropertyData));
        setMeta(paginator?.meta ?? null);
      })
      .catch((err) => {
        // Ignore AbortError from cancelled requests
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        console.error('[useApartments] Error', err);
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки квартир';
        setError(msg);
        setItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page, perPage]);

  return { items, meta, loading, error };
}
