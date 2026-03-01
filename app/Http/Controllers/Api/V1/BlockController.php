<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ApartmentResource;
use App\Http\Resources\BlockDetailResource;
use App\Http\Resources\BlockListResource;
use App\Models\Apartment;
use App\Models\Block;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Block (ЖК) API.
 *
 * GET  /api/v1/blocks                     — paginated list
 * GET  /api/v1/blocks/{id}                — single block with aggregated stats
 * GET  /api/v1/blocks/{id}/apartments     — apartments scoped to block
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  INDEX filters:
 *    district[]        char(24)[]     Filter by district (block_district_id)
 *    builder[]         char(24)[]     Filter by builder (block_builder_id)
 *    is_city           bool           Only city / only suburb
 *    search            string         Fulltext on block name + description
 *    deadline_from     Y-m-d          Blocks with ≥1 building due after date
 *    deadline_to       Y-m-d          Blocks with ≥1 building due before date
 *
 *  INDEX sort (sort=<value>&order=asc|desc):
 *    price_from        Sort by min apartment price  (NULLs last)
 *    deadline          Sort by earliest building deadline (NULLs last)
 *    name              Alphabetical (default)
 * ──────────────────────────────────────────────────────────────────────────
 */
class BlockController extends Controller
{
    private const SORTABLE = ['price_from', 'deadline', 'name'];

    // Apartment sort columns reused in apartments() method
    private const APT_SORTABLE = ['price', 'area_total', 'building_deadline_at', 'floor'];

    // ── index() ───────────────────────────────────────────────────────────────

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'district'      => ['nullable', 'array'],
            'district.*'    => ['string', 'size:24'],
            'builder'       => ['nullable', 'array'],
            'builder.*'     => ['string', 'size:24'],
            'is_city'       => ['nullable', 'boolean'],
            'search'        => ['nullable', 'string', 'max:200'],
            'deadline_from' => ['nullable', 'date_format:Y-m-d'],
            'deadline_to'   => ['nullable', 'date_format:Y-m-d'],
            'sort'          => ['nullable', 'string', 'in:price_from,deadline,name'],
            'order'         => ['nullable', 'string', 'in:asc,desc'],
            'per_page'      => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        // ── Base query ────────────────────────────────────────────────────────
        // Aggregates (price_from, units_count, min_area, nearest_deadline_at)
        // are now materialized columns — refreshed by FeedSyncService after every
        // sync. No subqueries here: plain WHERE + ORDER BY on indexed columns.
        $query = Block::query()
            ->select('blocks.*')
            ->where('units_count', '>', 0); // Exclude blocks with no active apartments

        // ── Filters ───────────────────────────────────────────────────────────

        if ($request->filled('district')) {
            $query->whereIn('district_id', (array) $request->district);
        }

        if ($request->filled('builder')) {
            $query->whereIn('builder_id', (array) $request->builder);
        }

