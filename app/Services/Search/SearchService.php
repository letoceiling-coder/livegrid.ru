<?php

namespace App\Services\Search;

use App\Models\Apartment;
use App\Models\Block;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Collection;

/**
 * Unified search engine for blocks (ЖК) and apartments.
 *
 * Used by: live search, blocks catalog, apartments catalog, map search.
 * All search logic flows through this service.
 */
class SearchService
{
    public function __construct(
        private SearchQueryParser $parser = new SearchQueryParser()
    ) {
    }

    /**
     * Full search: blocks + apartments (for live search).
     *
     * @param array{limit_blocks?: int, limit_apartments?: int} $options
     * @return array{blocks: Collection, apartments: Collection, parsed_query: array}
     */
    public function search(string $query, array $filters = [], array $options = []): array
    {
        $parsed = $this->parser->parse($query);
        $limitBlocks = $options['limit_blocks'] ?? 5;
        $limitApartments = $options['limit_apartments'] ?? 5;

        $blocksQuery = $this->searchBlocksQuery($query, array_merge($filters, $this->parsedToBlockFilters($parsed)));
        $blocks = $blocksQuery
            ->with(['district', 'subways' => fn ($q) => $q->orderBy('block_subway.travel_time')])
            ->limit($limitBlocks)
            ->get();

        $apartmentsQuery = $this->searchApartmentsQuery($query, array_merge($filters, $this->parsedToApartmentFilters($parsed)));
        $apartments = $apartmentsQuery->with('block:id,name')->limit($limitApartments)->get();

        return [
            'blocks'        => $blocks,
            'apartments'    => $apartments,
            'parsed_query'  => $parsed,
        ];
    }

    /**
     * Build blocks query with search and filters.
     *
     * @param array<string, mixed> $filters district, builder, subway, deadline_from, deadline_to, price_max
     */
    public function searchBlocksQuery(string $query, array $filters = []): Builder
    {
        $parsed = $this->parser->parse($query);
        $filters = array_merge($filters, $this->parsedToBlockFilters($parsed));

        $builder = Block::query()
            ->select('blocks.*')
            ->where('units_count', '>', 0);

        $this->applyBlockSearch($builder, $parsed['text']);
        $this->applyBlockFilters($builder, $filters);

        return $builder;
    }

    /**
     * Apply search condition to apartments query builder.
     *
     * @param QueryBuilder $query  DB::table('apartments') builder
     */
    public function applyApartmentSearch(QueryBuilder $query, string $searchTerm): void
    {
        $parsed = $this->parser->parse($searchTerm);
        $text = $parsed['text'];

        if ($text === '') {
            return;
        }

        $escaped = addslashes($text);
        $query->where(function ($q) use ($text, $escaped) {
            $q->whereRaw(
                'MATCH(block_name, block_builder_name, block_district_name) AGAINST(? IN BOOLEAN MODE)',
                [$text]
            )->orWhere('block_name', 'LIKE', '%' . $escaped . '%')
             ->orWhere('block_builder_name', 'LIKE', '%' . $escaped . '%')
             ->orWhere('block_district_name', 'LIKE', '%' . $escaped . '%')
             ->orWhere('number', 'LIKE', '%' . $escaped . '%');
        });

        // Apply parsed filters (from natural language)
        if (! empty($parsed['rooms'])) {
            $query->whereIn('room', $parsed['rooms']);
        }
        if (isset($parsed['price_min']) && $parsed['price_min'] !== null) {
            $query->where('price', '>=', (float) $parsed['price_min']);
        }
        if (isset($parsed['price_max']) && $parsed['price_max'] !== null) {
            $query->where('price', '<=', (float) $parsed['price_max']);
        }
        if (isset($parsed['area_min']) && $parsed['area_min'] !== null) {
            $query->where('area_total', '>=', (float) $parsed['area_min']);
        }
        if (isset($parsed['area_max']) && $parsed['area_max'] !== null) {
            $query->where('area_total', '<=', (float) $parsed['area_max']);
        }
    }

    /**
     * Parse a search query (public for controller use).
     *
     * @return array{text: string, rooms: int[], price_min: int|null, price_max: int|null, area_min: float|null, area_max: float|null, district: string|null, raw: string}
     */
    public function parse(string $query): array
    {
        return $this->parser->parse($query);
    }

