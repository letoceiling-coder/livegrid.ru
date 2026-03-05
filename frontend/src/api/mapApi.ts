/**
 * Map API — blocks for map view.
 * Base: https://livegrid.ru/api/v1 (or VITE_API_URL).
 */

import api from '@/lib/api';
import type { MapBlockItem } from '@/api/blocksApi';

export interface MapBlocksParams {
  district?: string[];
  builder?: string[];
  is_city?: boolean;
  search?: string;
  deadline_from?: string;
  deadline_to?: string;
}

/** GET /api/v1/blocks/map — blocks with lat/lng for map */
export async function getMapObjects(params: MapBlocksParams = {}): Promise<MapBlockItem[]> {
  const { data } = await api.get<{ data: MapBlockItem[] }>('/blocks/map', { params: params as Record<string, unknown> });
  const raw = data as { data?: MapBlockItem[] } | MapBlockItem[];
  if (Array.isArray(raw)) return raw;
  return raw?.data ?? [];
}
