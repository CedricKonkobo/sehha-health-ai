<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\MedicalDocument;
use App\Models\TriageEvent;
use App\Models\User;
use App\Services\EncryptionService;
use App\Services\PdfService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $encryption = app(EncryptionService::class);
        $mohamed = User::where('email', 'mohamed.elamrani@email.ma')->first();
        $drFatima = User::where('email', 'dr.fatima@sehha.ma')->first();

        if (!$mohamed || !$drFatima) return;

        // 1. Triage récent pour Mohamed (P2 - douleur thoracique)
        $triage = TriageEvent::create([
            'uuid' => (string) Str::uuid(),
            'patient_id' => $mohamed->id,
            'triage_date' => now()->subHours(2),
            'ia_score' => 'P2',
            'ccmu_score' => 3,
            'ia_confidence' => 0.85,
            'symptoms_json' => [
                'chief_complaint' => 'douleur thoracique',
                'irradiation' => 'bras gauche',
                'onset_hours' => 2,
                'severity_eva' => 7,
                'dyspnea' => false,
                'sweating' => true,
                'loss_of_consciousness' => false,
                'fever' => false,
            ],
            'red_flags' => ['sueurs', 'douleur_thoracique'],
            'orientation' => 'specialiste',
            'recommended_delay' => 'sous_24h',
            'human_validated' => true,
            'validated_by' => $drFatima->id,
            'notification_sent' => true,
        ]);

        // 2. RDV associé
        $appointment = Appointment::create([
            'uuid' => (string) Str::uuid(),
            'patient_id' => $mohamed->id,
            'doctor_id' => $drFatima->id,
            'service_id' => 2, // Cardiologie
            'starts_at' => now()->addDays(1)->setHour(9)->setMinute(0),
            'ends_at' => now()->addDays(1)->setHour(9)->setMinute(30),
            'status' => 'confirmed',
            'ia_suggested' => true,
            'motif' => 'Suivi cardiologie - douleur thoracique',
            'triage_id' => $triage->id,
            'sms_reminder_sent' => false,
        ]);

        // 3. Consultations passées (historique)
        $consultationsData = [
            [
                'date' => now()->subMonths(3),
                'motif' => 'Bilan annuel diabète',
                'diagnosis' => 'Diabète type 2 équilibré. HbA1c à 7.2%',
                'treatment' => 'Metformine 500mg 2x/jour. Régime hypocalorique.',
                'icd10_code' => 'E11.9',
            ],
            [
                'date' => now()->subMonths(6),
                'motif' => 'Palpitations',
                'diagnosis' => 'Extrasystoles ventriculaires bénignes. ECG normal.',
                'treatment' => 'Repos. Éviter caféine.',
                'icd10_code' => 'I49.9',
            ],
            [
                'date' => now()->subMonths(9),
                'motif' => 'Grippe saisonnière',
                'diagnosis' => 'Infection virale des voies respiratoires supérieures',
                'treatment' => 'Paracétamol 1g si fièvre. Repos. Hydratation.',
                'icd10_code' => 'J06.9',
            ],
        ];

        foreach ($consultationsData as $data) {
            Consultation::create([
                'uuid' => (string) Str::uuid(),
                'patient_id' => $mohamed->id,
                'doctor_id' => $drFatima->id,
                'service_id' => 2,
                'motif' => $data['motif'],
                'diagnosis' => $data['diagnosis'],
                'icd10_code' => $data['icd10_code'],
                'treatment' => $data['treatment'],
                'consultation_date' => $data['date'],
            ]);
        }

        // 4. Ordonnance PDF (générée)
        $pdfService = app(PdfService::class);
        $issuedAt = now()->subMonths(3);
        $ordonnanceUuid = (string) Str::uuid();

        $ordonnance = MedicalDocument::create([
            'uuid' => $ordonnanceUuid,
            'patient_id' => $mohamed->id,
            'created_by' => $drFatima->id,
            'type' => 'ordonnance',
            'title' => 'Ordonnance du ' . $issuedAt->format('d/m/Y'),
            'issued_at' => $issuedAt,
            'expires_at' => $issuedAt->copy()->addMonths(3),
            'qr_hash' => $pdfService->generatePrescriptionQrHash(
                $ordonnanceUuid,
                $mohamed->id,
                $drFatima->id,
                $issuedAt->toDateString()
            ),
            'structured_data' => [
                'medicaments' => [
                    ['nom' => 'Metformine 500mg', 'posologie' => '1 comprimé matin et soir au repas', 'duree' => '90 jours'],
                    ['nom' => 'Amlodipine 5mg', 'posologie' => '1 comprimé le matin', 'duree' => '90 jours'],
                    ['nom' => 'Atorvastatine 20mg', 'posologie' => '1 comprimé le soir', 'duree' => '90 jours'],
                ],
            ],
            'status' => 'valide',
            'visible_to_patient' => true,
        ]);

        // Générer le PDF
        $pdfPath = $pdfService->generatePrescriptionPdf($ordonnance);
        $ordonnance->update(['storage_path' => $pdfPath]);

        // 5. Autres triages aléatoires
        $patients = User::where('role', 'patient')->where('id', '!=', $mohamed->id)->limit(10)->get();
        $scores = ['P1', 'P2', 'P3', 'P4'];
        $orientations = ['urgences', 'specialiste', 'medecin_gen', 'teleconsult'];

        foreach ($patients as $patient) {
            $score = fake()->randomElement($scores);

            TriageEvent::create([
                'uuid' => (string) Str::uuid(),
                'patient_id' => $patient->id,
                'triage_date' => fake()->dateTimeBetween('-7 days', 'now'),
                'ia_score' => $score,
                'ccmu_score' => match($score) {
                    'P1' => 5, 'P2' => 3, 'P3' => 2, 'P4' => 1,
                },
                'ia_confidence' => fake()->randomFloat(3, 0.60, 0.95),
                'symptoms_json' => [
                    'chief_complaint' => fake()->randomElement(['fièvre', 'maux de tête', 'douleur abdominale', 'toux', 'fatigue']),
                    'severity_eva' => fake()->numberBetween(1, 10),
                ],
                'red_flags' => $score === 'P1' ? ['perte_conscience'] : [],
                'orientation' => fake()->randomElement($orientations),
                'recommended_delay' => fake()->randomElement(['immediat', 'sous_1h', 'sous_24h', 'sous_48h']),
                'human_validated' => fake()->boolean(70),
                'validated_by' => $drFatima->id,
                'notification_sent' => true,
            ]);
        }
    }
}