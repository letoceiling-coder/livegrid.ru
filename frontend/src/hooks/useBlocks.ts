import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { formatPrice, formatArea } from '@/lib/format';
import { type ZhkData } from '@/components/ZhkCard';
import {
  type BlockListItem,
  type PaginatedBlocks,
  type PaginationMeta,
} from '@/types/block';

// ── Filters shape ─────────────────────────────────────────────────────────────

export interface BlockFilters {
  district?: string[];
  builder?: string[];
  is_city?: boolean;
  search?: string;
  deadline_from?: string;
  deadline_to?: string;
  sort?: 'price_from' | 'deadline' | 'name';
  order?: 'asc' | 'desc';
}

// ── Result shape ──────────────────────────────────────────────────────────────

export interface UseBlocksResult {
  blocks: ZhkData[];
  rawBlocks: BlockListItem[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
}

// ── Transform: API item → ZhkData ───────────────────────────────────────────

/**
 * Maps a single BlockListItem from the API to the ZhkData shape
 * expected by ZhkCard.
 *
 * Mapping:
 *   images     = images[] (array of image URLs)
 *   name       = name
 *   price      = formatPrice(price_from)
 *   unitsCount = `В продаже ${units_count} квартир`
 *   slug       = id
 *   badges     = block.badges ?? [] (from feed when available)
 *   apartments = from room_groups: type=room_label, area=formatArea(area_from), price=formatPrice(price_from)
 */
function toZhkData(block: BlockListItem): ZhkData {
  const price = formatPrice(block.price_from);

  const unitsCount =
    block.units_count > 0
      ? `В продаже ${block.units_count.toLocaleString('ru-RU')} ${getUnitsLabel(block.units_count)}`
      : 'Нет в продаже';

  // room_groups → ZhkApartment[] (max 4)
  const apartments: ZhkData['apartments'] = (block.room_groups ?? [])
    .slice(0, 4)
    .map((g) => ({
      type: g.room_label,
      area: g.area_from != null ? formatArea(g.area_from) : '—',
      price: g.price_from != null ? formatPrice(g.price_from) : '—',
    }));

  return {
    images: block.images && block.images.length > 0 ? block.images : [],
    name: block.name,
    price,
    unitsCount,
    slug: block.slug ?? block.id,
    badges: (block as BlockListItem & { badges?: string[] }).badges ?? [],
    apartments,
  };
}

/**
 * Returns the correct plural form for "квартир" based on count.
 * Russian pluralization rules: 1 квартира, 2-4 квартиры, 5+ квартир
 */
function getUnitsLabel(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'квартир';
  }

  if (lastDigit === 1) {
    return 'квартира';
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'квартиры';
  }

  return 'квартир';
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated block list from GET /api/v1/blocks.
 *
 * @param filters  Query-param filters (optional, stable reference recommended)
 * @param page     Current page number (1-based)
 * @param perPage  Items per page (matches backend per_page param)
 */
export function useBlocks(
  filters: BlockFilters = {},
  page: number = 1,
  perPage: number = 50,
): UseBlocksResult {
  const [blocks, setBlocks] = useState<ZhkData[]>([]);
  const [rawBlocks, setRawBlocks] = useState<BlockListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable serialisation key — avoids infinite loops from object identity
  const filtersKey = JSON.stringify(filters);

  // Track in-flight request for cancellation
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    api
      .get<PaginatedBlocks>('/blocks', {
        params: {
          ...filters,
          page,
          per_page: perPage,
        },
        signal: controller.signal,
      })
      .then((res) => {
        // The axios interceptor may unwrap responses, but paginator responses
        // should be direct. Handle both cases.
        const paginator = res.data as unknown as PaginatedBlocks;
        const rawItems = paginator?.data ?? [];

        setRawBlocks(rawItems);
        setBlocks(rawItems.map(toZhkData));
        setMeta(paginator?.meta ?? null);
      })
      .catch((err) => {
        // Ignore AbortError from cancelled requests
        if (err?.code === 'ERR_CANCELED' || err?.name === 'AbortError') return;
        const msg = err?.response?.data?.message ?? 'Ошибка загрузки объектов';
        setError(msg);
        setBlocks([]);
        setRawBlocks([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page, perPage]);

  return { blocks, rawBlocks, meta, loading, error };
}
