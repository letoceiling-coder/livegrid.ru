<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApartmentListResource;
use App\Http\Resources\ApartmentResource;
use App\Models\Apartment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Apartment listing and detail API.
 *
 * GET /api/v1/apartments        — paginated list with filters
 * GET /api/v1/apartments/{id}   — single apartment
 *
 * Filter params:
 *  price_min, price_max, area_min, area_max
 *  room[]           (0=studio, 1,2,3,4)
 *  district[]       (region IDs, char 24)
 *  builder[]        (builder IDs, char 24)
 *  finishing[]      (finishing IDs, char 24)
 *  floor_min, floor_max
 *  deadline_from, deadline_to  (YYYY-MM-DD)
 *  is_city          (0|1)
 *  search           (fulltext string)
 *  lat, lng, radius (geo filter, radius in meters)
 *
 * Sort params:  sort=price|area_total|building_deadline_at|floor  + order=asc|desc
 */
class ApartmentController extends Controller
{
    /** Allowed sort columns */
    private const SORTABLE = ['price', 'area_total', 'building_deadline_at', 'floor'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'price_min'     => ['nullable', 'numeric', 'min:0'],
            'price_max'     => ['nullable', 'numeric', 'min:0'],
            'area_min'      => ['nullable', 'numeric', 'min:0'],
            'area_max'      => ['nullable', 'numeric', 'min:0'],
            'room'          => ['nullable', 'array'],
            'room.*'        => ['integer', 'min:0'],
            'district'      => ['nullable', 'array'],
            'district.*'    => ['string', 'size:24'],
            'builder'       => ['nullable', 'array'],
            'builder.*'     => ['string', 'size:24'],
            'finishing'     => ['nullable', 'array'],
            'finishing.*'   => ['string', 'size:24'],
            'floor_min'     => ['nullable', 'integer', 'min:1'],
            'floor_max'     => ['nullable', 'integer', 'min:1'],
            'deadline_from' => ['nullable', 'date_format:Y-m-d'],
            'deadline_to'   => ['nullable', 'date_format:Y-m-d'],
            'is_city'       => ['nullable', 'boolean'],
            'search'        => ['nullable', 'string', 'max:200'],
            'lat'           => ['nullable', 'numeric', 'between:-90,90'],
            'lng'           => ['nullable', 'numeric', 'between:-180,180'],
            'radius'        => ['nullable', 'integer', 'min:100', 'max:50000'],
            'sort'          => ['nullable', 'string', 'in:' . implode(',', self::SORTABLE)],
            'order'         => ['nullable', 'string', 'in:asc,desc'],
            'per_page'      => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        // ── Performance profiling ────────────────────────────────────────────────
        $profileStart = microtime(true);
        DB::disableQueryLog(); // Disable for production performance

        // ── Query Builder (DB::table) for better performance ────────────────────
        // Select only fields needed by ApartmentListResource
        $hasGeoFilter = $request->filled('lat') && $request->filled('lng') && $request->filled('radius');
        
        if ($hasGeoFilter) {
            // Use idx_geo_compound index for geo queries
            $query = DB::table(DB::raw('apartments USE INDEX (idx_geo_compound)'));
        } else {
            $query = DB::table('apartments');
        }
        
        $query->select([
            'id',
            'room',
            'floor',
            'floors_total',
            'area_total',
            'price',
            'plan_url',
            'block_id',
            'block_name',
            'block_district_name',
            'block_builder_name',
            'building_deadline_at',
        ])->where('is_deleted', 0);

        // ── Price filter ─────────────────────────────────────────────────────
        if ($request->filled('price_min') && $request->filled('price_max')) {
            $query->whereBetween('price', [(float) $request->price_min, (float) $request->price_max]);
        } elseif ($request->filled('price_min')) {
            $query->where('price', '>=', (float) $request->price_min);
        } elseif ($request->filled('price_max')) {
            $query->where('price', '<=', (float) $request->price_max);
        }

        // ── Area filter ───────────────────────────────────────────────────────
        if ($request->filled('area_min') && $request->filled('area_max')) {
            $query->whereBetween('area_total', [(float) $request->area_min, (float) $request->area_max]);
        } elseif ($request->filled('area_min')) {
            $query->where('area_total', '>=', (float) $request->area_min);
        } elseif ($request->filled('area_max')) {
            $query->where('area_total', '<=', (float) $request->area_max);
        }

        // ── Rooms ─────────────────────────────────────────────────────────────
        if ($request->filled('room')) {
            $query->whereIn('room', (array) $request->room);
        }

        // ── District ─────────────────────────────────────────────────────────
        if ($request->filled('district')) {
            $query->whereIn('block_district_id', (array) $request->district);
        }

        // ── Builder ───────────────────────────────────────────────────────────
        if ($request->filled('builder')) {
            $query->whereIn('block_builder_id', (array) $request->builder);
        }

        // ── Finishing ─────────────────────────────────────────────────────────
        if ($request->filled('finishing')) {
            $query->whereIn('finishing_id', (array) $request->finishing);
        }

        // ── Floor filter ──────────────────────────────────────────────────────
        if ($request->filled('floor_min') && $request->filled('floor_max')) {
            $query->whereBetween('floor', [(int) $request->floor_min, (int) $request->floor_max]);
        } elseif ($request->filled('floor_min')) {
            $query->where('floor', '>=', (int) $request->floor_min);
        } elseif ($request->filled('floor_max')) {
            $query->where('floor', '<=', (int) $request->floor_max);
        }

        // ── Deadline filter ────────────────────────────────────────────────────
        if ($request->filled('deadline_from') && $request->filled('deadline_to')) {
            $query->whereBetween('building_deadline_at', [$request->deadline_from, $request->deadline_to]);
        } elseif ($request->filled('deadline_from')) {
            $query->where('building_deadline_at', '>=', $request->deadline_from);
        } elseif ($request->filled('deadline_to')) {
            $query->where('building_deadline_at', '<=', $request->deadline_to);
        }

        // ── Is city ───────────────────────────────────────────────────────────
        if ($request->has('is_city')) {
            $query->where('block_is_city', filter_var($request->is_city, FILTER_VALIDATE_BOOLEAN));
        }

        // ── Fulltext search ───────────────────────────────────────────────────
        if ($request->filled('search')) {
            $escaped = addslashes($request->search);
            $query->where(function ($q) use ($request, $escaped) {
                $q->whereRaw(
                    'MATCH(block_name, block_builder_name, block_district_name) AGAINST(? IN BOOLEAN MODE)',
                    [$request->search]
                )->orWhere('block_name', 'LIKE', '%' . $escaped . '%')
                 ->orWhere('block_builder_name', 'LIKE', '%' . $escaped . '%')
                 ->orWhere('block_district_name', 'LIKE', '%' . $escaped . '%');
            });
        }

        // ── Geo filter ────────────────────────────────────────────────────────
        if ($hasGeoFilter) {
            $lat = (float) $request->lat;
            $lng = (float) $request->lng;
            $radius = (int) $request->radius;

            // Calculate bounding box
            $latDelta = $radius / 111320.0;
            $lngDelta = $radius / (111320.0 * cos(deg2rad($lat)));

            $minLat = $lat - $latDelta;
            $maxLat = $lat + $latDelta;
            $minLng = $lng - $lngDelta;
            $maxLng = $lng + $lngDelta;

            // Apply geo filter (idx_geo_compound already set in table() call)
            $query->whereNotNull('block_lat')
                ->whereNotNull('block_lng')
                ->whereBetween('block_lat', [$minLat, $maxLat])
                ->whereBetween('block_lng', [$minLng, $maxLng])
                ->whereRaw(
                    'ST_Distance_Sphere(POINT(block_lng, block_lat), POINT(?, ?)) <= ?',
                    [$lng, $lat, $radius]
                );
        }

        // ── Sorting ───────────────────────────────────────────────────────────
        $sort  = in_array($request->sort, self::SORTABLE, true) ? $request->sort : 'price';
        $order = $request->order === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sort, $order);

