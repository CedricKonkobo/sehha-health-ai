<?php

namespace Database\Factories;

use App\Models\Inventory;
use Illuminate\Database\Eloquent\Factories\Factory;

class InventoryFactory extends Factory
{
    protected $model = Inventory::class;

    public function definition(): array
    {
        $quantity = fake()->randomFloat(2, 0, 500);
        $threshold = fake()->randomFloat(2, 10, 50);

        $status = match(true) {
            $quantity <= $threshold * 0.5 => 'critique',
            $quantity <= $threshold => 'alerte',
            $quantity <= $threshold * 1.5 => 'faible',
            default => 'ok',
        };

        return [
            'clinic_id' => 1,
            'product_name' => fake()->randomElement([
                'Paracétamol 500mg', 'Amoxicilline 1g', 'Insuline rapide',
                'Sérum physiologique', 'Masques chirurgicaux', 'Gants stériles',
                'Bandages', 'Antiseptique', 'Adrénaline', 'Morphine'
            ]),
            'quantity' => $quantity,
            'unit' => fake()->randomElement(['comprimés', 'ampoules', 'flacons', 'boîtes', 'sachets']),
            'alert_threshold' => $threshold,
            'status' => $status,
            'last_updated_by' => null,
            'updated_at' => now(),
        ];
    }
}