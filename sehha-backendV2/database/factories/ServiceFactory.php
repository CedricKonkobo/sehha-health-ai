<?php

namespace Database\Factories;

use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        return [
            'clinic_id' => 1,
            'name' => fake()->randomElement([
                'Urgences', 'Cardiologie', 'Pédiatrie', 'Maternité',
                'Chirurgie', 'Médecine Générale', 'Radiologie', 'Laboratoire'
            ]),
            'beds_total' => fake()->numberBetween(10, 40),
            'beds_occupied' => fake()->numberBetween(0, 10),
            'head_doctor_id' => null,
        ];
    }
}