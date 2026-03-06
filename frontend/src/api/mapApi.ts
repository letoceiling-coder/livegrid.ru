/**
 * Map API — blocks for map view.
 * Base: https://livegrid.ru/api/v1 (or VITE_API_URL).
 */

import api from '@/lib/api';
import type { MapBlockItem } from '@/api/blocksApi';

export interface MapViewport {
  lat_min: number;
  lat_max: number;
  lng_min: number;
  lng_max: number;
}

export interface MapBlocksParams {
  lat_min?: number;
  lat_max?: number;
  lng_min?: number;
  lng_max?: number;
  district?: string[];
  builder?: string[];
  subway?: string[];
  room?: number[];
  is_city?: boolean;
  search?: string;
  deadline_from?: string;
  deadline_to?: string;
  price_max?: number;
}

/** GET /api/v1/blocks/map — blocks with lat/lng for map. Axios response.data = { data: [...] } */
export async function getMapObjects(params: MapBlocksParams = {}): Promise<MapBlockItem[]> {
  const response = await api.get<{ data: MapBlockItem[] }>('/blocks/map', {
    params: params as Record<string, unknown>,
  });
  const blocks = (response?.data as { data?: MapBlockItem[] })?.data ?? [];
  return Array.isArray(blocks) ? blocks : [];
}
