<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Lightweight Apartment resource for the list endpoint (GET /api/v1/apartments).
 *
 * Rules:
 *  - Only fields required to render a PropertyCard on the frontend.
 *  - All block/district/builder values are denormalized columns → zero JOINs, zero N+1.
 *  - No eager-loaded relations (finishing, buildingType, roomType are excluded).
 *  - room_label is computed locally to avoid the roomType relation entirely.
 *
 * Compatible key names with ApartmentResource so the frontend contract is stable.
 */
class ApartmentListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,

            // ── Room (rooms = normalized for display, e.g. 22→2) ─────────────
            'room'         => $this->room,
            'rooms'        => $this->normalizeRoomForDisplay((int) (is_object($this->resource) ? $this->resource->room : $this->room)),
            'room_label'   => $this->resolveRoomLabel(),

            // ── Physical ─────────────────────────────────────────────────────
            'floor'        => $this->floor,
            'floors_total' => $this->floors_total,

            // ── Area (total only — card needs nothing else) ───────────────────
            'area' => [
                'total' => $this->area_total,
            ],

            // ── Price ─────────────────────────────────────────────────────────
            'price' => $this->price,

            // ── Media ─────────────────────────────────────────────────────────
            'plan_url' => $this->plan_url,

            // ── Block — fully denormalized, no JOIN needed ────────────────────
            'block' => [
                'id'   => $this->block_id,
                'name' => $this->block_name,
                'district' => [
                    'name' => $this->block_district_name,
                ],
                'builder' => [
                    'name' => $this->block_builder_name,
                ],
            ],

            // ── Building ──────────────────────────────────────────────────────
            'building' => [
                'deadline_at' => $this->resolveDeadlineAt(),
            ],
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Compute a human-readable room label from the integer room column.
     * Normalizes feed errors: 22→2, 23→3, 24→4, 25→5 (floor+room concatenation).
     */
    private function resolveRoomLabel(): string
    {
        $room = is_object($this->resource) ? $this->resource->room : $this->room;
        $room = (int) $room;
        $room = $this->normalizeRoomForDisplay($room);

        return match ($room) {
            0       => 'Студия',
            1       => '1-к. кв.',
            2       => '2-к. кв.',
            3       => '3-к. кв.',
            4       => '4-к. кв.',
            5       => '5-к. кв.',
            default => $room . '-к. кв.',
        };
    }

    /**
     * Normalize feed errors: 22, 23, 24, 25 → 2, 3, 4, 5 (floor+room concat).
     */
    private function normalizeRoomForDisplay(int $room): int
    {
        if ($room >= 20 && $room <= 29) {
            return $room % 10;
        }
        return $room;
    }

    /**
     * Resolve deadline_at from stdClass (DB::table) or Eloquent model.
     */
    private function resolveDeadlineAt(): ?string
    {
        // Access property from stdClass (DB::table) or Eloquent model
        $deadline = $this->resource->building_deadline_at ?? $this->building_deadline_at ?? null;
        
        if ($deadline === null) {
            return null;
        }

        // If it's a Carbon instance (Eloquent), convert to date string
        if (is_object($deadline) && method_exists($deadline, 'toDateString')) {
            return $deadline->toDateString();
        }

        // If it's already a string (DB::table result), return as-is
        if (is_string($deadline)) {
            return $deadline;
        }

        return null;
    }
}
