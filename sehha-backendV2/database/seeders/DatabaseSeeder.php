<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            ClinicSeeder::class,
            UserSeeder::class,
            ServiceSeeder::class,
            DoctorProfileSeeder::class,
            PatientRecordSeeder::class,
            InventorySeeder::class,
            DemoDataSeeder::class,
        ]);
    }
}