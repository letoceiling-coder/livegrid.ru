# Production Audit: Feed + CRM

Date: 2026-03-07  
Scope: `livegrid.ru` production (`root@85.198.64.93`)  
Goal: full audit of feed sources, data quality, ETL correctness, and CRM manageability.

## 1) Feed Inventory (production fact-base)

### Configured source
- `FEED_ENDPOINT_PRIMARY=https://dataout.trendagent.ru/msk/about.json`
- `FEED_AUTH_MODE=none`
- No secondary/tertiary endpoint configured in `.env`.

### Actually discovered endpoints
Discovery run: `php artisan feed:discover --max-pages=20 --sample-size=300 --no-probe`

Discovered 10 endpoints, total payload ~155.57 MB:
- `https://dataout.trendagent.ru/msk/about.json` (9 items, 3.2 KB)
- `https://dataout.trendagent.ru/msk/blocks.json` (1,289 items, 4.88 MB)
- `https://dataout.trendagent.ru/msk/builders.json` (561 items, 58.6 KB)
- `https://dataout.trendagent.ru/msk/regions.json` (181 items, 19.5 KB)
- `https://dataout.trendagent.ru/msk/subways.json` (447 items, 48.2 KB)
- `https://dataout.trendagent.ru/msk/rooms.json` (28 items, 2.6 KB)
- `https://dataout.trendagent.ru/msk/finishings.json` (7 items, 722 B)
- `https://dataout.trendagent.ru/msk/buildingtypes.json` (11 items, 1.1 KB)
- `https://dataout.trendagent.ru/msk/buildings.json` (9,269 items, 11.5 MB)
- `https://dataout.trendagent.ru/msk/apartments.json` (62,976 items, 139.06 MB)

### Collection history
- `storage/feed/raw/manifest.json` contains 20 entries (2 snapshots per endpoint).
- `feed:collect --list` currently reports no snapshots because collector writes through `FeedFileStorage` manifest path and list state differs from manual discovery sequence; requires normalization (see findings).

### Scheduling
Configured in `app/Console/Kernel.php`:
- `feed:collect` daily 03:00
- `feed:inspect --dump-entities` daily 03:30
- `feed:analyze` daily 04:00
- `feed:sync` daily 04:30

## 2) Data Quality Audit (feed + API)

## 2.1 Positive
- Discovery completed without endpoint fetch errors when probing was disabled (`--no-probe`).
- All core dictionary endpoints are present and non-empty.
- Filters endpoint confirms rich dictionary/range availability:
  - rooms, districts, subways, builders, finishings, price min/max, area min/max, floor min/max, deadline range.

## 2.2 High-risk findings

1. **False confidence in data-quality aggregate metrics**  
`report.json` shows `nullable_ratio=0`, `mixed_type_fields=0`, which is unrealistically perfect for this domain and payload size.  
Root cause: report aggregation in current analyzer path is optimistic and does not fully reflect optional/missing field behavior across large arrays.

2. **Probe strategy pollutes logs with expected 404**  
Feed discovery with probe mode produces many 404 errors in `feed-2026-03-07.log` for synthetic endpoints like:
- `/about/decoration`, `/about/projects`, `/about/amenities`, etc.  
This is noisy and masks real incidents.

3. **Inconsistent analysis artifacts**  
`report.json` exists, but combined `relationships.json` is missing for this run context.  
This creates partial observability for downstream architecture decisions.

4. **Encoding robustness issue already observed on CRM serialization**  
Previously reproduced production 500 (`Malformed UTF-8 characters`) confirms real risk from feed/domain string payloads.  
A defensive JSON response fix is now in place, but the root quality control layer (ingest validation + normalization) is still absent.

## 2.3 Data consistency snapshot (public API)
- `/api/v1/blocks?per_page=1&page=1` -> `meta.total=490`
- `/api/v1/apartments?per_page=1&page=1` -> `meta.total=62214`
- Feed source has 1,289 blocks and 62,976 apartments.

Interpretation:
- Apartments delta is expected from soft-delete/live filtering mechanics.
- Blocks delta is large and must be explained explicitly in analytics (e.g. `units_count > 0`, status filters, inactive blocks). This logic is currently implicit.

## 3) ETL / DB Write Correctness Audit

## 3.1 What is implemented correctly
- Streaming ingest for large apartments feed in `FeedSyncService` (memory-safe design).
- Reference data upsert before core entities (order is mostly correct).
- Soft-delete based on `last_seen_at` threshold.
- Post-sync aggregate materialization (`price_from`, `units_count`, `nearest_deadline_at`) and filter cache invalidation.

## 3.2 Critical/important findings

