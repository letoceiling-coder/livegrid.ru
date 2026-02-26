<?php

namespace Database\Factories;

use App\Models\Apartment;
use App\Models\Block;
use App\Models\Building;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Apartment>
 */
class ApartmentFactory extends Factory
{
    protected $model = Apartment::class;

    public function definition(): array
    {
        // Generate a MongoDB-like 24-char hex ID
        $id = $this->mongoId();

        $blockId    = Block::factory()->create()->id;
        $buildingId = Building::factory()->create(['block_id' => $blockId])->id;

        $room  = $this->faker->numberBetween(0, 4);
        $price = $this->faker->numberBetween(3_000_000, 50_000_000);
        $area  = $this->faker->randomFloat(2, 20, 120);

        return [
            'id'                    => $id,
            'crm_id'                => $this->faker->unique()->numberBetween(1, 9_999_999),
            'building_id'           => $buildingId,
            'block_id'              => $blockId,
            'room'                  => $room,
            'rooms_crm_id'          => null, // FK to rooms.crm_id — set null in tests to avoid constraint
            'floor'                 => $this->faker->numberBetween(1, 25),
            'floors_total'          => 25,
            'number'                => (string) $this->faker->numberBetween(1, 500),
            'wc_count'              => $this->faker->numberBetween(1, 2),
            'area_total'            => $area,
            'area_living'           => round($area * 0.6, 2),
            'area_kitchen'          => round($area * 0.15, 2),
            'area_given'            => $area,
            'area_balconies'        => null,
            'area_rooms'            => null,
            'area_rooms_total'      => round($area * 0.6, 2),
            'price'                 => $price,
            'price_per_meter'       => round($price / $area, 2),
            'finishing_id'          => null,
            'building_type_id'      => null,
            'plan_url'              => null,
            'block_name'            => $this->faker->words(2, true),
            'block_district_id'     => null,
            'block_district_name'   => $this->faker->word(),
            'block_builder_id'      => null,
            'block_builder_name'    => $this->faker->company(),
            'block_lat'             => $this->faker->latitude(55.5, 56.0),
            'block_lng'             => $this->faker->longitude(37.0, 38.0),
            'block_is_city'         => true,
            'building_deadline_at'  => null,
            'is_deleted'            => false,
            'last_seen_at'          => now(),
        ];
    }

    /** Build an apartment marked as deleted */
    public function deleted(): static
    {
        return $this->state(['is_deleted' => true]);
    }

    /** Force a specific room count */
    public function rooms(int $room): static
    {
        return $this->state(['room' => $room, 'rooms_crm_id' => null]);
    }

    /** Force a specific price */
    public function price(int $price): static
    {
        return $this->state(['price' => $price]);
    }

    /** Force a specific district */
    public function inDistrict(string $districtId, string $districtName = 'Test District'): static
    {
        return $this->state([
            'block_district_id'   => $districtId,
            'block_district_name' => $districtName,
        ]);
    }

    private function mongoId(): string
    {
        return bin2hex(random_bytes(12));
    }
}
