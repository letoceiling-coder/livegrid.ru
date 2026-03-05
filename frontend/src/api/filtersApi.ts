/**
 * Filters API — filter options for apartments and blocks.
 * Base: https://livegrid.ru/api/v1 (or VITE_API_URL).
 */

import api from '@/lib/api';

export interface FiltersDataResponse {
  rooms: Array<{ value: number | string; label: string }>;
  districts: Array<{ id: string; name: string }>;
  builders: Array<{ id: string; name: string }>;
  finishings: Array<{ id: string; name: string }>;
  price: { min: number; max: number };
  area: { min: number; max: number };
  floor: { min: number; max: number };
  deadline: { min: string | null; max: string | null };
}

/** GET /api/v1/filters — apartment filter options (rooms, districts, builders, etc.) */
export async function getFilters(): Promise<FiltersDataResponse> {
  const { data } = await api.get<{ data?: FiltersDataResponse } | FiltersDataResponse>('/filters');
  const raw = data as { data?: FiltersDataResponse } | FiltersDataResponse;
  return ('data' in raw && raw.data) ? raw.data : (raw as FiltersDataResponse);
}
