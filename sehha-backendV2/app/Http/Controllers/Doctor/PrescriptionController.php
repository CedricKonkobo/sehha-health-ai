<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Models\MedicalDocument;
use App\Models\User;
use App\Services\PrescriptionDictationService;
use App\Services\PrescriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PrescriptionController extends Controller
{
    public function __construct(
        private PrescriptionService $prescriptions,
        private PrescriptionDictationService $dictation,
    ) {}

    /**
     * Dictée vocale -> liste de médicaments structurée, pour pré-remplir le
     * formulaire d'ordonnance côté front. Ne crée rien en base ; le médecin
     * valide/édite ensuite avant d'appeler store().
     */
    public function dictate(Request $request): JsonResponse
    {
        $request->validate([
            'audio' => ['required', 'string'],
            'language' => ['nullable', 'string', 'in:fr,ar,en'],
        ]);

        $result = $this->dictation->parseAudioToMedications(
            $request->audio,
            $request->language ?? 'fr'
        );

        return response()->json([
            'success' => true,
            'data' => $result,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    /** Historique des ordonnances d'un patient, pour l'onglet Documents du DME. */
    public function history(Request $request, string $patientUuid): JsonResponse
    {
        $patient = User::where('uuid', $patientUuid)->where('role', 'patient')->firstOrFail();

        $user = $request->user();
        if ($user->role === 'patient' && $user->id !== $patient->id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'Accès non autorisé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 403);
        }

        $prescriptions = MedicalDocument::where('patient_id', $patient->id)
            ->where('type', 'ordonnance')
            ->orderBy('issued_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $prescriptions->map(fn ($d) => [
                'uuid' => $d->uuid,
                'title' => $d->title,
                'issued_at' => $d->issued_at?->format('Y-m-d'),
                'expires_at' => $d->expires_at?->format('Y-m-d'),
                'status' => $d->status,
                'medicaments' => $d->structured_data['medicaments'] ?? [],
                'qr_hash' => $d->qr_hash,
                'pdf_url' => url("/api/v1/prescriptions/{$d->uuid}/pdf"),
            ]),
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'patient_uuid' => ['required', 'uuid', 'exists:users,uuid'],
            'medicaments' => ['required', 'array', 'min:1'],
            'medicaments.*.nom' => ['required', 'string', 'max:200'],
            'medicaments.*.posologie' => ['required', 'string', 'max:500'],
            'medicaments.*.duree' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $doctor = $request->user();
        $patient = User::where('uuid', $request->patient_uuid)->firstOrFail();

        try {
            $document = $this->prescriptions->createPrescription($doctor, $patient, [
                'medicaments' => $request->medicaments,
                'notes' => $request->notes,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'document_uuid' => $document->uuid,
                    'qr_hash' => $document->qr_hash,
                    'pdf_url' => url("/api/v1/prescriptions/{$document->uuid}/pdf"),
                    'expires_at' => $document->expires_at?->toIso8601String(),
                ],
                'message' => 'Ordonnance générée et envoyée au patient.',
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 201);

        } catch (\RuntimeException $e) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'ALLERGY_ALERT',
                    'message' => $e->getMessage(),
                ],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 422);
        }
    }

    public function pdf(Request $request, string $uuid): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        $document = MedicalDocument::where('uuid', $uuid)
            ->where('type', 'ordonnance')
            ->firstOrFail();

        // Vérification accès
        $user = $request->user();
        if ($user->role === 'patient' && $user->id !== $document->patient_id) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'FORBIDDEN', 'message' => 'Accès non autorisé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 403);
        }

        $path = $document->storage_path;

        if (!Storage::exists($path)) {
            // Regénérer si manquant
            $path = app(\App\Services\PdfService::class)->generatePrescriptionPdf($document);
            $document->update(['storage_path' => $path]);
        }

        return response()->file(Storage::path($path), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="ordonnance-' . $document->uuid . '.pdf"',
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        // Accepte soit {uuid, hash}, soit {qr_data} = l'URL complète encodée
        // dans le QR code (ex: https://.../prescriptions/verify?uuid=..&hash=..).
        $uuid = $request->input('uuid');
        $hash = $request->input('hash');

        if (! $uuid && $request->filled('qr_data')) {
            $query = [];
            parse_str((string) parse_url((string) $request->input('qr_data'), PHP_URL_QUERY), $query);
            $uuid = $query['uuid'] ?? null;
            $hash = $query['hash'] ?? null;
        }

        $request->merge(['uuid' => $uuid, 'hash' => $hash]);
        $request->validate([
            'uuid' => ['required', 'uuid'],
            'hash' => ['required', 'string', 'size:64'],
        ]);

        $result = $this->prescriptions->verifyQr($uuid, $hash);

        return response()->json([
            'success' => true,
            'data' => $result,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    /**
     * GET /prescriptions/verify?uuid=..&hash=.. — page HTML minimaliste
     * (le QR code de l'ordonnance PDF pointe sur cette URL).
     */
    public function verifyPage(Request $request): \Illuminate\Http\Response
    {
        $uuid = (string) $request->query('uuid', '');
        $hash = (string) $request->query('hash', '');

        $valid = false;
        if (preg_match('/^[0-9a-fA-F-]{36}$/', $uuid) && strlen($hash) === 64) {
            $valid = $this->prescriptions->verifyQr($uuid, $hash)['valid'] ?? false;
        }

        $color = $valid ? '#16a34a' : '#dc2626';
        $icon = $valid ? '&#10004;' : '&#10008;';
        $label = $valid ? 'Ordonnance authentique' : 'Ordonnance invalide ou falsifiée';

        $html = <<<HTML
<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vérification ordonnance — SEHHA</title></head>
<body style="font-family:system-ui,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f8fafc">
<div style="text-align:center;padding:2rem;background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);max-width:340px">
<div style="font-size:56px;color:{$color};line-height:1">{$icon}</div>
<h1 style="color:{$color};font-size:1.25rem;margin:.75rem 0 .25rem">{$label}</h1>
<p style="color:#64748b;font-size:.85rem;margin:0">SEHHA — Clinique Ibn Tofail</p>
</div></body></html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }
}