<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\EncryptionService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $encryption = app(EncryptionService::class);

        // Super Admin
        User::factory()->superAdmin()->create([
            'name' => 'Administrateur Système',
            'email' => 'superadmin@sehha.ma',
            'password' => Hash::make('Admin@123'),
        ]);

        // Admin
        User::factory()->admin()->create([
            'name' => 'Admin Clinique',
            'email' => 'admin@sehha.ma',
            'password' => Hash::make('Admin@123'),
        ]);

        // Médecins
        $doctors = [
            ['name' => 'Dr. Fatima Zahra', 'email' => 'dr.fatima@sehha.ma', 'speciality' => 'medecine_generale'],
            ['name' => 'Dr. Karim Benali', 'email' => 'dr.karim@sehha.ma', 'speciality' => 'cardiologie'],
            ['name' => 'Dr. Samira Tazi', 'email' => 'dr.samira@sehha.ma', 'speciality' => 'pediatrie'],
            ['name' => 'Dr. Youssef Alami', 'email' => 'dr.youssef@sehha.ma', 'speciality' => 'urgentiste'],
            ['name' => 'Dr. Laila Moussaoui', 'email' => 'dr.laila@sehha.ma', 'speciality' => 'maternite'],
        ];

        foreach ($doctors as $doc) {
            User::factory()->medecin()->create([
                'name' => $doc['name'],
                'email' => $doc['email'],
                'password' => Hash::make('Medecin@123'),
            ]);
        }

        // Infirmiers
        User::factory()->infirmier()->create([
            'name' => 'Infirmier Ali Benbrahim',
            'email' => 'ali.infirmier@sehha.ma',
            'password' => Hash::make('Infirmier@123'),
        ]);

        User::factory()->infirmier()->create([
            'name' => 'Infirmière Sara Idrissi',
            'email' => 'sara.infirmiere@sehha.ma',
            'password' => Hash::make('Infirmier@123'),
        ]);

        // Patient démo (Mohamed du scénario)
        $cin = 'AB123456';
        User::factory()->patient()->create([
            'name' => 'Mohamed El Amrani',
            'email' => 'mohamed.elamrani@email.ma',
            'phone_encrypted' => $encryption->encrypt('0612345678'),
            'cin_hash' => $encryption->hash($cin),
            'cin_encrypted' => $encryption->encrypt($cin),
            'password' => Hash::make('Patient@123'),
        ]);

        // Autres patients
        User::factory()->count(20)->patient()->create();
    }
}