        if ($request->has('is_city')) {
            $query->where('is_city', filter_var($request->is_city, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            // Reuse the Block model scope (FULLTEXT on name + description)
            $query->search($request->search);
        }

        if ($request->filled('deadline_from') || $request->filled('deadline_to')) {
            $from = $request->deadline_from;
            $to   = $request->deadline_to;

            // Filter via the materialized nearest_deadline_at column
            if ($from) {
                $query->where(function ($q) use ($from) {
                    $q->whereNull('nearest_deadline_at')
                      ->orWhere('nearest_deadline_at', '>=', $from);
                });
            }
            if ($to) {
                $query->where(function ($q) use ($to) {
                    $q->whereNull('nearest_deadline_at')
                      ->orWhere('nearest_deadline_at', '<=', $to);
                });
            }
        }

        // ── Sorting ───────────────────────────────────────────────────────────
        // All sort columns are now plain indexed columns — no computed expressions
        // in ORDER BY, so MySQL can use blocks_price_from_index / blocks_deadline_index.
        $order = $request->order === 'desc' ? 'desc' : 'asc';

        match ($request->sort) {
            'price_from' => $query->orderByRaw("price_from IS NULL, price_from {$order}"),
            'deadline'   => $query->orderByRaw("nearest_deadline_at IS NULL, nearest_deadline_at {$order}"),
            default      => $query->orderBy('name', 'asc'),
        };

        // ── Pagination ────────────────────────────────────────────────────────
        $perPage   = min((int) ($request->per_page ?? 20), 100);
        $query->with(['subways' => fn ($q) => $q->orderBy('block_subway.travel_time')]);
        $paginator = $query->paginate($perPage)->withQueryString();

        // ── Attach room prices for each block (bulk query) ───────────────────
        $blockIds = $paginator->pluck('id')->all();
        if (count($blockIds) > 0) {
            $roomPricesByBlock = DB::table('apartments')
                ->whereIn('block_id', $blockIds)
                ->where('is_deleted', false)
                ->selectRaw('
                    block_id,
                    room,
                    MIN(price) as price_from
                ')
                ->groupBy('block_id', 'room')
                ->orderBy('room')
                ->get()
                ->groupBy('block_id')
                ->map(fn ($prices) => $prices->mapWithKeys(fn ($p) => [(string)$p->room => (float)$p->price_from]));

            $paginator->each(function ($block) use ($roomPricesByBlock) {
                $block->room_prices = $roomPricesByBlock[$block->id] ?? (object)[];
            });
        }

        return BlockListResource::collection($paginator);
    }

    // ── forMap() ──────────────────────────────────────────────────────────────
    //  GET /api/v1/blocks/map — all blocks for map view (no pagination, minimal fields)

    public function forMap(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'district'      => ['nullable', 'array'],
            'district.*'    => ['string', 'size:24'],
            'builder'       => ['nullable', 'array'],
            'builder.*'     => ['string', 'size:24'],
            'is_city'       => ['nullable', 'boolean'],
            'search'        => ['nullable', 'string', 'max:200'],
            'deadline_from' => ['nullable', 'date_format:Y-m-d'],
            'deadline_to'   => ['nullable', 'date_format:Y-m-d'],
        ]);

        $query = Block::query()
            ->select([
                'id', 'name', 'lat', 'lng',
                'price_from', 'units_count', 'images',
            ])
            ->where('units_count', '>', 0)
            ->whereNotNull('lat')
            ->whereNotNull('lng');

        if ($request->filled('district')) {
            $query->whereIn('district_id', (array) $request->district);
        }

        if ($request->filled('builder')) {
            $query->whereIn('builder_id', (array) $request->builder);
        }

        if ($request->has('is_city')) {
            $query->where('is_city', filter_var($request->is_city, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $query->search($request->search);
        }

        if ($request->filled('deadline_from') || $request->filled('deadline_to')) {
            $from = $request->deadline_from;
            $to   = $request->deadline_to;
            if ($from) {
                $query->where(function ($q) use ($from) {
                    $q->whereNull('nearest_deadline_at')
                      ->orWhere('nearest_deadline_at', '>=', $from);
                });
            }
            if ($to) {
                $query->where(function ($q) use ($to) {
                    $q->whereNull('nearest_deadline_at')
                      ->orWhere('nearest_deadline_at', '<=', $to);
                });
            }
        }

        $blocks = $query->orderBy('name')->get()->map(fn ($b) => [
            'id'          => $b->id,
            'slug'        => $b->slug,
            'name'        => $b->name,
            'lat'         => (float) $b->lat,
            'lng'         => (float) $b->lng,
            'price_from'  => $b->price_from ? (float) $b->price_from : null,
            'units_count' => (int) $b->units_count,
            'image'       => is_array($b->images) ? ($b->images[0] ?? null)
                             : (json_decode($b->images, true)[0] ?? null),
        ]);

        return response()->json(['data' => $blocks]);
    }

    // ── show() ────────────────────────────────────────────────────────────────

    public function show(string $slugOrId): BlockDetailResource
    {
        // Extract ID from slug format: "zhk-name-697c6dcaebae21b1814e0b76"
        // If $slugOrId contains '-', extract the last segment (24-char MongoDB ID)
        // Otherwise, treat as direct ID
        if (str_contains($slugOrId, '-')) {
            $segments = explode('-', $slugOrId);
            $id = end($segments);
            // Validate it's a 24-char hex string
            if (!preg_match('/^[a-f0-9]{24}$/', $id)) {
                abort(404, 'Invalid block identifier');
            }
        } else {
            $id = $slugOrId;
        }

        /** @var Block $block */
        $block = Block::with([
            'subways'   => fn ($q) => $q->orderBy('block_subway.travel_time'),
            'buildings' => fn ($q) => $q->orderBy('deadline_at'),
            'builder',
        ])->findOrFail($id);

        // ── Aggregate stats from apartments ───────────────────────────────────
        $stats = DB::table('apartments')
            ->where('block_id', $id)
            ->where('is_deleted', false)
            ->selectRaw('
                MIN(price)            AS price_from,
                MIN(price_per_meter)  AS price_per_m2_from,
                COUNT(*)              AS units_count,
                MIN(area_total)       AS area_from,
                MAX(area_total)       AS area_to,
                MIN(building_deadline_at) AS nearest_deadline_at
            ')
            ->first();

        // ── Room type groups ──────────────────────────────────────────────────
        // LEFT JOIN rooms so studios (rooms_crm_id = 0) are still included
        // if the rooms table entry exists.
        $roomGroups = DB::table('apartments')
            ->leftJoin('rooms', 'apartments.rooms_crm_id', '=', 'rooms.crm_id')
            ->where('apartments.block_id', $id)
            ->where('apartments.is_deleted', false)
            ->selectRaw('
                apartments.room,
                apartments.rooms_crm_id,
                rooms.name            AS room_label,
                COUNT(*)              AS count,
                MIN(apartments.price) AS price_from,
                MIN(apartments.area_total) AS area_from,
                MAX(apartments.area_total) AS area_to
            ')
            ->groupBy(
                'apartments.room',
                'apartments.rooms_crm_id',
                'rooms.name'
            )
            ->orderBy('apartments.room')
            ->get();

        // ── Attach aggregated data as virtual attributes ───────────────────────
        $block->price_from          = $stats?->price_from;
        $block->price_per_m2_from   = $stats?->price_per_m2_from;
        $block->units_count         = (int) ($stats?->units_count ?? 0);
        $block->area_from           = $stats?->area_from;
        $block->area_to             = $stats?->area_to;
        $block->nearest_deadline_at = $stats?->nearest_deadline_at;
        $block->room_groups         = $roomGroups;

        return new BlockDetailResource($block);
    }

    // ── filters() ────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/blocks/filters
     *
     * Returns available filter options for blocks (ЖК catalog).
     * Includes: districts, builders, price range, deadline range.
     */
    public function filters()
    {
        $data = [
            'districts'  => $this->getDistrictsForBlocks(),
            'builders'   => $this->getBuildersForBlocks(),
            'price'      => $this->getPriceRangeForBlocks(),
            'deadline'   => $this->getDeadlineRangeForBlocks(),
        ];

        return response()->json(['data' => $data]);
    }

    private function getDistrictsForBlocks(): array
    {
        return DB::table('blocks')
            ->join('regions', 'blocks.district_id', '=', 'regions.id')
            ->where('blocks.units_count', '>', 0)
            ->select('regions.id', 'regions.name')
            ->groupBy('regions.id', 'regions.name')
            ->orderBy('regions.name')
            ->get()
            ->map(fn ($r) => ['id' => $r->id, 'name' => $r->name])
            ->toArray();
    }

    private function getBuildersForBlocks(): array
    {
        return DB::table('blocks')
            ->join('builders', 'blocks.builder_id', '=', 'builders.id')
            ->where('blocks.units_count', '>', 0)
            ->select('builders.id', 'builders.name')
            ->groupBy('builders.id', 'builders.name')
            ->orderBy('builders.name')
            ->get()
            ->map(fn ($b) => ['id' => $b->id, 'name' => $b->name])
            ->toArray();
    }

    private function getPriceRangeForBlocks(): array
    {
        $row = DB::table('blocks')
            ->where('units_count', '>', 0)
            ->whereNotNull('price_from')
            ->selectRaw('MIN(price_from) as min, MAX(price_from) as max')
            ->first();

        return [
            'min' => (int) ($row?->min ?? 0),
            'max' => (int) ($row?->max ?? 0)
        ];
    }

    private function getDeadlineRangeForBlocks(): array
    {
        $row = DB::table('blocks')
            ->where('units_count', '>', 0)
            ->whereNotNull('nearest_deadline_at')
            ->selectRaw('MIN(nearest_deadline_at) as min, MAX(nearest_deadline_at) as max')
            ->first();

        return [
            'min' => $row?->min,
            'max' => $row?->max,
        ];
    }

    // ── apartments() ─────────────────────────────────────────────────────────

    /**
     * Returns apartments scoped to a single block with the same filter/sort/
     * pagination contract as GET /api/v1/apartments.
     *
     * Intentionally NOT reusing ApartmentController to keep both controllers
     * independently maintainable. Filter logic is the same subset.
     */
    public function apartments(Request $request, string $slugOrId): AnonymousResourceCollection
    {
        // Extract ID from slug (same logic as show())
        if (str_contains($slugOrId, '-')) {
            $segments = explode('-', $slugOrId);
            $id = end($segments);
            if (!preg_match('/^[a-f0-9]{24}$/', $id)) {
                abort(404, 'Invalid block identifier');
            }
        } else {
            $id = $slugOrId;
        }

        // 404 if block does not exist
        Block::findOrFail($id);

        $request->validate([
            'price_min'     => ['nullable', 'numeric', 'min:0'],
            'price_max'     => ['nullable', 'numeric', 'min:0'],
            'area_min'      => ['nullable', 'numeric', 'min:0'],
            'area_max'      => ['nullable', 'numeric', 'min:0'],
            'room'          => ['nullable', 'array'],
            'room.*'        => ['integer', 'min:0'],
            'finishing'     => ['nullable', 'array'],
            'finishing.*'   => ['string', 'size:24'],
            'floor_min'     => ['nullable', 'integer', 'min:1'],
            'floor_max'     => ['nullable', 'integer', 'min:1'],
            'deadline_from' => ['nullable', 'date_format:Y-m-d'],
            'deadline_to'   => ['nullable', 'date_format:Y-m-d'],
            'sort'          => ['nullable', 'string', 'in:' . implode(',', self::APT_SORTABLE)],
            'order'         => ['nullable', 'string', 'in:asc,desc'],
            'per_page'      => ['nullable', 'integer', 'min:1', 'max:5000'],
        ]);

        // Base query — global scope already excludes is_deleted apartments
        $query = Apartment::query()
            ->with(['finishing', 'buildingType', 'roomType'])
            ->where('block_id', $id);

        // ── Price ─────────────────────────────────────────────────────────────
        if ($request->filled('price_min') && $request->filled('price_max')) {
            $query->priceBetween((float) $request->price_min, (float) $request->price_max);
        } elseif ($request->filled('price_min')) {
            $query->where('price', '>=', (float) $request->price_min);
        } elseif ($request->filled('price_max')) {
            $query->where('price', '<=', (float) $request->price_max);
        }

        // ── Area ──────────────────────────────────────────────────────────────
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

        // ── Finishing ─────────────────────────────────────────────────────────
        if ($request->filled('finishing')) {
            $query->whereIn('finishing_id', (array) $request->finishing);
        }

        // ── Floor ─────────────────────────────────────────────────────────────
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

        // ── Sort ──────────────────────────────────────────────────────────────
        $sort  = in_array($request->sort, self::APT_SORTABLE, true) ? $request->sort : 'price';
        $order = $request->order === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sort, $order);

        // ── Paginate ──────────────────────────────────────────────────────────
        $perPage   = min((int) ($request->per_page ?? 20), 5000);
        $paginator = $query->paginate($perPage)->withQueryString();

        return ApartmentResource::collection($paginator);
    }
}
