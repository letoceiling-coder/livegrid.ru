<?php

namespace App\Http\Resources;

use Illuminate\Support\Collection;

/**
 * Search results shape for live search dropdown.
 */
class SearchResource
{
    public static function formatBlocks(Collection $blocks): array
    {
        return $blocks->map(function ($block) {
            $metro = $block->subways?->first();
            $subtitle = collect([$block->district_name, $metro?->name])->filter()->implode(' · ');
            return [
                'id' => $block->id,
                'slug' => $block->slug,
                'name' => $block->name,
                'district' => $block->district_name,
                'metro' => $metro?->name ?? null,
                'subtitle' => $subtitle ?: null,
            ];
        })->values()->all();
    }

    public static function formatApartments(Collection $apartments): array
    {
        return $apartments->map(function ($apt) {
            $title = $apt->number ? "Кв. {$apt->number}" : "Квартира";
            if ($apt->block_name) {
                $title .= ", {$apt->block_name}";
            }
            return [
                'id' => $apt->id,
                'slug' => $apt->id,
                'title' => $title,
                'block_name' => $apt->block_name,
                'price' => $apt->price,
            ];
        })->values()->all();
    }
}
