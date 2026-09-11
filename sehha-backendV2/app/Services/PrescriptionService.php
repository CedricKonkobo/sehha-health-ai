<?php

namespace App\Services;

use App\Models\MedicalDocument;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PrescriptionService
{
    public function __construct(
        private PdfService $pdf,
        private EncryptionService $encryption,
        private NotificationService $notification
    ) {}

    public function createPrescription(User $doctor, User $patient, array $data): MedicalDocument
    {
        // Vérification allergies
        $this->checkAllergies($patient, $data['medicaments'] ?? []);

        $uuid = (string) Str::uuid();
        $issuedAt = now();

        $qrHash = $this->pdf->generatePrescriptionQrHash(
            $uuid,
            $patient->id,
            $doctor->id,
            $issuedAt->toIso8601String()
        );

        $document = MedicalDocument::create([
            'uuid' => $uuid,
            'patient_id' => $patient->id,
            'created_by' => $doctor->id,
            'type' => 'ordonnance',
            'title' => 'Ordonnance du ' . $issuedAt->format('d/m/Y'),
            'issued_at' => $issuedAt,
            'expires_at' => $issuedAt->copy()->addMonths(3),
            'qr_hash' => $qrHash,
            'structured_data' => [
                'medicaments' => $data['medicaments'] ?? [],
                'signature' => $data['signature'] ?? null,
                'notes' => $data['notes'] ?? null,
            ],
            'status' => 'valide',
            'visible_to_patient' => true,
        ]);

        // Génération PDF
        $pdfPath = $this->pdf->generatePrescriptionPdf($document);
        $document->update(['storage_path' => $pdfPath]);

        // Notification patient
        $this->notification->sendPrescriptionNotification($document);

        return $document;
    }

    public function verifyQr(string $uuid, string $hash): array
    {
        $isValid = $this->pdf->verifyPrescription($uuid, $hash);

        return [
            'valid' => $isValid,
            'message' => $isValid ? 'Ordonnance authentique' : 'Ordonnance invalide ou falsifiée',
            'verified_at' => now()->toIso8601String(),
        ];
    }

    public function cancelPrescription(MedicalDocument $document, User $user): void
    {
        $document->update([
            'status' => 'annule',
            'visible_to_patient' => false,
        ]);

        // Audit log
        \App\Models\AuditLog::create([
            'user_id' => $user->id,
            'action' => 'update',
            'resource_type' => 'medical_documents',
            'resource_id' => $document->id,
            'old_values' => ['status' => 'valide'],
            'new_values' => ['status' => 'annule'],
            'ip_address' => request()->ip(),
            'timestamp' => now(),
        ]);
    }

    private function checkAllergies(User $patient, array $medicaments): void
    {
        $allergies = \App\Models\Allergy::where('patient_id', $patient->id)->get();

        foreach ($allergies as $allergy) {
            $substance = strtolower(trim($this->encryption->decrypt($allergy->substance_encrypted) ?? ''));
            if ($substance === '') {
                continue;
            }

            foreach ($medicaments as $med) {
                $medName = strtolower($med['nom'] ?? '');
                if ($medName !== '' && str_contains($medName, $substance)) {
                    throw new \RuntimeException(
                        "ALERTE ALLERGIE: Le patient est allergique à {$substance}. " .
                        "Médicament concerné: {$med['nom']}"
                    );
                }
            }
        }
    }
}