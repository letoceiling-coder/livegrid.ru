/**
 * Shared block display type and mapper for API BlockListItem → UI display shape.
 * Used by ComplexCard, MapSearch, RedesignIndex.
 */

import type { BlockListItem } from '@/types/block';
import type { MapBlockItem } from '@/api/blocksApi';

export interface BlockForDisplay {
  id: string;
  slug: string;
  name: string;
  images: string[];
  priceFrom: number | null;
  district: string;
  builder: string;
  address: string;
  subway: string;
  subwayDistance: string;
  deadline: string;
  coords: [number, number];
  unitsCount: number;
  roomGroups: Array<{
    room: number;
    roomLabel: string;
    priceFrom: number | null;
    areaFrom: number | null;
  }>;
}

/** Map API BlockListItem to BlockForDisplay for ComplexCard and MapSearch */
export function mapBlockToDisplay(block: BlockListItem): BlockForDisplay {
  const lat = block.geo?.lat ?? 55.75;
  const lng = block.geo?.lng ?? 37.62;
  const subways = block.subways ?? [];
  const firstSubway = subways[0];

  const deadline = block.deadline_label ?? (block.deadline_at ? new Date(block.deadline_at).toLocaleDateString('ru-RU') : '');

  return {
    id: block.id,
    slug: block.slug ?? block.id,
    name: block.name,
    images: block.images && block.images.length > 0 ? block.images : ['/placeholder.svg'],
    priceFrom: block.price_from ?? null,
    district: block.district?.name ?? '',
    builder: block.builder?.name ?? '',
    address: block.address ?? '',
    subway: firstSubway?.name ?? '',
    subwayDistance: firstSubway?.travel_time != null ? `${firstSubway.travel_time} мин` : '',
    deadline,
    coords: [lat, lng],
    unitsCount: block.units_count ?? 0,
    roomGroups: (block.room_groups ?? []).map((g) => ({
      room: g.room,
      roomLabel: g.room_label,
      priceFrom: g.price_from ?? null,
      areaFrom: g.area_from ?? null,
    })),
  };
}

/** Map MapBlockItem (from /blocks/map) to BlockForDisplay for catalog map view */
export function mapBlockItemToDisplay(b: MapBlockItem): BlockForDisplay {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    images: b.image ? [b.image] : ['/placeholder.svg'],
    priceFrom: b.price_from,
    district: '',
    builder: '',
    address: '',
    subway: '',
    subwayDistance: '',
    deadline: '',
    coords: [b.lat, b.lng],
    unitsCount: b.units_count,
    roomGroups: [],
  };
}
