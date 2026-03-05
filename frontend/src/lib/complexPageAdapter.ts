/**
 * Maps BlockDetail + ApartmentListItem[] to ResidentialComplex for RedesignComplex page.
 */

import type { BlockDetail } from '@/types/block';
import type { ApartmentListItem } from '@/types/apartment';
import type { ResidentialComplex, Building, Apartment } from '@/redesign/data/types';

const FINISHING_MAP: Record<string, Apartment['finishing']> = {
  'без отделки': 'без отделки',
  'черновая': 'черновая',
  'чистовая': 'чистовая',
  'под ключ': 'под ключ',
};

function mapFinishing(name: string | null): Apartment['finishing'] {
  if (!name) return 'без отделки';
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(FINISHING_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return 'без отделки';
}

function mapApartment(a: ApartmentListItem, complexId: string): Apartment {
  const areaTotal = a.area?.total ?? 0;
  const price = a.price ?? 0;
  return {
    id: a.id,
    complexId,
    buildingId: a.building?.id ?? '',
    rooms: a.room ?? 0,
    area: areaTotal,
    kitchenArea: a.area?.kitchen ?? 0,
    floor: a.floor ?? 1,
    totalFloors: a.floors_total ?? 1,
    price,
    pricePerMeter: areaTotal > 0 ? Math.round(price / areaTotal) : 0,
    finishing: mapFinishing(a.finishing?.name ?? null),
    status: 'available',
    planImage: a.plan_url ?? '/placeholder.svg',
    section: 1,
  };
}

export function mapBlockDetailToComplex(
  block: BlockDetail,
  apartments: ApartmentListItem[],
): ResidentialComplex {
  const lat = block.geo?.lat ?? 55.75;
  const lng = block.geo?.lng ?? 37.62;
  const subways = block.subways ?? [];
  const firstSubway = subways[0];
  const deadline = block.deadline_label ?? (block.deadline_at ? new Date(block.deadline_at).toLocaleDateString('ru-RU') : '');
  const images = block.images && block.images.length > 0 ? block.images : ['/placeholder.svg'];

  // Group apartments by building
  const aptsByBuilding = apartments.reduce<Record<string, Apartment[]>>((acc, a) => {
    const bid = a.building?.id ?? 'unknown';
    if (!acc[bid]) acc[bid] = [];
    acc[bid].push(mapApartment(a, block.id));
    return acc;
  }, {});

  const blockBuildings = block.buildings ?? [];
  const buildingIds = new Set([...blockBuildings.map((b) => b.id), ...Object.keys(aptsByBuilding)]);
  const buildings: Building[] = Array.from(buildingIds).map((bid) => {
    const b = blockBuildings.find((x) => x.id === bid);
    const apts = aptsByBuilding[bid] ?? [];
    const firstApt = apartments.find((a) => a.building?.id === bid);
    const floors = b?.floors_total ?? firstApt?.floors_total ?? 1;
    return {
      id: bid,
      complexId: block.id,
      name: b?.name ?? firstApt?.building?.name ?? 'Корпус',
      floors,
      sections: 1,
      deadline: b?.deadline_label ?? firstApt?.building?.deadline_at ?? '',
      apartments: apts,
    };
  });

  return {
    id: block.id,
    slug: block.slug ?? block.id,
    name: block.name,
    description: block.description ?? '',
    builder: block.builder?.name ?? '',
    district: block.district?.name ?? '',
    subway: firstSubway?.name ?? '',
    subwayDistance: firstSubway ? `${firstSubway.travel_time ?? ''} мин` : '',
    address: block.address ?? '',
    deadline,
    status: (block.status === 'completed' ? 'completed' : block.status === 'planned' ? 'planned' : 'building') as ResidentialComplex['status'],
    priceFrom: block.price_from ?? 0,
    priceTo: apartments.length > 0
      ? Math.max(...apartments.map((a) => a.price ?? 0), block.price_from ?? 0)
      : block.price_from ?? 0,
    images,
    coords: [lat, lng],
    advantages: [],
    infrastructure: [],
    buildings,
  };
}
