<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApartmentResource;
use App\Models\Apartment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

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

        $query = Apartment::query()
            ->with(['finishing', 'buildingType', 'roomType']);

        // ── Price filter ─────────────────────────────────────────────────────
        if ($request->filled('price_min') && $request->filled('price_max')) {
            $query->priceBetween((float) $request->price_min, (float) $request->price_max);
        } elseif ($request->filled('price_min')) {
            $query->where('price', '>=', (float) $request->price_min);
        } elseif ($request->filled('price_max')) {
            $query->where('price', '<=', (float) $request->price_max);
        }

        // ── Area filter ───────────────────────────────────────────────────────
        if ($request->filled('area_min') && $request->filled('area_max')) {
            $query->areaBetween((float) $request->area_min, (float) $request->area_max);
        } elseif ($request->filled('area_min')) {
            $query->where('area_total', '>=', (float) $request->area_min);
        } elseif ($request->filled('area_max')) {
            $query->where('area_total', '<=', (float) $request->area_max);
        }

        // ── Rooms ─────────────────────────────────────────────────────────────
        if ($request->filled('room')) {
            $query->rooms((array) $request->room);
        }

        // ── District ─────────────────────────────────────────────────────────
        if ($request->filled('district')) {
            $query->district((array) $request->district);
        }

        // ── Builder ───────────────────────────────────────────────────────────
        if ($request->filled('builder')) {
            $query->builder((array) $request->builder);
        }

        // ── Finishing ─────────────────────────────────────────────────────────
        if ($request->filled('finishing')) {
            $query->whereIn('finishing_id', (array) $request->finishing);
        }

        // ── Floor range ───────────────────────────────────────────────────────
        if ($request->filled('floor_min')) {
            $query->where('floor', '>=', (int) $request->floor_min);
        }
        if ($request->filled('floor_max')) {
            $query->where('floor', '<=', (int) $request->floor_max);
        }

        // ── Deadline ──────────────────────────────────────────────────────────
        if ($request->filled('deadline_from') && $request->filled('deadline_to')) {
            $query->deadlineBetween($request->deadline_from, $request->deadline_to);
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
            $query->search($request->search);
        }

        // ── Geo filter ────────────────────────────────────────────────────────
        if ($request->filled('lat') && $request->filled('lng') && $request->filled('radius')) {
            $query->geoRadius(
                (float) $request->lat,
                (float) $request->lng,
                (int) $request->radius
            );
        }

        // ── Sorting ───────────────────────────────────────────────────────────
        $sort  = in_array($request->sort, self::SORTABLE, true) ? $request->sort : 'price';
        $order = $request->order === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sort, $order);

        // ── Pagination ────────────────────────────────────────────────────────
        $perPage = min((int) ($request->per_page ?? 20), 100);
        $paginator = $query->paginate($perPage)->withQueryString();

        return ApartmentResource::collection($paginator);
    }

    public function show(string $id): ApartmentResource|Response
    {
        $apartment = Apartment::with(['building', 'block', 'finishing', 'buildingType', 'roomType'])
            ->findOrFail($id);

        return new ApartmentResource($apartment);
    }
}
