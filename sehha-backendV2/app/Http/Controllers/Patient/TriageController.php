<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTriageRequest;
use App\Models\TriageEvent;
use App\Models\User;
use App\Services\EncryptionService;
use App\Services\NotificationService;
use App\Services\TriageIaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TriageController extends Controller
{
    public function __construct(
        private TriageIaService $triageIa,
        private NotificationService $notification,
        private EncryptionService $encryption
    ) {}

    public function store(StoreTriageRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        // Appel moteur IA
        $iaResult = $this->triageIa->analyze($data['symptoms'], $data['patient_context']);

        // Création du triage en BDD
        $triage = TriageEvent::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'patient_id' => $user->id,
            'triage_date' => now(),
            'ia_score' => $iaResult['ia_score'],
            'ccmu_score' => $iaResult['ccmu_score'] ?? null,
            'ia_confidence' => $iaResult['ia_confidence'] ?? 0.50,
            'symptoms_json' => $data['symptoms'],
            'red_flags' => $iaResult['red_flags'] ?? [],
            'orientation' => $iaResult['orientation'],
            'recommended_delay' => $iaResult['recommended_delay'],
            'human_validated' => false,
            'notification_sent' => false,
        ]);

        // Notification patient + soignants si critique
        $this->notification->sendTriageNotification($iaResult, $user);

        $triage->update(['notification_sent' => true]);

        // Temps réel : rafraîchir la file de triage
        try {
            event(new \App\Events\TriageQueueUpdated($triage));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('WebSocket triage event failed: '.$e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => [
                'triage_uuid' => $triage->uuid,
                'ia_score' => $iaResult['ia_score'],
                'ccmu_score' => $iaResult['ccmu_score'] ?? null,
                'ia_confidence' => $iaResult['ia_confidence'],
                'orientation' => $iaResult['orientation'],
                'recommended_delay' => $iaResult['recommended_delay'],
                'red_flags' => $iaResult['red_flags'] ?? [],
                'message_patient' => $iaResult['message_patient'],
                'fallback' => $iaResult['fallback'] ?? false,
            ],
            'message' => $iaResult['message_patient'],
            'meta' => [
                'timestamp' => now()->toIso8601String(),
                'request_id' => (string) \Illuminate\Support\Str::uuid(),
            ]
        ], 201);
    }

    public function show(string $uuid): JsonResponse
    {
        $triage = TriageEvent::where('uuid', $uuid)->firstOrFail();

        Gate::authorize('view', $triage);

        return response()->json([
            'success' => true,
            'data' => $this->triageResponse($triage),
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function queue(Request $request): JsonResponse
    {
        $query = TriageEvent::with('patient')
            ->where('human_validated', false)
            ->whereIn('ia_score', ['P1', 'P2', 'P3'])
            ->orderByRaw("CASE ia_score WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 ELSE 5 END")
            ->orderBy('created_at', 'asc');

        // Filtre optionnel par date
        if ($request->has('date')) {
            $query->whereDate('triage_date', $request->date);
        }

        $queue = $query->get()->map(fn ($t) => $this->triageResponse($t));

        return response()->json([
            'success' => true,
            'data' => $queue,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function validate(Request $request, string $uuid): JsonResponse
    {
        $triage = TriageEvent::where('uuid', $uuid)->firstOrFail();

        Gate::authorize('validate', $triage);

        $request->validate([
            'ia_score' => ['required', 'in:P1,P2,P3,P4'],
            'orientation' => ['required', 'in:urgences,specialiste,medecin_gen,teleconsult'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $oldScore = $triage->ia_score;

        $triage->update([
            'ia_score' => $request->ia_score,
            'orientation' => $request->orientation,
            'human_validated' => true,
            'validated_by' => $request->user()->id,
            'final_outcome' => $request->comment,
        ]);

        // Re-notification si score changé vers P1
        if ($request->ia_score === 'P1' && $oldScore !== 'P1') {
            $this->notification->sendTriageNotification([
                'ia_score' => 'P1',
                'orientation' => $request->orientation,
                'recommended_delay' => 'immediat',
                'message_patient' => 'Votre cas a été reclassé comme critique. Rendez-vous aux urgences immédiatement.',
                'red_flags' => $triage->red_flags,
            ], $triage->patient);
        }

        // Temps réel : la file de triage se met à jour (item validé -> disparaît)
        try {
            event(new \App\Events\TriageQueueUpdated($triage->fresh()));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('WebSocket triage event failed: '.$e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => $this->triageResponse($triage),
            'message' => 'Triage validé avec succès.',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    public function history(Request $request, string $uuid): JsonResponse
    {
        $patient = User::where('uuid', $uuid)->firstOrFail();

        Gate::authorize('view', $patient->patientRecord ?? new \App\Models\PatientRecord());

        $triages = TriageEvent::where('patient_id', $patient->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($t) => $this->triageResponse($t));

        return response()->json([
            'success' => true,
            'data' => $triages,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }
    
    public function myHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        $triages = TriageEvent::where('patient_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($t) => $this->triageResponse($t));

        return response()->json([
            'success' => true,
            'data' => $triages,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }


    public function stats(Request $request): JsonResponse
    {
        $stats = [
            'total_today' => TriageEvent::whereDate('triage_date', today())->count(),
            'p1_count' => TriageEvent::whereDate('triage_date', today())->where('ia_score', 'P1')->count(),
            'p2_count' => TriageEvent::whereDate('triage_date', today())->where('ia_score', 'P2')->count(),
            'p3_count' => TriageEvent::whereDate('triage_date', today())->where('ia_score', 'P3')->count(),
            'p4_count' => TriageEvent::whereDate('triage_date', today())->where('ia_score', 'P4')->count(),
            'avg_wait_time' => TriageEvent::whereNotNull('wait_time_minutes')->avg('wait_time_minutes'),
            'validated_count' => TriageEvent::where('human_validated', true)->whereDate('triage_date', today())->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    private function triageResponse(TriageEvent $triage): array
    {
        // Le moteur conversationnel stocke le motif sous `motif_principal`,
        // le jeu de données de démo sous `symptoms.chief_complaint`. On harmonise
        // pour que la file d'attente affiche toujours un motif lisible.
        $symptoms = $triage->symptoms_json ?? [];
        if (empty($symptoms['chief_complaint'])) {
            $symptoms['chief_complaint'] = $symptoms['motif_principal']
                ?? $symptoms['chief_complaint']
                ?? null;
        }

        return [
            'uuid' => $triage->uuid,
            'patient_uuid' => $triage->patient->uuid,
            'patient_name' => $triage->patient->name,
            'ia_score' => $triage->ia_score,
            'ccmu_score' => $triage->ccmu_score,
            'ia_confidence' => $triage->ia_confidence,
            'orientation' => $triage->orientation,
            'recommended_delay' => $triage->recommended_delay,
            'symptoms' => $symptoms,
            'red_flags' => $triage->red_flags,
            'human_validated' => $triage->human_validated,
            'validated_by' => $triage->validator?->name,
            'triage_date' => $triage->triage_date?->toIso8601String(),
            'created_at' => $triage->created_at->toIso8601String(),
        ];
    }
}