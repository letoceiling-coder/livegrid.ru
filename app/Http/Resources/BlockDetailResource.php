<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

/**
 * Full Block resource for GET /api/v1/blocks/{id} (detail).
 *
 * Extends BlockListResource with:
 *  - description
 *  - area_from / area_to
 *  - buildings list
 *  - builder extended info (logo_url)
 *  - all subways (not capped to 3)
 *  - room_groups: apartments grouped by room type with price/area aggregates
 */
class BlockDetailResource extends BlockListResource
{
    public function toArray(Request $request): array
    {
        // Start with all list fields
        $base = parent::toArray($request);

        return array_merge($base, [
            // ── Extra scalar fields ──────────────────────────────────────────
            'description' => $this->description,
            'status'      => $this->status,

            // ── Area range (aggregated from apartments) ───────────────────────
            'area_from' => $this->area_from !== null ? (float) $this->area_from : null,
            'area_to'   => $this->area_to   !== null ? (float) $this->area_to   : null,

            // ── Builder with logo ─────────────────────────────────────────────
            'builder_info' => $this->whenLoaded('builder', fn () =>
                $this->builder ? [
                    'id'       => $this->builder->id,
                    'name'     => $this->builder->name,
                    'logo_url' => $this->builder->logo_url,
                ] : null
            ),

            // ── Buildings list ────────────────────────────────────────────────
            'buildings' => $this->whenLoaded('buildings', fn () =>
                $this->buildings->map(fn ($b) => [
                    'id'             => $b->id,
                    'name'           => $b->name,
                    'floors_total'   => $b->floors_total,
                    'deadline_at'    => $b->deadline_at?->toDateString(),
                    'deadline_label' => $this->formatDeadlineLabel($b->deadline_at?->toDateString()),
                    'status'         => $b->status,
                    'geo' => [
                        'lat' => $b->lat !== null ? (float) $b->lat : null,
                        'lng' => $b->lng !== null ? (float) $b->lng : null,
                    ],
                ])->values()
            ),

            // ── All subways (override list's capped version) ──────────────────
            'subways' => $this->whenLoaded('subways', fn () =>
                $this->subways->map(fn ($s) => [
                    'id'          => $s->id,
                    'name'        => $s->name,
                    'line_name'   => $s->line_name,
                    'line_color'  => $s->line_color,
                    'travel_time' => $s->pivot->travel_time,
                    'travel_type' => $s->pivot->travel_type,
                ])->values()
            ),

            // ── Apartments grouped by room type ───────────────────────────────
            // Each group: { room, room_label, count, price_from, area_from, area_to }
            'room_groups' => collect($this->room_groups ?? [])
                ->map(fn ($g) => [
                    'room'       => (int) $g->room,
                    'room_label' => $g->room_label ?? 'Студия',
                    'count'      => (int) $g->count,
                    'price_from' => $g->price_from !== null ? (float) $g->price_from : null,
                    'area_from'  => $g->area_from  !== null ? (float) $g->area_from  : null,
                    'area_to'    => $g->area_to    !== null ? (float) $g->area_to    : null,
                ])
                ->values(),
        ]);
    }
}
