/**
 * Blocks (ЖК / residential complexes) API — all block-related backend calls.
 * Base: https://livegrid.ru/api/v1 (or VITE_API_URL).
 */

import api from '@/lib/api';
import type { BlockDetail, BlockListItem, PaginatedBlocks, PaginationMeta } from '@/types/block';
import type { ApartmentListItem, PaginatedApartments } from '@/types/apartment';
export interface BlockFiltersData {
  districts: Array<{ id: string; name: string }>;
  builders: Array<{ id: string; name: string }>;
  price: { min: number; max: number };
  deadline: { min: string | null; max: string | null };
}

export interface BlockListParams {
  district?: string[];
  builder?: string[];
  is_city?: boolean;
  search?: string;
  deadline_from?: string;
  deadline_to?: string;
  sort?: 'price_from' | 'deadline' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface BlockApartmentsParams {
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
  page?: number;
  per_page?: number;
}

export interface MapBlockItem {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  price_from: number | null;
  units_count: number;
  image: string | null;
}

/** GET /api/v1/blocks — paginated list */
export async function getBlocks(
  params: BlockListParams = {},
  signal?: AbortSignal
): Promise<{ data: BlockListItem[]; meta: PaginationMeta }> {
  const { data } = await api.get<PaginatedBlocks>('/blocks', {
    params: { ...params, per_page: params.per_page ?? 20 },
    signal,
  });
  const raw = data as unknown as PaginatedBlocks;
  return { data: raw?.data ?? [], meta: raw?.meta ?? { current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null, links: [], path: '' } };
}

/** GET /api/v1/blocks/{slug} — single block by slug or id */
export async function getComplex(slug: string, signal?: AbortSignal): Promise<BlockDetail> {
  const { data } = await api.get<BlockDetail | { data: BlockDetail }>(`/blocks/${slug}`, { signal });
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: BlockDetail }).data : data) as BlockDetail;
}

/** GET /api/v1/blocks/{slug}/apartments — apartments in block */
export async function getComplexApartments(
  slug: string,
  params: BlockApartmentsParams = {}
): Promise<{ data: ApartmentListItem[]; meta: PaginatedApartments['meta'] }> {
  const { data } = await api.get<PaginatedApartments>(`/blocks/${slug}/apartments`, {
    params: { ...params, per_page: params.per_page ?? 20 },
  });
  const raw = data as unknown as PaginatedApartments;
  return { data: raw?.data ?? [], meta: raw?.meta ?? { current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null } };
}

/** GET /api/v1/blocks/filters — filter options for catalog */
export async function getBlockFilters(): Promise<BlockFiltersData> {
  const { data } = await api.get<{ data?: BlockFiltersData } | BlockFiltersData>('/blocks/filters');
  const raw = data as { data?: BlockFiltersData } | BlockFiltersData;
  return ('data' in raw && raw.data) ? raw.data : (raw as BlockFiltersData);
}
