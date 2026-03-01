/**
 * Blocks (ЖК) API — GET /api/v1/blocks (paginated list).
 */

import api from "./api";

export interface BlockListItem {
  id: string;
  name: string;
  address?: string | null;
  is_city?: boolean;
  district?: { id: string; name: string };
  builder?: { id: string; name: string };
  geo?: { lat: number | null; lng: number | null };
  price_from: number | null;
  price_per_m2_from: number | null;
  units_count: number;
  deadline_at: string | null;
  deadline_label: string | null;
  images: string[];
  subways?: Array<{ id: string; name: string; line_name: string; line_color?: string; travel_time?: number; travel_type?: number | string }>;
  room_prices?: Record<string, number>;
}

export interface BlocksResponse {
  data: BlockListItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links?: Record<string, string | null>;
}

export interface BlocksParams {
  page?: number;
  per_page?: number;
  sort?: "price_from" | "deadline" | "name";
  order?: "asc" | "desc";
  district?: string[];
  builder?: string[];
  is_city?: boolean;
  search?: string;
  deadline_from?: string;
  deadline_to?: string;
}

export async function getBlocks(params: BlocksParams = {}): Promise<BlocksResponse> {
  const { data } = await api.get<BlocksResponse>("/blocks", { params });
  return data;
}
