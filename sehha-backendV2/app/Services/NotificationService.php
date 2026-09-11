<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function __construct(
        private EmailService $email,
        private TriageIaService $triageIa
    ) {}

    public function sendTriageNotification(array $triageData, \App\Models\User $patient): void
    {
        $score = $triageData['ia_score'] ?? 'P2';
        $orientation = $triageData['orientation'] ?? 'specialiste';

        // Log systématique
        Log::channel('email')->info("[TRIAGE NOTIFICATION]", [
            'patient_uuid' => $patient->uuid,
            'score' => $score,
            'orientation' => $orientation,
            'message' => $triageData['message_patient'] ?? '',
        ]);

        // Email au patient
        $subject = match ($score) {
            'P1' => '🚨 SEHHA - ALERTE URGENCE - Rendez-vous immédiat aux urgences',
            'P2' => '⚠️ SEHHA - Consultation prioritaire sous 2h',
            'P3' => 'SEHHA - Consultation spécialiste recommandée',
            default => 'SEHHA - Téléconsultation proposée',
        };

        $html = $this->buildTriageEmailHtml($triageData, $patient);

        if ($patient->email) {
            $this->email->send($patient->email, $subject, $html);
        }

        // WebSocket broadcast si P1/P2
        if (in_array($score, ['P1', 'P2'])) {
            $this->broadcastToSoignants($triageData, $patient);
        }
    }

    public function sendAppointmentConfirmation(\App\Models\Appointment $appointment): void
    {
        $patient = $appointment->patient;
        $doctor = $appointment->doctor;

        Log::channel('email')->info("[RDV CONFIRMATION]", [
            'appointment_uuid' => $appointment->uuid,
            'patient' => $patient->name,
            'doctor' => $doctor->name,
            'date' => $appointment->starts_at->format('d/m/Y H:i'),
        ]);

        if ($patient->email) {
            $this->email->sendAppointmentReminder($patient->email, [
                'date' => $appointment->starts_at->format('d/m/Y à H:i'),
                'doctor' => $doctor->name,
                'motif' => $appointment->motif ?? 'Consultation',
            ]);
        }
    }

    public function sendPrescriptionNotification(\App\Models\MedicalDocument $document): void
    {
        $patient = $document->patient;

        Log::channel('email')->info("[ORDONNANCE]", [
            'document_uuid' => $document->uuid,
            'patient' => $patient->name,
        ]);

        if ($patient->email) {
            $link = url("/api/v1/documents/{$document->uuid}");
            $this->email->sendPrescriptionLink($patient->email, $link);
        }
    }

    private function buildTriageEmailHtml(array $data, \App\Models\User $patient): string
    {
        $score = $data['ia_score'];
        $color = match ($score) {
            'P1' => '#dc2626',
            'P2' => '#ea580c',
            'P3' => '#ca8a04',
            default => '#16a34a',
        };

        return "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
            <h2 style='color: {$color};'>Résultat du Triage SEHHA</h2>
            <p>Bonjour <strong>{$patient->name}</strong>,</p>
            <p>{$data['message_patient']}</p>
            <div style='background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;'>
                <p><strong>Score :</strong> <span style='color: {$color}; font-size: 20px;'>{$score}</span></p>
                <p><strong>Orientation :</strong> {$data['orientation']}</p>
                <p><strong>Délai recommandé :</strong> {$data['recommended_delay']}</p>
            </div>
            <p style='color: #6b7280; font-size: 12px;'>Ce message est généré automatiquement par SEHHA. En cas d'urgence vitale, appelez le 15.</p>
        </div>
        ";
    }

    private function broadcastToSoignants(array $triageData, \App\Models\User $patient): void
    {
        try {
            event(new \App\Events\TriageAlert($triageData, $patient));
            Log::channel('email')->info("[WEBSOCKET] Alert P1/P2 broadcasted", [
                'patient_uuid' => $patient->uuid,
                'score' => $triageData['ia_score'],
            ]);
        } catch (\Exception $e) {
            Log::error("[WEBSOCKET] Broadcast failed: " . $e->getMessage());
        }
    }
}