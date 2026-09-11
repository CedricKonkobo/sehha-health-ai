<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use App\Repositories\PatientRepository;
use App\Services\EncryptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function __construct(
        private PatientRepository $patients,
        private EncryptionService $encryption,
    ) {}

    public function myDme(): JsonResponse
    {
        $user = Auth::user();

        $record = $this->patients->getOrCreateRecord($user->id);

        return response()->json([
            'success' => true,
            'data' => [
                'patient' => [
                    'uuid' => $user->uuid,
                    'name' => $user->name,
                ],
                'record' => [
                    'blood_group' => $record->blood_group,
                    'height_cm' => $record->height_cm,
                    'coverage_type' => $record->coverage_type,
                    'referring_doctor' => $record->referringDoctor?->name,
                ],
                'allergies' => $this->patients->getAllergies($user->id),
                'medical_history' => $this->patients->getMedicalHistory($user->id),
                'vitals_latest' => $this->patients->getVitalSigns($user->id, 5),
                'triages' => $user->triageEvents()
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
            ],
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    /**
     * Permet au patient de modifier UNIQUEMENT ses coordonnées et son mot de
     * passe -- jamais les données médicales (groupe sanguin, allergies,
     * antécédents, constantes), qui restent en lecture seule pour lui
     * conformément à la spec DME ("Le DME est en lecture seule pour le
     * patient... en lecture/écriture pour les soignants autorisés").
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = Auth::user();

        $data = $request->validate([
            'phone' => ['nullable', 'string', 'regex:/^(\+212|0)[5-7][0-9]{8}$/'],
            'email' => ['nullable', 'email:rfc', 'max:191', 'unique:users,email,' . $user->id],
            'current_password' => ['required_with:new_password', 'string'],
            'new_password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $oldValues = [];
        $newValues = [];

        if (!empty($data['new_password'])) {
            if (!\Illuminate\Support\Facades\Hash::check($data['current_password'], $user->password)) {
                return response()->json([
                    'success' => false,
                    'error' => ['code' => 'VALIDATION_ERROR', 'message' => 'Mot de passe actuel incorrect.'],
                    'meta' => ['timestamp' => now()->toIso8601String()]
                ], 422);
            }
            $user->password = \Illuminate\Support\Facades\Hash::make($data['new_password']);
            $newValues['password'] = 'changed';
        }

        if (array_key_exists('phone', $data) && $data['phone']) {
            $oldValues['phone'] = 'redacted';
            $user->phone_encrypted = $this->encryption->encrypt($data['phone']);
            $newValues['phone'] = 'redacted';
        }

        if (array_key_exists('email', $data) && $data['email']) {
            $oldValues['email'] = $user->email;
            $user->email = $data['email'];
            $newValues['email'] = $data['email'];
        }

        $user->save();

        if (!empty($newValues)) {
            AuditLog::create([
                'user_id' => $user->id,
                'action' => 'update',
                'resource_type' => 'users',
                'resource_id' => $user->id,
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'uuid' => $user->uuid,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'message' => 'Profil mis à jour.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    /**
     * GET /patients/me/consultations — lecture seule
     */
    public function myConsultations(): JsonResponse
    {
        $user = Auth::user();

        $consultations = $user->consultationsAsPatient()
            ->with(['doctor', 'service'])
            ->orderBy('consultation_date', 'desc')
            ->limit(50)
            ->get()
            ->map(fn ($c) => [
                'uuid'               => $c->uuid,
                'doctor'             => $c->doctor?->name ?? '—',
                'service'            => $c->service?->name,
                'motif'              => $c->motif,
                'diagnosis'          => $c->diagnosis,
                'icd10_code'         => $c->icd10_code,
                'treatment'          => $c->treatment,
                'follow_up_required' => (bool) $c->follow_up_required,
                'follow_up_date'     => $c->follow_up_date?->format('Y-m-d'),
                'consultation_date'  => $c->consultation_date?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data'    => $consultations,
            'meta'    => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    /**
     * GET /patients/me/vitals — lecture seule
     */
    public function myVitals(): JsonResponse
    {
        $user = Auth::user();

        return response()->json([
            'success' => true,
            'data'    => $this->patients->getVitalSigns($user->id, 100),
            'meta'    => ['timestamp' => now()->toIso8601String()],
        ]);
    }

    /**
     * GET /patients/me/documents — documents médicaux visibles au patient
     * Inclut les ordonnances ET les documents scannés (source=ocr_scan)
     */
    public function myDocuments(): JsonResponse
    {
        $user = Auth::user();

        $documents = \App\Models\MedicalDocument::where('patient_id', $user->id)
            ->where('visible_to_patient', true)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($d) => [
                'uuid'            => $d->uuid,
                'type'            => $d->type,
                'title'           => $d->title,
                'issued_at'       => $d->issued_at?->format('Y-m-d'),
                'expires_at'      => $d->expires_at?->format('Y-m-d'),
                'status'          => $d->status,
                'source'          => $d->source,
                'extracted_text'  => $d->extracted_text,
                'ai_summary'      => $d->ai_summary,
                'structured_data' => $d->structured_data,
            ]);

        return response()->json([
            'success' => true,
            'data'    => $documents,
            'meta'    => ['timestamp' => now()->toIso8601String()],
        ]);
    }

}