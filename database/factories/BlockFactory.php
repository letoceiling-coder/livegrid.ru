<?php

namespace Database\Factories;

use App\Models\Block;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Block>
 */
class BlockFactory extends Factory
{
    protected $model = Block::class;

    public function definition(): array
    {
        $lat = $this->faker->latitude(55.5, 56.0);
        $lng = $this->faker->longitude(37.0, 38.0);

        return [
            'id'           => bin2hex(random_bytes(12)),
            'crm_id'       => $this->faker->unique()->numberBetween(1, 999_999),
            'name'         => $this->faker->words(3, true),
            'description'  => $this->faker->paragraph(),
            'address'      => $this->faker->streetAddress(),
            'district_id'  => null,
            'district_name' => null,
            'builder_id'   => null,
            'builder_name' => null,
            'lat'          => $lat,
            'lng'          => $lng,
            'location'     => \Illuminate\Support\Facades\DB::raw(
                "ST_GeomFromText('POINT({$lng} {$lat})', 4326)"
            ),
            'geometry_json' => null,
            'is_city'      => true,
            'status'       => 1,
            'deadline_at'  => null,
            'min_price'    => null,
            'max_price'    => null,
            'min_area'     => null,
            'max_area'     => null,
            'images'       => null,
        ];
    }
}
