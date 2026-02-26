<?php

namespace Tests\Feature;

use App\Models\Apartment;
use App\Models\Block;
use App\Models\Building;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for GET /api/v1/apartments
 *
 * Tests: price filter, room filter, district filter,
 *        soft-delete exclusion, pagination,
 *        geo filter (MySQL-only), fulltext search (MySQL-only).
 */
class ApartmentFilterTest extends TestCase
{
    use RefreshDatabase;

    // ── Price filter ─────────────────────────────────────────────────────────

    public function test_filter_by_price_min(): void
    {
        Apartment::factory()->price(5_000_000)->create();
        Apartment::factory()->price(15_000_000)->create();

        $response = $this->getJson('/api/v1/apartments?price_min=10000000');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_filter_by_price_max(): void
    {
        Apartment::factory()->price(5_000_000)->create();
        Apartment::factory()->price(15_000_000)->create();

        $response = $this->getJson('/api/v1/apartments?price_max=10000000');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_filter_by_price_range(): void
    {
        Apartment::factory()->price(3_000_000)->create();
        Apartment::factory()->price(7_000_000)->create();
        Apartment::factory()->price(15_000_000)->create();

        $response = $this->getJson('/api/v1/apartments?price_min=5000000&price_max=10000000');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    // ── Room filter ───────────────────────────────────────────────────────────

    public function test_filter_by_rooms(): void
    {
        Apartment::factory()->rooms(0)->create(); // studio
        Apartment::factory()->rooms(1)->create(); // 1-room
        Apartment::factory()->rooms(2)->create(); // 2-room
        Apartment::factory()->rooms(3)->create(); // 3-room

        $response = $this->getJson('/api/v1/apartments?room[]=1&room[]=2');

        $response->assertOk()
            ->assertJsonCount(2, 'data');
    }

    // ── District filter ───────────────────────────────────────────────────────

    public function test_filter_by_district(): void
    {
        $distId = str_repeat('a', 24);

        Apartment::factory()->inDistrict($distId, 'Арбат')->create();
        Apartment::factory()->inDistrict(str_repeat('b', 24), 'Басманный')->create();

        $response = $this->getJson("/api/v1/apartments?district[]={$distId}");

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    // ── Soft-delete exclusion ─────────────────────────────────────────────────

    public function test_deleted_apartments_are_excluded_by_default(): void
    {
        Apartment::factory()->create(['is_deleted' => false]);
        Apartment::factory()->create(['is_deleted' => true]);

        $response = $this->getJson('/api/v1/apartments');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_deleted_apartment_not_returned_by_show(): void
    {
        $apt = Apartment::factory()->create(['is_deleted' => true]);

        $this->getJson("/api/v1/apartments/{$apt->id}")
            ->assertNotFound();
    }

    // ── Pagination ────────────────────────────────────────────────────────────

    public function test_pagination_returns_correct_per_page(): void
    {
        Apartment::factory()->count(25)->create();

        $response = $this->getJson('/api/v1/apartments?per_page=10');

        $response->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 25);
    }

    public function test_pagination_links_present(): void
    {
        Apartment::factory()->count(5)->create();

        $response = $this->getJson('/api/v1/apartments');

        $response->assertOk()
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    // ── Sorting ───────────────────────────────────────────────────────────────

    public function test_sort_by_price_asc(): void
    {
        Apartment::factory()->price(10_000_000)->create();
        Apartment::factory()->price(5_000_000)->create();
        Apartment::factory()->price(20_000_000)->create();

        $response = $this->getJson('/api/v1/apartments?sort=price&order=asc');

        $response->assertOk();

        $prices = collect($response->json('data'))->pluck('price')->toArray();
        $this->assertEquals(array_values($prices), array_values(collect($prices)->sort()->values()->toArray()));
    }

    // ── Geo filter (MySQL-only) ───────────────────────────────────────────────

    public function test_geo_radius_filter(): void
    {
        if (! $this->isMysql()) {
            $this->markTestSkipped('Geo filter requires MySQL (ST_Distance_Sphere)');
        }

        // Moscow center: 55.7558, 37.6173
        $near = Apartment::factory()->create([
            'block_lat' => 55.760,
            'block_lng' => 37.620,
        ]);

        $far = Apartment::factory()->create([
            'block_lat' => 56.000, // ~27 km away
            'block_lng' => 37.000,
        ]);

        // 5 km radius around Moscow center
        $response = $this->getJson(
            '/api/v1/apartments?lat=55.7558&lng=37.6173&radius=5000'
        );

        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertContains($near->id, $ids);
        $this->assertNotContains($far->id, $ids);
    }

    // ── Fulltext search (MySQL-only) ──────────────────────────────────────────

    public function test_fulltext_search(): void
    {
        if (! $this->isMysql()) {
            $this->markTestSkipped('Fulltext search requires MySQL MATCH...AGAINST');
        }

        Apartment::factory()->create([
            'block_name'         => 'ЖК Садовый',
            'block_builder_name' => 'СтройТех',
            'block_district_name' => 'Арбат',
        ]);
        Apartment::factory()->create([
            'block_name'         => 'ЖК Лесной',
            'block_builder_name' => 'МегаСтрой',
            'block_district_name' => 'Басманный',
        ]);

        $response = $this->getJson('/api/v1/apartments?search=Садовый');

        $response->assertOk();

        $names = collect($response->json('data'))->pluck('block.name');
        $this->assertTrue($names->contains('ЖК Садовый'));
    }

    // ── Validation ────────────────────────────────────────────────────────────

    public function test_invalid_price_returns_422(): void
    {
        $this->getJson('/api/v1/apartments?price_min=notanumber')
            ->assertUnprocessable();
    }

    public function test_filters_endpoint_returns_structure(): void
    {
        $response = $this->getJson('/api/v1/filters');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'rooms', 'districts', 'builders', 'finishings',
                    'price' => ['min', 'max'],
                    'area'  => ['min', 'max'],
                    'floor' => ['min', 'max'],
                    'deadline' => ['min', 'max'],
                ],
            ]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function isMysql(): bool
    {
        return config('database.default') === 'mysql';
    }
}
