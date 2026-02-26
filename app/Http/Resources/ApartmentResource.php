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

            // Rooms
            'room'        => $this->room,
            'room_label'  => $this->whenLoaded('room', fn () => $this->room?->name),

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

            // Block (residential complex) — denormalized
            'block' => [
                'id'             => $this->block_id,
                'name'           => $this->block_name,
                'is_city'        => $this->block_is_city,
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

            // Building
            'building' => [
                'id'          => $this->building_id,
                'deadline_at' => $this->building_deadline_at?->toDateString(),
            ],
        ];
    }
}
