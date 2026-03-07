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
- `php artisan feed:collect --list` now correctly reflects snapshot history per endpoint.

### Scheduling
Configured in `app/Console/Kernel.php`:
- `feed:collect` daily 03:00
- `feed:inspect --dump-entities` daily 03:30
- `feed:analyze` daily 04:00
- `feed:sync` daily 04:30

## 2) Data Quality Audit (feed + API)

### 2.1 Positive
- Discovery completed without endpoint fetch errors when probing was disabled (`--no-probe`).
- All core dictionary endpoints are present and non-empty.
- Filters endpoint confirms rich dictionary/range availability.

Measured from `/api/v1/filters`:
- districts total: 122
- districts with `name = null`: 2
- builders total: 198
- builders with `name = null`: 0
- finishings total: 6

### 2.2 High-risk findings

1. **False confidence in aggregate quality metrics**  
`storage/feed/analysis/report.json` reports:
- `nullable_ratio=0`
- `mixed_type_fields=0`  
For a 155+ MB multi-entity feed this is unrealistic and indicates current quality aggregation underestimates optional/dirty fields.

2. **Probe strategy pollutes logs with expected 404**  
When probe mode is enabled, `FeedDiscoveryService` generates many expected 404 errors (e.g. `/about/projects`, `/about/amenities`) in `feed-2026-03-07.log`.  
This increases alert fatigue and obscures true failures.

3. **Analysis artifact contract is inconsistent**  
`report.json` exists, but combined `relationships.json` is absent for the same run context.  
Architecture and migration planning consumers get incomplete metadata.

4. **Encoding robustness remains an ingestion concern**  
CRM already hit production error `Malformed UTF-8 characters` during JSON serialization. Response-layer mitigation is applied, but input-quality normalization is still missing.

### 2.3 Public API consistency snapshot
- `/api/v1/blocks?per_page=1&page=1` -> `meta.total=490`
- `/api/v1/apartments?per_page=1&page=1` -> `meta.total=62214`
- Source feed totals: blocks `1,289`, apartments `62,976`

Interpretation:
- apartments delta (`762`) and blocks delta (`799`) are large enough to require explicit, traceable publication rules in CRM (now implicit in backend logic).

## 3) ETL / DB Write Correctness Audit

### 3.1 What is implemented correctly
- Memory-safe streaming design in `FeedSyncService` (chunk upsert for apartments).
- Correct stage order at design level: dictionaries -> blocks/buildings -> apartments -> soft-delete -> aggregate refresh.
- `feed:sync --dry-run` returns coherent reference counts:
  - regions 181, subways 447, builders 561, finishings 7, building_types 11, rooms 28, blocks 1289, buildings 9269.

### 3.2 Critical findings

1. **Production sync is currently broken (P0 blocker)**  
Running `php artisan feed:sync` fails with:
`Class "JsonMachine\Items" not found`

Impact:
- Full incremental sync pipeline does not execute.
- Production operational tables drift from feed source.

Root cause:
- `FeedSyncService` uses `JsonMachine\Items` but `composer.json` does not include `halaxa/json-machine`.

2. **Observed source-vs-DB divergence**
- Feed reports: blocks 1289 / buildings 9269 / apartments 62976.
- Current DB/API state:
  - `App\Models\Block::count()` -> 1284
  - `App\Models\Building::count()` -> 2444
  - `App\Models\Apartment::count()` -> 62214
  - `App\Models\Apartment::whereIsDeleted(true)->count()` -> 0

This confirms incomplete alignment between feed and persisted catalog.

3. **No hard data-quality gate before upsert**
- Discovery/analyze outputs are informational only.
- Sync does not stop on structural anomalies (except runtime failures), increasing risk of silent corruption.

4. **Manual-vs-feed ownership not encoded**
- No field-level source policy (`feed/manual/import`) and no lock semantics.
- Manual corrections can be overwritten by next sync once sync is restored.

## 4) CRM Gap Analysis (current vs modern CRM baseline)

Assessed:
- `frontend/src/crm/pages/CrmCatalog.tsx`
- `frontend/src/crm/pages/CrmDictionaries.tsx`
- `frontend/src/crm/pages/CrmMedia.tsx`
- `frontend/src/crm/pages/CrmFeed.tsx`
- `frontend/src/crm/api.ts`
- `app/Http/Controllers/Api/V1/Crm*Controller.php`

### 4.1 Current strengths
- Base CRUD exists for users/roles/dictionaries/catalog/media.
- `is_active` + `position` are exposed in API/UI.
- Feed commands can be launched from CRM UI.

### 4.2 Major product/architecture gaps
1. No source governance model (`feed/manual/import`) with priority and lock policies.
2. No revision history / audit trail / rollback.
3. No moderation lifecycle (`draft/review/publish/archive`).
4. Weak editing UX for catalog (JSON prompt editing still used).
5. No conflict resolution center for feed-vs-manual collisions.
6. No bulk operations / automation workflows.
7. No DQ observability dashboard in CRM.
8. `CrmFeedController` always returns `exit_code=0` even if command fails (false-positive UX/ops signal).

## 5) Root Causes
- Platform is ingest-oriented, not governance-oriented.
- No strict separation between `raw`, `normalized`, `published` layers.
- CRM currently acts as CRUD shell, not as controlled data lifecycle system.

## 6) Priority Backlog (P0/P1/P2)

### P0 (must do first)
- P0.1 Install/lock required sync dependency (`halaxa/json-machine`) and verify `feed:sync` e2e.
- P0.2 Return truthful feed command status in CRM (`success|skipped|failed`, real exit code, reason).
- P0.3 Add ingest validation gate (FK/type/required fields) before write stages.
- P0.4 Add minimal source governance (`source_type`, `manual_override`, `locked_by_feed`).
- P0.5 Reclassify expected discovery probe 404 logs to non-error severity.
- P0.6 Enforce complete analysis artifact set (`report.json` + `relationships.json`) atomically.

### P1 (core modern CRM)
- P1.1 Replace JSON prompt editing with typed schema-driven forms.
- P1.2 Add entity revision tables + timeline UI.
- P1.3 Add role-based publish workflow and state machine.
- P1.4 Add conflict center for feed/manual merge decisions.
- P1.5 Add bulk actions + saved views.

### P2 (advanced)
- P2.1 Data quality dashboard + SLO/SLA alerts.
- P2.2 Rule engine (auto-tagging, lifecycle automations).
- P2.3 Field-level lineage view.
- P2.4 Safe rollback/import framework with deterministic idempotency.

## 7) Audit Conclusion
Production has a valuable feed foundation but is currently not at the level of a modern managed CRM.

Main immediate blocker is operational: `feed:sync` fails in production due missing runtime dependency, so data freshness and integrity guarantees are not met.

Roadmap and implementation sequence are detailed in:
- `docs/audit/2026-03-07_feed_crm_roadmap.md`

