<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Builder;
use App\Models\Finishing;
use App\Models\Region;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * GET /api/v1/filters
 *
 * Returns available filter options for the frontend.
 * Cached for 30 minutes to avoid repeated aggregation queries.
 */
class FilterController extends Controller
{
    public function index(): JsonResponse
    {
        $data = Cache::remember('api.filters', 1800, function () {
            return [
                'rooms'      => $this->getRooms(),
                'districts'  => $this->getDistricts(),
                'builders'   => $this->getBuilders(),
                'finishings' => $this->getFinishings(),
                'price'      => $this->getPriceRange(),
                'area'       => $this->getAreaRange(),
                'floor'      => $this->getFloorRange(),
                'deadline'   => $this->getDeadlineRange(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    private function getRooms(): array
    {
        return Room::orderBy('crm_id')
            ->get(['crm_id', 'name'])
            ->map(fn ($r) => ['value' => $r->crm_id, 'label' => $r->name])
            ->toArray();
    }

    private function getDistricts(): array
    {
        return DB::table('apartments')
            ->where('is_deleted', false)
            ->whereNotNull('block_district_id')
            ->select('block_district_id as id', 'block_district_name as name')
            ->groupBy('block_district_id', 'block_district_name')
            ->orderBy('block_district_name')
            ->get()
            ->toArray();
    }

    private function getBuilders(): array
    {
        return DB::table('apartments')
            ->where('is_deleted', false)
            ->whereNotNull('block_builder_id')
            ->select('block_builder_id as id', 'block_builder_name as name')
            ->groupBy('block_builder_id', 'block_builder_name')
            ->orderBy('block_builder_name')
            ->get()
            ->toArray();
    }

    private function getFinishings(): array
    {
        return Finishing::whereExists(function ($q) {
            $q->select(DB::raw(1))
              ->from('apartments')
              ->whereColumn('apartments.finishing_id', 'finishings.id')
              ->where('apartments.is_deleted', false);
        })
        ->orderBy('name')
        ->get(['id', 'name'])
        ->toArray();
    }

    private function getPriceRange(): array
    {
        $row = DB::table('apartments')
            ->where('is_deleted', false)
            ->whereNotNull('price')
            ->selectRaw('MIN(price) as min, MAX(price) as max')
            ->first();

        return ['min' => (int) ($row?->min ?? 0), 'max' => (int) ($row?->max ?? 0)];
    }

    private function getAreaRange(): array
    {
        $row = DB::table('apartments')
            ->where('is_deleted', false)
            ->whereNotNull('area_total')
            ->selectRaw('MIN(area_total) as min, MAX(area_total) as max')
            ->first();

        return ['min' => (float) ($row?->min ?? 0), 'max' => (float) ($row?->max ?? 0)];
    }

    private function getFloorRange(): array
    {
        $row = DB::table('apartments')
            ->where('is_deleted', false)
            ->whereNotNull('floor')
            ->selectRaw('MIN(floor) as min, MAX(floor) as max')
            ->first();

        return ['min' => (int) ($row?->min ?? 1), 'max' => (int) ($row?->max ?? 1)];
    }

    private function getDeadlineRange(): array
    {
        $row = DB::table('apartments')
            ->where('is_deleted', false)
            ->whereNotNull('building_deadline_at')
            ->selectRaw('MIN(building_deadline_at) as min, MAX(building_deadline_at) as max')
            ->first();

        return [
            'min' => $row?->min,
            'max' => $row?->max,
        ];
    }
}
