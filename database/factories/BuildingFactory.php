<?php

namespace Database\Factories;

use App\Models\Block;
use App\Models\Building;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Building>
 */
class BuildingFactory extends Factory
{
    protected $model = Building::class;

    public function definition(): array
    {
        return [
            'id'               => bin2hex(random_bytes(12)),
            'crm_id'           => $this->faker->unique()->numberBetween(1, 999_999),
            'block_id'         => Block::factory(),
            'name'             => (string) $this->faker->numberBetween(1, 5),
            'building_type_id' => null,
            'floors_total'     => $this->faker->numberBetween(5, 40),
            'deadline_at'      => null,
            'queue'            => $this->faker->numberBetween(1, 3),
            'height'           => null,
            'status'           => 1,
            'lat'              => null,
            'lng'              => null,
            'banks'            => null,
        ];
    }
}
