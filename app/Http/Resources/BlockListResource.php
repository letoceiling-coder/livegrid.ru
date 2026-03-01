<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * Lightweight Block resource for GET /api/v1/blocks (list).
 *
 * Aggregated fields (price_from, price_per_m2_from, units_count,
 * nearest_deadline_at) are injected as virtual attributes via
 * selectSub() in BlockController::index().
 */
class BlockListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'      => $this->id,
            'slug'    => $this->slug,
            'name'    => $this->name,
            'address' => $this->address,
            'is_city' => (bool) $this->is_city,

            // ── Location ─────────────────────────────────────────────────────
            'district' => [
                'id'   => $this->district_id,
                'name' => $this->district_name,
            ],
            'builder' => [
                'id'   => $this->builder_id,
                'name' => $this->builder_name,
            ],
            'geo' => [
                'lat' => $this->lat !== null ? (float) $this->lat : null,
                'lng' => $this->lng !== null ? (float) $this->lng : null,
            ],

            // ── Aggregated from apartments (computed via selectSub) ───────────
            'price_from'        => $this->price_from !== null
                ? (float) $this->price_from
                : null,
            'price_per_m2_from' => $this->price_per_m2_from !== null
                ? (float) $this->price_per_m2_from
                : null,
            'units_count' => (int) ($this->units_count ?? 0),

            // ── Deadline (earliest across all buildings) ──────────────────────
            'deadline_at'    => $this->formatDeadlineDate($this->nearest_deadline_at),
            'deadline_label' => $this->formatDeadlineLabel($this->nearest_deadline_at),

            // ── Media ─────────────────────────────────────────────────────────
            // images is a JSON array of URLs stored in the blocks table
            'images' => $this->images ?? [],

            // ── Subways — top-3 nearest (eager loaded in index/show) ─────────────
            'subways' => $this->whenLoaded('subways', fn () =>
                $this->subways->map(fn ($s) => [
                    'id'          => $s->id,
                    'name'        => $s->name,
                    'line_name'   => $s->line_name,
                    'line_color'  => $s->line_color,
                    'travel_time' => $s->pivot->travel_time,
                    'travel_type' => $s->pivot->travel_type,
                ])->values()->take(3)->all()
            ),

            // ── Room prices (lazy-loaded via appends, available when called) ────────
            'room_prices' => $this->when(isset($this->room_prices), fn () => $this->room_prices),
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Convert a raw date string (from DB subquery) to ISO date or null.
     */
    protected function formatDeadlineDate(mixed $raw): ?string
    {
        if (! $raw) {
            return null;
        }

        try {
            return Carbon::parse($raw)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Format deadline as quarter label: "II кв. 2027".
     */
    protected function formatDeadlineLabel(mixed $raw): ?string
    {
        if (! $raw) {
            return null;
        }

        try {
            $d = Carbon::parse($raw);
        } catch (\Throwable) {
            return null;
        }

        static $quarters = [1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV'];
        $q = $quarters[(int) ceil($d->month / 3)];

        return "{$q} кв. {$d->year}";
    }
}
