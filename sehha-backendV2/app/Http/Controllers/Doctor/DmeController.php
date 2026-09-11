<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAllergyRequest;
use App\Http\Requests\StoreConsultationRequest;
use App\Http\Requests\StoreVitalSignRequest;
use App\Models\Allergy;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\Consultation;
use App\Models\MedicalHistory;
use App\Models\VitalSign;
use App\Repositories\PatientRepository;
use App\Services\EncryptionService;
use App\Services\LlmService;
use App\Services\SpeechToTextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DmeController extends Controller
{
    public function __construct(
        private PatientRepository $patients,
        private EncryptionService $encryption,
        private SpeechToTextService $stt,
        private LlmService $llm,
    ) {}

    public function show(string $uuid): JsonResponse
    {
        $patient = $this->patients->findByUuid($uuid);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Patient non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        $record = $this->patients->getOrCreateRecord($patient->id);

        return response()->json([
            'success' => true,
            'data' => [
                'patient' => [
                    'uuid' => $patient->uuid,
                    'name' => $patient->name,
                    'age' => $this->calculateAge($patient),
                ],
                'record' => [
                    'blood_group' => $record->blood_group,
                    'height_cm' => $record->height_cm,
                    'coverage_type' => $record->coverage_type,
                    'referring_doctor' => $record->referringDoctor?->name,
                ],
                'allergies' => $this->patients->getAllergies($patient->id),
                'medical_history' => $this->patients->getMedicalHistory($patient->id),
                'vitals_latest' => $this->patients->getVitalSigns($patient->id, 5),
                // Onglet 5 du DME (Urgences & Triage) -- nécessaire pour que le
                // médecin détecte un patient récurrent en P1/P2.
                'triages' => $patient->triageEvents()
                    ->orderBy('triage_date', 'desc')
                    ->limit(10)
                    ->get()
                    ->map(fn ($t) => [
                        'uuid' => $t->uuid,
                        'triage_date' => $t->triage_date?->toIso8601String(),
                        'ia_score' => $t->ia_score,
                        'ccmu_score' => $t->ccmu_score,
                        'orientation' => $t->orientation,
                        'red_flags' => $t->red_flags,
                        'human_validated' => $t->human_validated,
                        'final_outcome' => $t->final_outcome,
                    ]),
                'stats' => [
                    'total_consultations' => $patient->consultationsAsPatient()->count(),
                    'last_visit' => $patient->consultationsAsPatient()->latest()->first()?->consultation_date?->toIso8601String(),
                ],
            ],
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function consultations(string $uuid): JsonResponse
    {
        $patient = $this->patients->findByUuid($uuid);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Patient non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        $consultations = $patient->consultationsAsPatient()
            ->with(['doctor', 'service'])
            ->orderBy('consultation_date', 'desc')
            ->limit(10)
            ->get()
            ->map(fn ($c) => [
                'uuid' => $c->uuid,
                'doctor' => $c->doctor->name,
                'service' => $c->service?->name,
                'motif' => $c->motif,
                'symptoms_notes' => $c->symptoms_notes,
                'diagnosis' => $c->diagnosis,
                'icd10_code' => $c->icd10_code,
                'treatment' => $c->treatment,
                'report_text' => $c->report_text,
                'follow_up_required' => $c->follow_up_required,
                'follow_up_date' => $c->follow_up_date?->format('Y-m-d'),
                'consultation_date' => $c->consultation_date?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $consultations,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    /**
     * Dictée vocale du médecin -> transcription -> résumé structuré (LLM)
     * stocké dans report_text de la consultation. Le médecin dicte ses
     * observations pendant ou après l'examen, ce endpoint renvoie le résumé
     * pour relecture avant que storeConsultation() ne soit appelé (ou pour
     * mettre à jour une consultation existante).
     */
    public function dictateConsultationReport(Request $request, string $uuid): JsonResponse
    {
        $request->validate([
            'audio' => ['required', 'string'],
            'language' => ['nullable', 'string', 'in:fr,ar,en'],
            'consultation_uuid' => ['nullable', 'uuid'],
        ]);

        $patient = $this->patients->findByUuid($uuid);
        if (!$patient) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Patient non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        // Le frontend envoie soit :
        //   (a) un base64 audio brut (enregistrement micro) -> serveur Whisper
        //   (b) un transcript texte (Web Speech API) -> utilisé directement
        // Distinction : base64 audio > 200 chars, que des chars base64.
        $audioInput = $request->audio;
        $cleaned    = preg_replace('/^data:[^;]+;base64,/', '', $audioInput);
        $isBase64Audio = strlen($cleaned) > 200
            && preg_match('/^[A-Za-z0-9+\/=\s]+$/', $cleaned);

        if ($isBase64Audio) {
            $sttResult  = $this->stt->transcribe($audioInput, $request->language ?? 'fr');
            $transcript = $sttResult['text'] ?? $sttResult['transcript'] ?? '';
        } else {
            // Texte deja transcrit par la Web Speech API du navigateur
            $transcript = trim($audioInput);
        }

        $reportText = $transcript;
        if (trim($transcript) !== '') {
            $prompt = <<<PROMPT
Tu es un assistant médical. Transforme cette dictée brute d'un médecin en un
compte-rendu de consultation clair et structuré en français, en gardant un
ton clinique professionnel. Ne raccourcis pas les informations cliniques
importantes (symptômes, diagnostic, traitement, recommandations).

Dictée brute :
"""
{$transcript}
"""

Réponds uniquement avec le texte du compte-rendu, sans préambule.
PROMPT;
            $generated = $this->llm->completeText($prompt);
            if (trim($generated) !== '') {
                $reportText = $generated;
            }
        }

        // Si une consultation existe déjà (le médecin dicte après l'avoir
        // créée), on enregistre directement le report_text dessus.
        if ($request->consultation_uuid) {
            $consultation = Consultation::where('uuid', $request->consultation_uuid)
                ->where('patient_id', $patient->id)
                ->first();
            if ($consultation) {
                $old = ['report_text' => $consultation->report_text];
                $consultation->update(['report_text' => $reportText]);
                $this->logAudit($request, 'update', 'consultations', $consultation->id, $old, ['report_text' => $reportText]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'transcript' => $transcript,
                'report_text' => $reportText,
            ],
            'message' => 'Compte-rendu généré depuis la dictée.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function storeConsultation(StoreConsultationRequest $request, string $uuid): JsonResponse
    {
        $patient = $this->patients->findByUuid($uuid);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Patient non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        $data = $request->validated();

        // Vérification allergies avant prescription
        $allergyAlert = null;
        if (!empty($data['treatment'])) {
            $allergyAlert = $this->checkAllergyConflict($patient->id, $data['treatment']);
        }

        $consultation = Consultation::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'patient_id' => $patient->id,
            'doctor_id' => $request->user()->id,
            'service_id' => $request->user()->doctorProfile?->service_id,
            'motif' => $data['motif'],
            'symptoms_notes' => $data['symptoms_notes'] ?? null,
            'diagnosis' => $data['diagnosis'],
            'icd10_code' => $data['icd10_code'] ?? null,
            'treatment' => $data['treatment'] ?? null,
            'exams_requested' => $data['exams_requested'] ?? null,
            'vitals_at_visit' => $data['vitals_at_visit'] ?? null,
            'report_text' => $data['report_text'] ?? null,
            'follow_up_required' => $data['follow_up_required'] ?? false,
            'follow_up_date' => $data['follow_up_date'] ?? null,
            'consultation_date' => $data['consultation_date'] ?? now(),
        ]);

        $this->logAudit($request, 'create', 'consultations', $consultation->id, null, $consultation->only([
            'motif', 'diagnosis', 'icd10_code', 'treatment',
        ]));

        return response()->json([
            'success' => true,
            'data' => [
                'consultation_uuid' => $consultation->uuid,
                'allergy_alert' => $allergyAlert,
            ],
            'message' => $allergyAlert 
                ? 'Consultation créée avec ALERTE ALLERGIE.' 
                : 'Consultation créée avec succès.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ], 201);
    }

    public function vitals(string $uuid): JsonResponse
    {
        $patient = $this->patients->findByUuid($uuid);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Patient non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->patients->getVitalSigns($patient->id, 50),
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function storeVital(StoreVitalSignRequest $request, string $uuid): JsonResponse
    {
        $patient = $this->patients->findByUuid($uuid);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Patient non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        $data = $request->validated();

        // Détection anomalie
        $isAbnormal = $this->detectAbnormalVital($data['type'], $data['value'], $data['value_2'] ?? null);

        $vital = VitalSign::create([
            'patient_id' => $patient->id,
            'type' => $data['type'],
            'value' => $data['value'],
            'value_2' => $data['value_2'] ?? null,
            'unit' => $data['unit'],
            'measured_at' => $data['measured_at'] ?? now(),
            'source' => $data['source'] ?? 'medical_device',
            'is_abnormal' => $isAbnormal,
            'alert_sent' => $isAbnormal,
            'note' => $data['note'] ?? null,
        ]);

        // Alerte si anomalie
        if ($isAbnormal) {
            // TODO: Envoyer notification au médecin traitant
            \Illuminate\Support\Facades\Log::channel('email')->warning("[VITAL ALERT]", [
                'patient_uuid' => $patient->uuid,
                'type' => $data['type'],
                'value' => $data['value'],
            ]);
        }

        $this->logAudit($request, 'create', 'vital_signs', $vital->id, null, [
            'type' => $data['type'], 'value' => $data['value'], 'is_abnormal' => $isAbnormal,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'vital_id' => $vital->id,
                'is_abnormal' => $isAbnormal,
                'alert_sent' => $isAbnormal,
            ],
            'message' => $isAbnormal ? 'Constante enregistrée avec ALERTE.' : 'Constante enregistrée.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ], 201);
    }

    public function allergies(string $uuid): JsonResponse
    {
        $patient = $this->patients->findByUuid($uuid);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Patient non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->patients->getAllergies($patient->id),
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function storeAllergy(StoreAllergyRequest $request, string $uuid): JsonResponse
    {
        $patient = $this->patients->findByUuid($uuid);

        if (!$patient) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'NOT_FOUND', 'message' => 'Patient non trouvé.'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ], 404);
        }

        $data = $request->validated();

        $allergy = Allergy::create([
            'patient_id' => $patient->id,
            'substance_encrypted' => $this->encryption->encrypt($data['substance']),
            'severity' => $data['severity'],
            'reaction_description' => $data['reaction_description'] ?? null,
            'discovered_at' => $data['discovered_at'] ?? null,
            'documented_by' => $request->user()->id,
        ]);

        $this->logAudit($request, 'create', 'allergies', $allergy->id, null, [
            'severity' => $data['severity'],
            // substance volontairement absente du log en clair (donnée chiffrée
            // sensible) -- seule la sévérité et l'existence de l'action sont tracées.
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'allergy_id' => $allergy->id,
                'substance' => $data['substance'],
                'severity' => $data['severity'],
            ],
            'message' => 'Allergie enregistrée.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ], 201);
    }

    // --- Méthodes privées ---

    /**
     * Écrit une ligne d'audit pour toute opération d'écriture sur le DME.
     * Exigé par la spec (toute écriture DME -> audit_logs) ; le middleware
     * audit.log générique logue déjà le payload brut de la requête, mais ici
     * on trace en plus la sémantique métier (old/new values ciblées).
     */
    private function logAudit(Request $request, string $action, string $resourceType, int $resourceId, ?array $old, ?array $new): void
    {
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'old_values' => $old,
            'new_values' => $new,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'timestamp' => now(),
        ]);
    }

    private function calculateAge(User $patient): ?int
    {
        // Le CIN contient l'année de naissance (2 derniers chiffres)
        // Format: AB123456 -> né en 19xx ou 20xx
        // Simplification: on ne calcule pas l'âge exact sans date de naissance
        return null;
    }

    private function checkAllergyConflict(int $patientId, string $treatment): ?array
    {
        $allergies = Allergy::where('patient_id', $patientId)->get();
        $alert = null;

        foreach ($allergies as $allergy) {
            $substance = strtolower(trim($this->encryption->decrypt($allergy->substance_encrypted) ?? ''));
            if ($substance === '') {
                continue;
            }
            if (str_contains(strtolower($treatment), $substance)) {
                $alert = [
                    'severity' => $allergy->severity,
                    'substance' => $substance,
                    'message' => "ALERTE: Le patient est allergique à {$substance} (gravité: {$allergy->severity})",
                ];
                break;
            }
        }

        return $alert;
    }

    private function detectAbnormalVital(string $type, float $value, ?float $value2): bool
    {
        return match ($type) {
            'tension_sys' => $value > 140 || $value < 90,
            'tension_dia' => $value > 90 || $value < 60,
            'heart_rate' => $value > 100 || $value < 60,
            'spo2' => $value < 90,
            'temperature' => $value > 38.5 || $value < 36,
            'glycemia' => $value > 1.26 || $value < 0.70,
            'respiratory_rate' => $value > 20 || $value < 12,
            default => false,
        };
    }
}