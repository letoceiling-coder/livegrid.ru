export interface ResidentialComplex {
  id: string;
  slug: string;
  name: string;
  description: string;
  builder: string;
  district: string;
  subway: string;
  subwayDistance: string;
  address: string;
  deadline: string;
  status: 'building' | 'completed' | 'planned';
  priceFrom: number;
  priceTo: number;
  images: string[];
  coords: [number, number];
  advantages: string[];
  infrastructure: string[];
  buildings: Building[];
}

export interface Building {
  id: string;
  complexId: string;
  name: string;
  floors: number;
  sections: number;
  deadline: string;
  apartments: Apartment[];
}

export interface Apartment {
  id: string;
  complexId: string;
  buildingId: string;
  rooms: number;
  area: number;
  kitchenArea: number;
  floor: number;
  totalFloors: number;
  price: number;
  pricePerMeter: number;
  finishing: 'без отделки' | 'черновая' | 'чистовая' | 'под ключ';
  status: 'available' | 'reserved' | 'sold';
  planImage: string;
  section: number;
}

export interface LayoutGroup {
  id: string;
  complexId: string;
  rooms: number;
  area: number;
  priceFrom: number;
  planImage: string;
  availableCount: number;
}

export type SortField = 'price' | 'area' | 'floor' | 'rooms';
export type SortDir = 'asc' | 'desc';

export interface CatalogFilters {
  priceMin?: number;
  priceMax?: number;
  rooms: number[];
  areaMin?: number;
  areaMax?: number;
  district: string[];
  subway: string[];
  builder: string[];
  finishing: string[];
  deadline: string[];
  floorMin?: number;
  floorMax?: number;
  status: string[];
  search: string;
}

export const defaultFilters: CatalogFilters = {
  rooms: [],
  district: [],
  subway: [],
  builder: [],
  finishing: [],
  deadline: [],
  status: [],
  search: '',
};

/** Apartment catalog filters (API params for GET /apartments) */
export interface ApartmentCatalogFilters {
  search: string;
  district: string[];
  builder: string[];
  subway: string[];
  finishing: string[];
  room: number[];
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
  deadline_from: string;
  deadline_to: string;
  sort: 'price' | 'area_total' | 'building_deadline_at' | 'floor';
  order: 'asc' | 'desc';
  page: number;
  per_page: number;
}

/** Block catalog filters (API params for GET /blocks) */
export interface CatalogBlockFilters {
  search: string;
  district: string[];
  builder: string[];
  subway: string[];
  room: number[];
  deadline_from: string;
  deadline_to: string;
  price_max: number | null;
  sort: 'price_from' | 'deadline' | 'name';
  order: 'asc' | 'desc';
  page: number;
  per_page: number;
}
