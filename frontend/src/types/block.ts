/**
 * Types matching GET /api/v1/blocks (BlockListResource).
 */

export interface BlockListItem {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  is_city: boolean;

  district: {
    id: string | null;
    name: string | null;
  };

  builder: {
    id: string | null;
    name: string | null;
  };

  geo: {
    lat: number | null;
    lng: number | null;
  };

  /** Minimum apartment price in this block (materialized aggregate) */
  price_from: number | null;
  price_per_m2_from: number | null;
  units_count: number;

  /** Earliest building deadline (ISO date string) */
  deadline_at: string | null;
  /** Pre-formatted deadline label (e.g. "I кв. 2026") */
  deadline_label: string | null;

  /** Array of image URLs */
  images: string[];

  /** Subways (eager-loaded in list endpoint) */
  subways?: Array<{
    id: string;
    name: string;
    line_name: string;
    line_color: string;
    travel_time: number;
    travel_type: string;
  }>;

  /** Min prices by room type: key = room number (0=studio, 1=1к, 2=2к...) */
  room_prices?: Record<string, number>;

  /** Room type groups for card overlay (room_label, price_from, area_from) */
  room_groups?: Array<{
    room: number;
    room_label: string;
    price_from: number | null;
    area_from: number | null;
    area_to?: number | null;
  }>;
}

/** Laravel paginator meta block (reused from apartment types) */
export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  links: Array<{
    url: string | null;
    label: string;
    active: boolean;
  }>;
  path: string;
}

/** Full Laravel paginated response shape */
export interface PaginatedBlocks {
  data: BlockListItem[];
  meta: PaginationMeta;
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}

/**
 * Types matching GET /api/v1/blocks/{id} (BlockDetailResource).
 * Extends BlockListItem with additional detail fields.
 */
export interface BlockDetail extends BlockListItem {
  /** Project description */
  description: string | null;
  /** Project status */
  status: string | null;

  /** Area range (aggregated from apartments) */
  area_from: number | null;
  area_to: number | null;

  /** Builder with logo */
  builder_info: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;

  /** Buildings list */
  buildings: Array<{
    id: string;
    name: string;
    floors_total: number | null;
    deadline_at: string | null;
    deadline_label: string | null;
    status: string | null;
    geo: {
      lat: number | null;
      lng: number | null;
    };
  }>;

  /** Apartments grouped by room type */
  room_groups: Array<{
    room: number;
    room_label: string;
    count: number;
    price_from: number | null;
    area_from: number | null;
    area_to: number | null;
  }>;
}
