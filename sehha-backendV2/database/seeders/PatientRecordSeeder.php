<?php

namespace Database\Seeders;

use App\Models\Allergy;
use App\Models\MedicalHistory;
use App\Models\PatientRecord;
use App\Models\User;
use App\Services\EncryptionService;
use Illuminate\Database\Seeder;

class PatientRecordSeeder extends Seeder
{
    public function run(): void
    {
        $encryption = app(EncryptionService::class);
        $patients = User::where('role', 'patient')->get();

        foreach ($patients as $patient) {
            // DME
            $record = PatientRecord::create([
                'patient_id' => $patient->id,
                'blood_group' => fake()->randomElement(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
                'height_cm' => fake()->numberBetween(150, 190),
                'coverage_type' => fake()->randomElement(['cnss', 'ramed', 'axa', 'saham', 'mamda', 'prive']),
            ]);

            // Allergies pour Mohamed (patient démo)
            if ($patient->name === 'Mohamed El Amrani') {
                Allergy::create([
                    'patient_id' => $patient->id,
                    'substance_encrypted' => $encryption->encrypt('Penicilline'),
                    'severity' => 'severe',
                    'reaction_description' => 'Choc anaphylactique lors d\'un traitement antérieur en 2023',
                    'discovered_at' => '2023-03-15',
                    'documented_by' => User::where('role', 'medecin')->first()?->id,
                ]);

                // Antécédents
                MedicalHistory::create([
                    'patient_id' => $patient->id,
                    'type' => 'pathologie_chronique',
                    'description_encrypted' => $encryption->encrypt('Diabète type 2 diagnostiqué en 2022. Traitement par Metformine.'),
                    'started_at' => '2022-06-10',
                ]);

                MedicalHistory::create([
                    'patient_id' => $patient->id,
                    'type' => 'pathologie_chronique',
                    'description_encrypted' => $encryption->encrypt('Hypertension artérielle. Traitement par Amlodipine 5mg.'),
                    'started_at' => '2021-01-20',
                ]);

                MedicalHistory::create([
                    'patient_id' => $patient->id,
                    'type' => 'chirurgie',
                    'description_encrypted' => $encryption->encrypt('Appendicectomie en 2019. Sans complication.'),
                    'started_at' => '2019-08-05',
                    'resolved_at' => '2019-08-20',
                ]);
            } else {
                // Allergies aléatoires pour autres patients
                if (fake()->boolean(30)) {
                    Allergy::create([
                        'patient_id' => $patient->id,
                        'substance_encrypted' => $encryption->encrypt(fake()->randomElement(['Ibuprofène', 'Latex', 'Pollen', 'Arachides', 'Sulfamides'])),
                        'severity' => fake()->randomElement(['mild', 'moderate', 'severe']),
                        'documented_by' => User::where('role', 'medecin')->first()?->id,
                    ]);
                }

                // Antécédents aléatoires
                if (fake()->boolean(60)) {
                    MedicalHistory::create([
                        'patient_id' => $patient->id,
                        'type' => fake()->randomElement(['chirurgie', 'pathologie_chronique', 'pathologie_aigue']),
                        'description_encrypted' => $encryption->encrypt(fake()->sentence(10)),
                        'started_at' => fake()->dateTimeBetween('-10 years', '-1 year'),
                    ]);
                }
            }
        }
    }
}