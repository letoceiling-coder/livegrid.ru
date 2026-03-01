/**
 * Apartments API — GET /api/v1/apartments (paginated list).
 * Response: { data: ApartmentListItem[], meta: { current_page, last_page, per_page, total }, links }.
 */

import api from "./api";

export interface ApartmentListItem {
  id: string;
  room: number;
  room_label: string;
  floor?: number;
  floors_total?: number;
  area: { total: number };
  price: number;
  plan_url?: string | null;
  block: {
    id: string;
    name: string;
    district?: { name?: string };
    builder?: { name?: string };
  };
  building?: { deadline_at?: string | null };
}

export interface ApartmentsResponse {
  data: ApartmentListItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links?: Record<string, string | null>;
}

export interface ApartmentsParams {
  page?: number;
  per_page?: number;
  sort?: "price" | "area_total" | "building_deadline_at" | "floor";
  order?: "asc" | "desc";
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
  room?: number[];
  search?: string;
}

export async function getApartments(params: ApartmentsParams = {}): Promise<ApartmentsResponse> {
  const { data } = await api.get<ApartmentsResponse>("/apartments", { params });
  return data;
}
