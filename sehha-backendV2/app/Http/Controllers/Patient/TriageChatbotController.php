<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\TriageEvent;
use App\Models\User;
use App\Services\TriageChatbotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TriageChatbotController extends Controller
{
    public function __construct(private TriageChatbotService $chatbot) {}

    /**
     * POST /api/v1/triage/answer
     * 
     * Body: { session_uuid?, answer }
     */
    public function answer(Request $request): JsonResponse
    {
        $request->validate([
            'session_uuid' => ['nullable', 'string'],
            'answer' => ['required', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        $sessionUuid = $request->session_uuid;

        // ===== NOUVELLE CONVERSATION =====
        if (!$sessionUuid) {
            $patientHistory = $this->buildPatientHistory($user);

            $result = $this->chatbot->startConversation(
                $user->id, 
                $user->uuid, 
                $patientHistory
            );

            $sessionUuid = $result['session_id'] ?? (string) Str::uuid();

            // Stocker la session en cache Laravel
            cache()->put("triage_session_{$user->id}", [
                'ia_session_id' => $sessionUuid,
                'status' => 'in_progress',
                'created_at' => now(),
            ], now()->addHours(2));

            return response()->json([
                'success' => true,
                'data' => [
                    'session_uuid' => $sessionUuid,
                    'status' => $result['status'] ?? 'in_progress',
                    'next_question' => [
                        'id' => 1,
                        'text' => $result['first_question'],
                    ],
                    'progress' => $result['progress'] ?? [
                        'current_turn' => 1,
                        'min_turns' => 8,
                        'max_turns' => 14
                    ],
                    'fallback' => $result['fallback'] ?? false,
                ],
                'message' => $result['first_question'],
                'meta' => ['timestamp' => now()->toIso8601String()]
            ]);
        }

        // ===== CONVERSATION EXISTANTE =====
        $result = $this->chatbot->sendMessage($sessionUuid, $request->answer);

        // Si conversation terminée
        if ($result['is_complete'] ?? false) {
            $clinicalSummary = $result['clinical_summary'] ?? [];
            $triageResult = $result['triage_result'] ?? [];

            // Sauvegarder le triage en BDD Laravel
            $triage = $this->saveTriageResult($user, $clinicalSummary, $triageResult);

            // Temps réel : rafraîchir la file de triage des soignants + alerte P1/P2
            $this->broadcastTriage($triage, $user);

            // Récupérer la notification du moteur IA
            $notification = $this->chatbot->getNotification((string) $user->uuid);

            // Nettoyer cache
            cache()->forget("triage_session_{$user->id}");

            return response()->json([
                'success' => true,
                'data' => [
                    'session_uuid' => $sessionUuid,
                    'status' => 'completed',
                    'triage_uuid' => $triage->uuid,
                    'result' => [
                        'ia_score' => $triageResult['ia_score'] ?? 'P2',
                        'ccmu_score' => $triageResult['score'] ?? 3,
                        'orientation' => $triageResult['orientation'] ?? 'specialiste',
                        'recommended_delay' => $triageResult['recommended_delay'] ?? 'sous_24h',
                        'message_patient' => $triageResult['message_patient'] ?? 'Consultation recommandée.',
                        'confidence' => $triageResult['confidence'] ?? 0.50,
                        'needs_human_review' => $triageResult['needs_human_review'] ?? false,
                    ],
                    'clinical_summary' => $clinicalSummary,
                    'notification' => $notification['data'] ?? $notification ?? null,
                    'fallback' => $triageResult['fallback'] ?? false,
                ],
                'message' => 'Triage terminé. Score calculé.',
                'meta' => ['timestamp' => now()->toIso8601String()]
            ]);
        }

        // Conversation continue
        return response()->json([
            'success' => true,
            'data' => [
                'session_uuid' => $sessionUuid,
                'status' => $result['status'] ?? 'in_progress',
                'next_question' => $result['next_question'] ?? [
                    'id' => 999,
                    'text' => 'Pouvez-vous préciser ?'
                ],
                'progress' => $result['progress'] ?? [
                    'current_turn' => $this->estimateTurn($sessionUuid),
                    'min_turns' => 8,
                    'max_turns' => 14,
                ],
                'clinical_data_so_far' => $result['clinical_summary'] ?? [],
                'fallback' => $result['fallback'] ?? false,
            ],
            'message' => $result['next_question']['text'] ?? 'Pouvez-vous préciser ?',
            'meta' => ['timestamp' => now()->toIso8601String()]
        ]);
    }

    // ========== MÉTHODES PRIVÉES ==========

    private function broadcastTriage(TriageEvent $triage, User $patient): void
    {
        try {
            event(new \App\Events\TriageQueueUpdated($triage));

            if (in_array($triage->ia_score, ['P1', 'P2'], true)) {
                event(new \App\Events\TriageAlert([
                    'ia_score' => $triage->ia_score,
                    'ccmu_score' => $triage->ccmu_score,
                    'orientation' => $triage->orientation,
                    'recommended_delay' => $triage->recommended_delay,
                    'red_flags' => $triage->red_flags,
                ], $patient));
            }
        } catch (\Throwable $e) {
            Log::error('WebSocket triage event failed: '.$e->getMessage());
        }
    }

    private function buildPatientHistory(User $user): array
    {
        $history = [
            'patient_id' => $user->uuid,
            'age' => null,
        ];

        // Allergies
        $allergies = $user->allergies()->get()->map(function ($a) {
            $substance = app(\App\Services\EncryptionService::class)->decrypt($a->substance_encrypted);
            return [
                'substance' => $substance,
                'severity' => $a->severity,
            ];
        })->toArray();

        if (!empty($allergies)) {
            $history['known_allergies'] = $allergies;
        }

        // Antécédents médicaux
        $antecedents = $user->medicalHistories()->get()->map(function ($h) {
            $desc = app(\App\Services\EncryptionService::class)->decrypt($h->description_encrypted);
            return [
                'type' => $h->type,
                'description' => $desc,
                'started_at' => $h->started_at,
                'resolved_at' => $h->resolved_at,
            ];
        })->toArray();

        if (!empty($antecedents)) {
            $history['known_conditions'] = array_column($antecedents, 'description');
            $history['medical_history'] = $antecedents;
        }

        // Derniers triages
        $lastTriages = \App\Models\TriageEvent::where('patient_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(3)
            ->get()
            ->map(fn ($t) => [
                'date' => $t->created_at->format('Y-m-d'),
                'score' => $t->ia_score,
                'orientation' => $t->orientation,
                'symptoms' => $t->symptoms_json,
            ])
            ->toArray();

        if (!empty($lastTriages)) {
            $history['previous_triages'] = $lastTriages;
        }

        // Dernières constantes vitales
        $lastVitals = \App\Models\VitalSign::where('patient_id', $user->id)
            ->orderBy('measured_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($v) => [
                'type' => $v->type,
                'value' => $v->value,
                'value_2' => $v->value_2,
                'unit' => $v->unit,
                'measured_at' => $v->measured_at,
                'is_abnormal' => $v->is_abnormal,
            ])
            ->toArray();

        if (!empty($lastVitals)) {
            $history['recent_vitals'] = $lastVitals;
        }

        Log::info('Patient history sent to Triage IA', [
            'patient_id' => $user->id,
            'allergies_count' => count($allergies),
            'antecedents_count' => count($antecedents),
        ]);

        return $history;
    }

    private function saveTriageResult(User $user, array $clinicalSummary, array $triageResult): TriageEvent
    {
        return TriageEvent::create([
            'uuid' => (string) Str::uuid(),
            'patient_id' => $user->id,
            'triage_date' => now(),
            'ia_score' => $triageResult['ia_score'] ?? 'P2',
            'ccmu_score' => $triageResult['score'] ?? null,
            'ia_confidence' => $triageResult['confidence'] ?? 0.50,
            'symptoms_json' => $clinicalSummary,
            'red_flags' => $clinicalSummary['red_flags_detectes'] ?? [],
            'orientation' => $triageResult['orientation'] ?? 'specialiste',
            'recommended_delay' => $triageResult['recommended_delay'] ?? 'sous_24h',
            'human_validated' => false,
            'notification_sent' => false,
        ]);
    }

    private function estimateTurn(string $sessionId): int
    {
        // Récupérer le vrai nombre de tours depuis le moteur IA
        $state = $this->chatbot->getState($sessionId);
        
        if (isset($state['current_turn'])) {
            return (int) $state['current_turn'];
        }
        
        if (isset($state['history']) && is_array($state['history'])) {
            return count(array_filter($state['history'], fn($m) => ($m['role'] ?? '') === 'user'));
        }
        
        return 1;
    }
}