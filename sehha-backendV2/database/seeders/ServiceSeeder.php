<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            ['name' => 'Urgences', 'beds_total' => 20, 'beds_occupied' => 12],
            ['name' => 'Cardiologie', 'beds_total' => 15, 'beds_occupied' => 8],
            ['name' => 'Pédiatrie', 'beds_total' => 18, 'beds_occupied' => 10],
            ['name' => 'Maternité', 'beds_total' => 25, 'beds_occupied' => 15],
            ['name' => 'Chirurgie', 'beds_total' => 12, 'beds_occupied' => 6],
            ['name' => 'Médecine Générale', 'beds_total' => 10, 'beds_occupied' => 4],
            ['name' => 'Radiologie', 'beds_total' => 0, 'beds_occupied' => 0],
            ['name' => 'Laboratoire', 'beds_total' => 0, 'beds_occupied' => 0],
        ];

        foreach ($services as $index => $svc) {
            $doctorId = null;
            if ($svc['beds_total'] > 0) {
                // Attribuer un médecin chef
                $doctor = User::where('role', 'medecin')->skip($index)->first();
                $doctorId = $doctor?->id;
            }

            Service::create([
                'clinic_id' => 1,
                'name' => $svc['name'],
                'beds_total' => $svc['beds_total'],
                'beds_occupied' => $svc['beds_occupied'],
                'head_doctor_id' => $doctorId,
            ]);
        }
    }
}