        // ── Pagination ─────────────────────────────────────────────────────────
        $perPage = min((int) ($request->per_page ?? 20), 100);
        
        // Measure SQL execution time
        $sqlStart = microtime(true);
        $paginator = $query->paginate($perPage)->withQueryString();
        $sqlEnd = microtime(true);
        $sqlTime = ($sqlEnd - $sqlStart) * 1000;

        // Measure resource serialization time
        $resourceStart = microtime(true);
        $resourceCollection = ApartmentListResource::collection($paginator);
        $resourceEnd = microtime(true);
        $resourceTime = ($resourceEnd - $resourceStart) * 1000;

        // Measure JSON encoding time
        $jsonStart = microtime(true);
        $jsonResponse = $resourceCollection->response();
        $jsonData = $jsonResponse->getData(true);
        $jsonString = json_encode($jsonData);
        $jsonEnd = microtime(true);
        $jsonTime = ($jsonEnd - $jsonStart) * 1000;

        $totalTime = (microtime(true) - $profileStart) * 1000;
        $jsonSize = strlen($jsonString);

        // ── Log performance metrics ────────────────────────────────────────────
        Log::channel('performance')->info('ApartmentController::index() performance (Query Builder)', [
            'sql_time_ms'        => round($sqlTime, 2),
            'resource_time_ms'   => round($resourceTime, 2),
            'json_time_ms'       => round($jsonTime, 2),
            'total_time_ms'      => round($totalTime, 2),
            'json_size_bytes'    => $jsonSize,
            'json_size_kb'       => round($jsonSize / 1024, 2),
            'per_page'           => $perPage,
            'has_geo_filter'     => $request->filled('lat') && $request->filled('lng') && $request->filled('radius'),
        ]);

        return $resourceCollection;
    }

    public function show(string $id): ApartmentResource
    {
        $apartment = Apartment::with([
            'finishing',
            'buildingType',
            'roomType',
            'block.district',
            'block.builder',
            'building',
        ])->findOrFail($id);

        return new ApartmentResource($apartment);
    }
}
