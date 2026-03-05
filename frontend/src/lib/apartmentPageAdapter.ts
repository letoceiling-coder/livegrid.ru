/**
 * Maps API ApartmentListItem to display shape for RedesignApartment page.
 */

import type { ApartmentListItem } from '@/types/apartment';
import type { Apartment, Building, ResidentialComplex } from '@/redesign/data/types';

function mapFinishing(name: string | null): Apartment['finishing'] {
  if (!name) return 'без отделки';
  const lower = name.toLowerCase();
  if (lower.includes('без') || lower.includes('чернов')) return 'без отделки';
  if (lower.includes('чернов')) return 'черновая';
  if (lower.includes('чистов')) return 'чистовая';
  if (lower.includes('ключ')) return 'под ключ';
  return 'без отделки';
}

function formatDeadline(date: string | null): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    const qMap: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
    return `${qMap[q] ?? ''} кв. ${d.getFullYear()}`;
  } catch {
    return date;
  }
}

export function mapApartmentToPageDisplay(
  raw: ApartmentListItem,
): { apartment: Apartment; complex: ResidentialComplex; building: Building } {
  const block = raw.block ?? { id: '', name: '', address: '', district: { name: '' }, builder: { name: '' }, geo: { lat: null, lng: null } };
  const bld = raw.building ?? { id: '', name: '', floors_total: null, deadline_at: null };
  const areaTotal = raw.area?.total ?? 0;
  const price = raw.price ?? 0;

  const apartment: Apartment = {
    id: raw.id,
    complexId: block.id,
    buildingId: bld.id,
    rooms: raw.room ?? 0,
    area: areaTotal,
    kitchenArea: raw.area?.kitchen ?? 0,
    floor: raw.floor ?? 1,
    totalFloors: raw.floors_total ?? 1,
    price,
    pricePerMeter: raw.price_per_meter ?? (areaTotal > 0 ? Math.round(price / areaTotal) : 0),
    finishing: mapFinishing(raw.finishing?.name ?? null),
    status: 'available',
    planImage: raw.plan_url ?? '/placeholder.svg',
    section: 1,
  };

  const building: Building = {
    id: bld.id,
    complexId: block.id,
    name: bld.name ?? 'Корпус',
    floors: bld.floors_total ?? 1,
    sections: 1,
    deadline: formatDeadline(bld.deadline_at),
    apartments: [],
  };

  const complex: ResidentialComplex = {
    id: block.id,
    slug: block.id,
    name: block.name ?? '',
    description: '',
    builder: block.builder?.name ?? '',
    district: block.district?.name ?? '',
    subway: '',
    subwayDistance: '',
    address: block.address ?? '',
    deadline: formatDeadline(bld.deadline_at),
    status: 'building',
    priceFrom: price,
    priceTo: price,
    images: block.images ?? [],
    coords: [block.geo?.lat ?? 55.75, block.geo?.lng ?? 37.62],
    advantages: [],
    infrastructure: [],
    buildings: [building],
  };

  return { apartment, complex, building };
}