    /**
     * Build apartments query (Eloquent) for live search.
     */
    private function searchApartmentsQuery(string $query, array $filters = []): Builder
    {
        $parsed = $this->parser->parse($query);
        $filters = array_merge($filters, $this->parsedToApartmentFilters($parsed));

        $builder = Apartment::query();

        $text = $parsed['text'];
        if ($text !== '') {
            $escaped = addslashes($text);
            $builder->where(function ($q) use ($text, $escaped) {
                $q->whereRaw(
                    'MATCH(block_name, block_builder_name, block_district_name) AGAINST(? IN BOOLEAN MODE)',
                    [$text]
                )->orWhere('block_name', 'LIKE', '%' . $escaped . '%')
                 ->orWhere('number', 'LIKE', '%' . $escaped . '%');
            });
        }

        if (! empty($filters['room'])) {
            $builder->whereIn('room', (array) $filters['room']);
        }
        if (isset($filters['price_max']) && $filters['price_max'] !== null) {
            $builder->where('price', '<=', (float) $filters['price_max']);
        }
        if (isset($filters['area_min']) && $filters['area_min'] !== null) {
            $builder->where('area_total', '>=', (float) $filters['area_min']);
        }
        if (isset($filters['area_max']) && $filters['area_max'] !== null) {
            $builder->where('area_total', '<=', (float) $filters['area_max']);
        }

        return $builder;
    }

    private function applyBlockSearch(Builder $query, string $text): void
    {
        if ($text === '') {
            return;
        }

        // Use expanded FULLTEXT (blocks_search) when available; fallback to blocks_fulltext
        $query->where(function ($q) use ($text) {
            $escaped = addslashes($text);
            $q->whereRaw(
                'MATCH(blocks.name, blocks.description, blocks.address, blocks.district_name, blocks.builder_name) AGAINST(? IN BOOLEAN MODE)',
                [$text]
            )
            ->orWhereHas('subways', fn ($sq) => $sq->where('subways.name', 'LIKE', '%' . $escaped . '%'));
        });
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function applyBlockFilters(Builder $query, array $filters): void
    {
        if (! empty($filters['district'])) {
            $query->whereIn('district_id', (array) $filters['district']);
        }
        if (! empty($filters['builder'])) {
            $query->whereIn('builder_id', (array) $filters['builder']);
        }
        if (! empty($filters['subway'])) {
            $query->whereHas('subways', fn ($q) => $q->whereIn('subways.id', (array) $filters['subway']));
        }
        if (! empty($filters['deadline_from'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('nearest_deadline_at')
                  ->orWhere('nearest_deadline_at', '>=', $filters['deadline_from']);
            });
        }
        if (! empty($filters['deadline_to'])) {
            $query->where(function ($q) use ($filters) {
                $q->whereNull('nearest_deadline_at')
                  ->orWhere('nearest_deadline_at', '<=', $filters['deadline_to']);
            });
        }
        if (isset($filters['price_max']) && $filters['price_max'] > 0) {
            $query->whereNotNull('price_from')
                  ->where('price_from', '<=', (float) $filters['price_max']);
        }
        if (isset($filters['is_city']) && $filters['is_city'] !== null) {
            $query->where('is_city', (bool) $filters['is_city']);
        }
    }

    /** @return array<string, mixed> */
    private function parsedToBlockFilters(array $parsed): array
    {
        $f = [];
        if (! empty($parsed['price_max'])) {
            $f['price_max'] = $parsed['price_max'];
        }
        return $f;
    }

    /** @return array<string, mixed> */
    private function parsedToApartmentFilters(array $parsed): array
    {
        $f = [];
        if (! empty($parsed['rooms'])) {
            $f['room'] = $parsed['rooms'];
        }
        if (! empty($parsed['price_min'])) {
            $f['price_min'] = $parsed['price_min'];
        }
        if (! empty($parsed['price_max'])) {
            $f['price_max'] = $parsed['price_max'];
        }
        if (isset($parsed['area_min'])) {
            $f['area_min'] = $parsed['area_min'];
        }
        if (isset($parsed['area_max'])) {
            $f['area_max'] = $parsed['area_max'];
        }
        return $f;
    }
}
