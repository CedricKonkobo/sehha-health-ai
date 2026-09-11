<?php

namespace Database\Factories;

use App\Models\Clinic;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClinicFactory extends Factory
{
    protected $model = Clinic::class;

    public function definition(): array
    {
        return [
            'name' => fake()->company() . ' - Clinique',
            'address' => fake()->address(),
            'city' => fake()->city(),
            'phone' => '0' . fake()->numberBetween(5, 5) . fake()->numerify('########'),
            'type' => fake()->randomElement(['privee', 'publique', 'conventionnee']),
            'capacity_beds' => fake()->numberBetween(50, 200),
            'is_active' => true,
        ];
    }
}