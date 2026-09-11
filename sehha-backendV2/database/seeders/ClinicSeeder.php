<?php

namespace Database\Seeders;

use App\Models\Clinic;
use Illuminate\Database\Seeder;

class ClinicSeeder extends Seeder
{
    public function run(): void
    {
        Clinic::create([
            'name' => 'Clinique Polyvalente Ibn Tofail',
            'address' => 'Avenue Mohamed VI, Kénitra',
            'city' => 'Kénitra',
            'phone' => '0537312345',
            'type' => 'publique',
            'capacity_beds' => 120,
            'is_active' => true,
        ]);
    }
}