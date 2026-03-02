/**
 * Types matching GET /api/v1/apartments (ApartmentListResource).
 */

export interface ApartmentListItem {
  id: string;
  crm_id: number | null;

  room: number | null;
  /** Resolved room label from the rooms reference table (e.g. "Студия", "2-комнатная") */
  room_label: string | null;

  floor: number | null;
  floors_total: number | null;
  /** Apartment number (available in ApartmentResource, not in ApartmentListResource) */
  number?: string | null;
  wc_count?: number | null;

  area: {
    total: number | null;
    living?: number | null;
    kitchen?: number | null;
    given?: number | null;
    balconies?: number | null;
    rooms?: string | null;
    rooms_total?: number | null;
  };

  price: number | null;
  price_per_meter?: number | null;

  finishing: {
    id: string | null;
    name: string | null;
  };
  building_type?: {
    id: string | null;
    name: string | null;
  };

  plan_url: string | null;

  block: {
    id: string;
    name: string;
    is_city?: boolean;
    description?: string | null;
    address?: string | null;
    images?: string[] | null;
    district: {
      id: string | null;
      name: string | null;
    };
    builder: {
      id: string | null;
      name: string | null;
    };
    geo?: {
      lat: number | null;
      lng: number | null;
    };
  };

  building: {
    id: string;
    name?: string | null;
    queue?: number | null;
    floors_total?: number | null;
    height?: number | null;
    deadline_at: string | null;
    banks?: string[] | null;
  };
}

/** Laravel paginator meta block */
export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

/** Full Laravel paginated response shape */
export interface PaginatedApartments {
  data: ApartmentListItem[];
  meta: PaginationMeta;
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}
