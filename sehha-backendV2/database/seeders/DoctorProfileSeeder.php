<?php

namespace Database\Seeders;

use App\Models\DoctorProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;

class DoctorProfileSeeder extends Seeder
{
    public function run(): void
    {
        $doctors = User::where('role', 'medecin')->get();
        $services = Service::where('beds_total', '>', 0)->get();

        $specialities = ['medecine_generale', 'cardiologie', 'pediatrie', 'urgentiste', 'maternite'];

        foreach ($doctors as $index => $doctor) {
            $service = $services[$index % $services->count()];

            DoctorProfile::create([
                'user_id' => $doctor->id,
                'clinic_id' => 1,
                'service_id' => $service->id,
                'speciality' => $specialities[$index % count($specialities)],
                'grade' => fake()->randomElement(['praticien', 'specialiste', 'chef_urgences']),
                'inami_number' => fake()->numerify('##########'),
                'schedule_json' => [
                    1 => ['is_working' => true, 'start' => '08:00', 'end' => '16:00', 'break_start' => '12:00', 'break_end' => '13:00'],
                    2 => ['is_working' => true, 'start' => '08:00', 'end' => '16:00', 'break_start' => '12:00', 'break_end' => '13:00'],
                    3 => ['is_working' => true, 'start' => '08:00', 'end' => '16:00', 'break_start' => '12:00', 'break_end' => '13:00'],
                    4 => ['is_working' => true, 'start' => '08:00', 'end' => '16:00', 'break_start' => '12:00', 'break_end' => '13:00'],
                    5 => ['is_working' => true, 'start' => '08:00', 'end' => '16:00', 'break_start' => '12:00', 'break_end' => '13:00'],
                    6 => ['is_working' => false],
                    0 => ['is_working' => false],
                ],
            ]);
        }
    }
}