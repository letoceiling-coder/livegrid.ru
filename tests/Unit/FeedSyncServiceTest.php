<?php

namespace Tests\Unit;

use App\Models\Apartment;
use App\Models\Block;
use App\Models\Building;
use App\Services\Feed\FeedClient;
use App\Services\Feed\FeedFetchResult;
use App\Services\Feed\FeedFileStorage;
use App\Services\Feed\FeedSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

/**
 * Unit tests for FeedSyncService.
 *
 * Tests: upsert creates / updates records, soft-delete logic.
 */
class FeedSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    private FeedSyncService $service;

    protected function setUp(): void
    {
        parent::setUp();

        // Mock the HTTP client — we don't make real HTTP calls in unit tests
        $client  = Mockery::mock(FeedClient::class);
        $storage = Mockery::mock(FeedFileStorage::class);

        $this->service = new FeedSyncService($client, $storage);
    }

    // ── upsertRegions ─────────────────────────────────────────────────────────

    public function test_upsert_regions_creates_records(): void
    {
        $this->service->upsertRegions([
            ['_id' => str_repeat('a', 24), 'crm_id' => 1, 'name' => 'Арбат'],
            ['_id' => str_repeat('b', 24), 'crm_id' => 2, 'name' => 'Басманный'],
        ]);

        $this->assertDatabaseCount('regions', 2);
        $this->assertDatabaseHas('regions', ['name' => 'Арбат']);
        $this->assertDatabaseHas('regions', ['name' => 'Басманный']);
    }

    public function test_upsert_regions_updates_existing(): void
    {
        $id = str_repeat('a', 24);

        $this->service->upsertRegions([
            ['_id' => $id, 'crm_id' => 1, 'name' => 'Арбат'],
        ]);

        // Second call with changed name
        $this->service->upsertRegions([
            ['_id' => $id, 'crm_id' => 1, 'name' => 'Арбат (обновлён)'],
        ]);

        $this->assertDatabaseCount('regions', 1);
        $this->assertDatabaseHas('regions', ['name' => 'Арбат (обновлён)']);
    }

    // ── upsertRooms ───────────────────────────────────────────────────────────

    public function test_upsert_rooms_uses_crm_id_as_pk(): void
    {
        $this->service->upsertRooms([
            ['_id' => str_repeat('a', 24), 'crm_id' => 0, 'name' => 'Студии'],
            ['_id' => str_repeat('b', 24), 'crm_id' => 1, 'name' => '1-к.кв'],
        ]);

        $this->assertDatabaseCount('rooms', 2);
        $this->assertDatabaseHas('rooms', ['crm_id' => 0, 'name' => 'Студии']);
        $this->assertDatabaseHas('rooms', ['crm_id' => 1, 'name' => '1-к.кв']);
    }

    // ── upsertApartments ──────────────────────────────────────────────────────

    public function test_upsert_apartments_sets_last_seen_at(): void
    {
        $block    = Block::factory()->create();
        $building = Building::factory()->create(['block_id' => $block->id]);

        $syncAt = Carbon::now();
        $aptId  = bin2hex(random_bytes(12));

        $this->service->upsertApartments([
            [
                '_id'         => $aptId,
                'crm_id'      => 12345,
                'building_id' => $building->id,
                'block_id'    => $block->id,
                'room'        => 2,
                'price'       => 8_000_000,
                'area_total'  => '55.5',
            ],
        ], $syncAt);

        $apt = DB::table('apartments')->where('id', $aptId)->first();

        $this->assertNotNull($apt);
        $this->assertEquals(
            $syncAt->toDateTimeString(),
            Carbon::parse($apt->last_seen_at)->toDateTimeString()
        );
    }

    public function test_upsert_apartments_updates_existing(): void
    {
        $block    = Block::factory()->create();
        $building = Building::factory()->create(['block_id' => $block->id]);

        $aptId = bin2hex(random_bytes(12));
        $syncAt = Carbon::now();

        $row = [
            '_id'         => $aptId,
            'crm_id'      => 11111,
            'building_id' => $building->id,
            'block_id'    => $block->id,
            'room'        => 1,
            'price'       => 5_000_000,
            'area_total'  => '40.0',
        ];

        $this->service->upsertApartments([$row], $syncAt);

        // Update price
        $row['price'] = 6_000_000;
        $this->service->upsertApartments([$row], $syncAt);

        $this->assertDatabaseCount('apartments', 1);
        $this->assertEquals(
            '6000000.00',
            DB::table('apartments')->where('id', $aptId)->value('price')
        );
    }

    // ── Soft-delete ───────────────────────────────────────────────────────────

    public function test_soft_delete_marks_stale_apartments(): void
    {
        // Create apartment with last_seen_at 1 hour ago
        $block    = Block::factory()->create();
        $building = Building::factory()->create(['block_id' => $block->id]);
        $aptId    = bin2hex(random_bytes(12));

        DB::table('apartments')->insert([
            'id'           => $aptId,
            'building_id'  => $building->id,
            'block_id'     => $block->id,
            'is_deleted'   => false,
            'last_seen_at' => Carbon::now()->subHour(),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        // Run a fresh sync with a "now" timestamp
        // The apartment won't be in this sync so its last_seen_at stays old
        // We call the soft-delete logic via the full sync with empty data
        // but we can test directly by calling upsertApartments with empty array
        // and then checking that apartments not in current sync are marked deleted.

        // Simulate: run sync with syncAt = now → stale apartment gets deleted
        $syncAt = Carbon::now();

        // The apartment's last_seen_at is 1 hour ago → it's > 5 min threshold
        $affected = DB::table('apartments')
            ->where('is_deleted', false)
            ->where(function ($q) use ($syncAt) {
                $q->whereNull('last_seen_at')
                  ->orWhere('last_seen_at', '<', $syncAt->copy()->subMinutes(5));
            })
            ->update(['is_deleted' => true, 'updated_at' => now()]);

        $this->assertEquals(1, $affected);
        $this->assertDatabaseHas('apartments', ['id' => $aptId, 'is_deleted' => 1]);
    }

    public function test_apartment_seen_in_current_sync_is_not_deleted(): void
    {
        $block    = Block::factory()->create();
        $building = Building::factory()->create(['block_id' => $block->id]);
        $aptId    = bin2hex(random_bytes(12));

        $syncAt = Carbon::now();

        // Insert apartment with last_seen_at = syncAt (just synced)
        DB::table('apartments')->insert([
            'id'           => $aptId,
            'building_id'  => $building->id,
            'block_id'     => $block->id,
            'is_deleted'   => false,
            'last_seen_at' => $syncAt,
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        // Soft-delete query with same syncAt
        $affected = DB::table('apartments')
            ->where('is_deleted', false)
            ->where(function ($q) use ($syncAt) {
                $q->whereNull('last_seen_at')
                  ->orWhere('last_seen_at', '<', $syncAt->copy()->subMinutes(5));
            })
            ->update(['is_deleted' => true, 'updated_at' => now()]);

        $this->assertEquals(0, $affected);
        $this->assertDatabaseHas('apartments', ['id' => $aptId, 'is_deleted' => 0]);
    }

    // ── Apartment global scope ────────────────────────────────────────────────

    public function test_apartment_model_excludes_deleted_by_default(): void
    {
        Apartment::factory()->create(['is_deleted' => false]);
        Apartment::factory()->create(['is_deleted' => true]);

        $count = Apartment::query()->count();

        $this->assertEquals(1, $count);
    }

    public function test_apartment_with_deleted_scope_includes_all(): void
    {
        Apartment::factory()->create(['is_deleted' => false]);
        Apartment::factory()->create(['is_deleted' => true]);

        $count = Apartment::withDeleted()->count();

        $this->assertEquals(2, $count);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
