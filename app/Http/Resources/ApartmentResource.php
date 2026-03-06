<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API Resource for Apartment.
 * Shapes the JSON output for GET /api/v1/apartments and /api/v1/apartments/{id}.
 */
class ApartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'crm_id'      => $this->crm_id,

            // Rooms (room = raw from DB; rooms = normalized for display, e.g. 22→2)
            'room'        => $this->room,
            'rooms'       => $this->normalizeRoomForDisplay((int) $this->room),
            'room_label'  => $this->whenLoaded('roomType', fn () => $this->roomType?->name) ?? $this->resolveRoomLabel(),

            // Physical
            'floor'       => $this->floor,
            'floors_total' => $this->floors_total,
            'number'      => $this->number,
            'wc_count'    => $this->wc_count,

            // Areas
            'area' => [
                'total'    => $this->area_total,
                'living'   => $this->area_living,
                'kitchen'  => $this->area_kitchen,
                'given'    => $this->area_given,
                'balconies' => $this->area_balconies,
                'rooms'    => $this->area_rooms,        // "17+12.6" string
                'rooms_total' => $this->area_rooms_total,
            ],

            // Price
            'price'           => $this->price,
            'price_per_meter' => $this->price_per_meter,

            // Type & finishing
            'finishing' => [
                'id'   => $this->finishing_id,
                'name' => $this->whenLoaded('finishing', fn () => $this->finishing?->name),
            ],
            'building_type' => [
                'id'   => $this->building_type_id,
                'name' => $this->whenLoaded('buildingType', fn () => $this->buildingType?->name),
            ],

            // Media
            'plan_url' => $this->plan_url,

            // Block (residential complex) — denormalized + eager-loaded extras
            'block' => [
                'id'          => $this->block_id,
                'name'        => $this->block_name,
                'is_city'     => $this->block_is_city,
                'description' => $this->whenLoaded('block', fn () => $this->block?->description),
                'address'     => $this->whenLoaded('block', fn () => $this->block?->address),
                'images'      => $this->whenLoaded('block', fn () => $this->block?->images ?? []),
                'district' => [
                    'id'   => $this->block_district_id,
                    'name' => $this->block_district_name,
                ],
                'builder' => [
                    'id'   => $this->block_builder_id,
                    'name' => $this->block_builder_name,
                ],
                'geo' => [
                    'lat' => $this->block_lat,
                    'lng' => $this->block_lng,
                ],
            ],

            // Building — load relation for name/queue/floors_total/height
            'building' => [
                'id'           => $this->building_id,
                'name'         => $this->whenLoaded('building', fn () => $this->building?->name),
                'queue'        => $this->whenLoaded('building', fn () => $this->building?->queue),
                'floors_total' => $this->whenLoaded('building', fn () => $this->building?->floors_total),
                'height'       => $this->whenLoaded('building', fn () => $this->building?->height),
                'deadline_at'  => $this->building_deadline_at?->toDateString(),
                'banks'        => $this->whenLoaded('building', fn () => $this->building?->banks ?? []),
            ],
        ];
    }

    /**
     * Fallback room label when roomType is null. Normalizes 22→2, 23→3 etc.
     */
    private function resolveRoomLabel(): string
    {
        $room = $this->normalizeRoomForDisplay((int) $this->room);
        return match ($room) {
            0 => 'Студия',
            1 => '1-к. кв.',
            2 => '2-к. кв.',
            3 => '3-к. кв.',
            4 => '4-к. кв.',
            5 => '5-к. кв.',
            default => $room . '-к. кв.',
        };
    }

    private function normalizeRoomForDisplay(int $room): int
    {
        return ($room >= 20 && $room <= 29) ? $room % 10 : $room;
    }
}
