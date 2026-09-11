<?php

namespace App\Services;


use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class PdfService
{
    public function __construct(private EncryptionService $encryption) {}

    public function generatePrescriptionQrHash(
        string $prescriptionUuid,
        int $patientId,
        int|string $doctorId,
        string $issuedAt
    ): string {
        // La colonne issued_at est castée en "date" : on normalise en Y-m-d des
        // deux côtés (génération / vérification) pour éviter tout écart d'heure.
        $issuedDate = \Illuminate\Support\Carbon::parse($issuedAt)->toDateString();

        $payload = implode('|', [
            $prescriptionUuid,
            (string) $patientId,
            (string) $doctorId,
            $issuedDate,
            config('app.prescription_secret', 'sehha-default-secret'),
        ]);

        return hash_hmac('sha256', $payload, config('app.hmac_key', 'sehha-hmac-key'));
    }

    public function verifyPrescription(string $uuid, string $providedHash): bool
    {
        $doc = \App\Models\MedicalDocument::where('uuid', $uuid)
            ->where('type', 'ordonnance')
            ->where('status', 'valide')
            ->first();

        if (!$doc) {
            return false;
        }

        $expectedHash = $this->generatePrescriptionQrHash(
            $doc->uuid,
            $doc->patient_id,
            $doc->created_by,
            $doc->issued_at->toIso8601String()
        );

        return hash_equals($expectedHash, $providedHash);
    }

        public function generatePrescriptionPdf(\App\Models\MedicalDocument $document): string
    {
        $patient = $document->patient;
        $doctor = $document->creator;
        $data = $document->structured_data ?? [];

        // Récupérer ou générer le hash du QR
        $qrHash = $document->qr_hash ?? $this->generatePrescriptionQrHash(
            $document->uuid,
            $document->patient_id,
            $document->created_by,
            $document->issued_at->toIso8601String()
        );

        // Génération du QR code en SVG (sans GD)
        $qrUrl = route('prescription.verify', ['uuid' => $document->uuid, 'hash' => $qrHash]);
        $renderer = new ImageRenderer(
            new RendererStyle(120), // taille en pixels
            new SvgImageBackEnd()
        );
        $writer = new Writer($renderer);
        $svg = $writer->writeString($qrUrl);
        $qrCodeBase64 = 'data:image/svg+xml;base64,' . base64_encode($svg);

        // Passage des données à la vue
        $pdf = Pdf::loadView('pdfs.ordonnance', [
            'document' => $document,
            'patient' => $patient,
            'doctor' => $doctor,
            'medicaments' => $data['medicaments'] ?? [],
            'cin_patient' => $this->encryption->decrypt($patient->cin_encrypted),
            'signature' => $data['signature'] ?? null,
            'qr_hash' => $qrHash,
            'qrCodeBase64' => $qrCodeBase64,  // <-- nouvelle variable
        ]);

        $filename = "ordonnances/{$document->uuid}.pdf";
        Storage::put($filename, $pdf->output());

        return $filename;
    }
}