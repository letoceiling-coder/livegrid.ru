/**
 * Apartments API — apartment detail and list from backend.
 * Base: https://livegrid.ru/api/v1 (or VITE_API_URL).
 */

import api from '@/lib/api';
import type { ApartmentListItem, PaginatedApartments, PaginationMeta } from '@/types/apartment';

export interface ApartmentsListParams {
  page?: number;
  per_page?: number;
  [key: string]: unknown;
}

/** GET /api/v1/apartments — paginated list */
export async function getApartments(
  params: ApartmentsListParams = {},
  signal?: AbortSignal
): Promise<{ data: ApartmentListItem[]; meta: PaginationMeta }> {
  const { data } = await api.get<PaginatedApartments>('/apartments', {
    params: { ...params, per_page: params.per_page ?? 20 },
    signal,
  });
  const raw = data as unknown as PaginatedApartments;
  return {
    data: raw?.data ?? [],
    meta: raw?.meta ?? { current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null },
  };
}

/** GET /api/v1/apartments/{id} — single apartment by id (24 hex) */
export async function getApartment(id: string): Promise<ApartmentListItem> {
  const { data } = await api.get<ApartmentListItem | { data: ApartmentListItem }>(`/apartments/${id}`);
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: ApartmentListItem }).data : data) as ApartmentListItem;
}