1. **Silent sync skip behavior is operationally dangerous**  
Running `php artisan feed:sync` returned almost empty summary with `Duration: 0s`.  
Given lock-based design (`Cache::lock`), this likely means "skipped due lock", but command UX does not clearly report skip reason in console.  
Impact: operations team can think sync succeeded while no data was updated.

2. **Historic referential-integrity failures were real**  
`feed-2026-02-26.log` contains multiple production failures:
- FK violation on `blocks.district_id`
- FK violation on `block_subway.subway_id`
- FK violation on `apartments.building_id`
- json-machine API misuse error (later fixed)  
This indicates ingestion order and feed anomalies historically broke consistency and should be continuously guarded by pre-upsert validators.

3. **Manual-vs-feed ownership is not encoded in schema**  
Current writes upsert directly into operational tables (`blocks`, `buildings`, `apartments`, dictionaries) without field-level ownership metadata.  
Any manual corrections in feed-managed fields risk being overwritten at next sync.

4. **Analyzer and sync are still partially disconnected**  
There is no hard gate: poor-quality feed can still proceed to sync if discovery/analyze uncovered structural anomalies.

## 4) CRM Gap Analysis (current vs modern CRM baseline)

Assessed files:
- `frontend/src/crm/pages/CrmCatalog.tsx`
- `frontend/src/crm/pages/CrmDictionaries.tsx`
- `frontend/src/crm/pages/CrmMedia.tsx`
- `frontend/src/crm/pages/CrmFeed.tsx`
- `frontend/src/crm/api.ts`
- `app/Http/Controllers/Api/V1/Crm*Controller.php`

### 4.1 Current strengths
- Base CRUD for users/roles/dictionaries/catalog/media is present.
- Feed commands can be launched from CRM UI.
- `is_active` and `position` now propagated in key entities.

### 4.2 Major product gaps

1. **No source governance model (feed/manual/import)**  
- Missing: source priority, lock rules, override strategy, protected fields.

2. **No revision history / no audit trail**  
- Missing: who changed what, when, and why; no rollback point.

3. **No moderation workflow**
- Missing draft/review/publish/archive states and approvals.

4. **Weak editing UX for core catalog**
- JSON prompt editing for catalog objects is not production-grade.
- No typed forms, no field-level validation UX, no dependent-field logic.

5. **No conflict resolution layer**
- Feed update and manual edit conflicts are not surfaced or resolvable in UI.

6. **No bulk operations / no automation**
- Missing mass update, mass status changes, conditional automations.

7. **No DQ observability in CRM**
- Missing dashboards: feed health, schema drift, sync failures, stale entities.

## 5) Root Causes

- Architecture is currently feed-ingest-centric, not governance-centric.
- No canonical separation between:
  - raw ingestion,
  - normalized data,
  - published content.
- CRM controls are operational CRUD screens, not a full lifecycle management system.

## 6) Priority Backlog (P0/P1/P2)

## P0 (must do first)
- P0.1 Add explicit sync outcome contract (`success|skipped|failed`, reason) in `feed:sync` and CRM feed runner.
- P0.2 Introduce ingest validation gate before upsert (FK precheck, enum/type checks, mandatory-key checks).
- P0.3 Add field ownership strategy for feed-managed entities (`source`, `is_locked_by_feed`, manual override flag).
- P0.4 Reduce discovery probe noise (do not log expected 404 as error; classify as debug/info).
- P0.5 Unify analysis artifacts contract (`report.json` + `relationships.json` always generated atomically).

## P1 (core modern CRM)
- P1.1 Replace JSON-prompt editing with typed schema-driven forms for catalog entities.
- P1.2 Add change history tables and UI timeline for every entity.
- P1.3 Add draft/publish workflow with role-based approvals.
- P1.4 Add conflict center: feed-vs-manual diffs, accept/reject/merge actions.
- P1.5 Add bulk actions and saved views/filters in CRM.

## P2 (advanced)
- P2.1 Data quality dashboard + SLO/SLA alerts.
- P2.2 Rule engine (auto-tagging, auto-prioritization, lifecycle rules).
- P2.3 Data lineage UI (where value came from, last sync, transformed by).
- P2.4 Scenario-safe rollback for feed imports.

## 7) Audit Conclusion

Production feed pipeline is functionally working for core ingestion but not yet at "modern managed CRM" maturity.  
The system needs a governance layer (source ownership, lifecycle, auditability, conflict resolution) to safely support both feed and manual object creation/editing at scale.

This report is the baseline for implementation phases in roadmap file:
- `docs/audit/2026-03-07_feed_crm_roadmap.md`

