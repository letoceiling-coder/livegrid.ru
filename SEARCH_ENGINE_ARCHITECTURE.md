# Search Engine Architecture — LiveGrid.ru

**Project:** https://github.com/letoceiling-coder/livegrid.ru  
**Website:** https://livegrid.ru  
**Last updated:** 2026-02-27  

This document describes the unified search engine introduced to centralize all search logic across LiveGrid.

---

## 1. Overview

All search flows now go through a single service:

- **Live search** (header, main page)
- **Blocks catalog** (`/api/v1/blocks`)
- **Apartments catalog** (`/api/v1/apartments`)
- **Map search** (`/api/v1/blocks/map`)

### Entry Points

| Endpoint | Param | Controller | Search Path |
|----------|-------|------------|-------------|
| `GET /api/v1/search` | `q` | SearchController | SearchService::search() |
| `GET /api/v1/blocks` | `search` | BlockController | SearchService::searchBlocksQuery() |
| `GET /api/v1/blocks/map` | `search` | BlockController | SearchService::searchBlocksQuery() |
| `GET /api/v1/apartments` | `search` | ApartmentController | SearchService::applyApartmentSearch() |

---

## 2. Search Pipeline

```
User Query (e.g. "1 комнатная сокольники до 10 млн")
        │
        ▼
  SearchQueryParser
        │
        ├── text: "сокольники"
        ├── rooms: [1]
        ├── price_max: 10000000
        ├── area_min, area_max, district, etc.
        │
        ▼
  SearchService
        │
        ├── searchBlocks()     → FULLTEXT + subway + parsed filters
        ├── searchBlocksQuery()→ Builder for blocks catalog / map
        └── applyApartmentSearch() → FULLTEXT + LIKE + parsed filters
```

---

## 3. SearchQueryParser

**File:** `app/Services/Search/SearchQueryParser.php`

Extracts structured filters from natural-language queries using regex rules.

### Parsing Rules

| Pattern | Output | Example |
|---------|--------|---------|
| "студия" | rooms: [0] | "студия сокольники" |
| "1 комнатная", "1к", "1-комнатная" | rooms: [1] | "1 комнатная сокольники" |
| "2к", "2 комнатная" | rooms: [2] | "2к до 10 млн" |
| "до 10 млн", "до 8 миллионов", "до 5м" | price_max: N | "студия до 10 млн" |
| "40м", "40 метров" | area_min / area_max | "квартира 40м" |
| Remaining text | text: string | "сокольники", "жк авангард" |

### Output Structure

```php
[
    'text'      => string,   // Searchable text (district, ЖК name, etc.)
    'rooms'     => int[],    // 0=studio, 1,2,3...
    'price_min' => ?int,
    'price_max' => ?int,
    'area_min'  => ?float,
    'area_max'  => ?float,
    'district'  => ?string,
    'raw'       => string,   // Original query
]
```

---

## 4. SearchService

**File:** `app/Services/Search/SearchService.php`

### Public Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `search($query, $filters, $options)` | Full live search | `['blocks', 'apartments', 'parsed_query']` |
| `searchBlocksQuery($query, $filters)` | Blocks catalog / map | `Builder` |
| `applyApartmentSearch($query, $searchTerm)` | Apartments catalog | void (modifies builder) |
| `parse($query)` | Query parsing only | parsed array |

### Block Search Logic

- **FULLTEXT** on `blocks`: `MATCH(name, description, address, district_name, builder_name) AGAINST(? IN BOOLEAN MODE)`
- **Subway search** via `whereHas('subways', ... LIKE subways.name)`
- Parsed filters: `price_max` (blocks.price_from)

### Apartment Search Logic

- **FULLTEXT** on `apartments`: `MATCH(block_name, block_builder_name, block_district_name) AGAINST(? IN BOOLEAN MODE)`
- **LIKE fallback** on block_name, block_builder_name, block_district_name, number
- Parsed filters: rooms, price_min/max, area_min/max

---

## 5. Database Indexes

### Migration

`database/migrations/2026_03_07_100000_expand_search_indexes.php`

### Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| blocks | blocks_search (FULLTEXT) | name, description, address, district_name, builder_name | Block search |
| subways | subways_name_idx (BTREE) | name | Metro name search |
| apartments | apartments_search_fulltext (existing) | block_name, block_builder_name, block_district_name | Apartment search |

**Note:** The migration replaces the old `blocks_fulltext` index with the expanded `blocks_search`. Run the migration before using SearchService for blocks.

---

## 6. Controller Flow

### SearchController (Live Search)

```php
$result = $this->searchService->search($q, [], [
    'limit_blocks'     => 5,
    'limit_apartments' => 5,
]);
// Response: { success, data: { residential_complexes, apartments } }
```

### BlockController (index, forMap)

When `search` param is present:

```php
$query = $this->searchService->searchBlocksQuery($request->search, $filters);
// Then: sorting, pagination (index) or get() (forMap)
```

Filters passed: district, builder, is_city, deadline_from, deadline_to, price_max, subway.

### ApartmentController

When `search` param is present:

```php
$this->searchService->applyApartmentSearch($query, $request->search);
```

Request filters (room, price_min, price_max, etc.) are applied first; `applyApartmentSearch` adds search conditions and parsed filters. Both are ANDed.

---

## 7. Response Format

### Live Search

```json
{
  "success": true,
  "data": {
    "residential_complexes": [...],
    "apartments": [...]
  }
}
```

### Blocks / Apartments Catalog

Existing pagination and resource structure unchanged. Search is an additional filter.

---

## 8. Backward Compatibility

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /api/v1/search?q=` | LIKE on blocks/apartments | SearchService (FULLTEXT + natural language) |
| `GET /api/v1/blocks?search=` | Block::scopeSearch() | SearchService::searchBlocksQuery() |
| `GET /api/v1/apartments?search=` | FULLTEXT + LIKE | SearchService::applyApartmentSearch() |

**Contract:** Same URL params, same response shape. No breaking changes to the API.

---

## 9. Future Scalability

1. **Scout + Meilisearch** — Replace MySQL FULLTEXT with Meilisearch for typo tolerance and better ranking.
2. **Relevance sorting** — Add scoring (exact name > district > subway > fulltext relevance).
3. **Suggestions** — Return autocomplete suggestions from `parsed_query` or separate suggestions endpoint.
4. **District resolution** — Map parsed `district` text to region IDs via `regions` table for exact district filter.
