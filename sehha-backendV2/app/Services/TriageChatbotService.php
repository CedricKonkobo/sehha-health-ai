<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TriageChatbotService
{
    private string $baseUrl;
    private string $token;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.triage_ia.url'), '/');
        $this->token = config('services.triage_ia.token');
    }

    /**
     * Démarrer une conversation de triage
     * 
     * @param int $patientId ID Laravel du patient
     * @param string $patientUuid UUID public du patient
     * @param array|null $patientHistory Historique médical du patient
     * @return array Réponse normalisée pour le controller
     */
    public function startConversation(int $patientId, string $patientUuid, ?array $patientHistory = null): array
    {
        try {
            $payload = [
                'patient_id' => $patientUuid,
            ];

            // Envoyer l'historique patient si disponible
            if ($patientHistory) {
                $payload['patient_context'] = $patientHistory;
            }

            $response = Http::withToken($this->token)
                ->timeout(30)
                ->post("{$this->baseUrl}/conversation/start", $payload);

            if ($response->successful()) {
                $data = $response->json();
                
                // Mapper la réponse Python au format attendu par le controller
                return [
                    'session_id' => $data['session_id'] ?? null,
                    'patient_id' => $data['patient_id'] ?? null,
                    'first_question' => $data['first_question'] ?? $data['question'] ?? 'Pouvez-vous décrire le motif de votre venue ?',
                    'status' => $data['status'] ?? 'in_progress',
                    'progress' => $data['progress'] ?? [
                        'current_turn' => 1,
                        'min_turns' => 8,
                        'max_turns' => 14
                    ],
                    'fallback' => $data['fallback'] ?? false,
                ];
            }

            Log::error('Triage IA start failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return $this->fallbackStart($patientUuid);

        } catch (\Exception $e) {
            Log::error('Triage IA start exception', ['message' => $e->getMessage()]);
            return $this->fallbackStart($patientUuid);
        }
    }

    /**
     * Envoyer une réponse patient au chatbot
     * 
     * @param string $sessionId Session IA
     * @param string $message Réponse du patient
     * @return array Réponse normalisée
     */
    public function sendMessage(string $sessionId, string $message): array
    {
        try {
            $response = Http::withToken($this->token)
                ->timeout(30)
                ->post("{$this->baseUrl}/conversation/{$sessionId}/message", [
                    'message' => $message,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                
                // Mapper la réponse Python au format attendu par le controller
                $mapped = [
                    'session_id' => $data['session_id'] ?? $sessionId,
                    'is_complete' => $data['is_complete'] ?? false,
                    'status' => $data['status'] ?? 'in_progress',
                    'fallback' => $data['fallback'] ?? false,
                    'progress' => $data['progress'] ?? [
                        'current_turn' => 1,
                        'min_turns' => 8,
                        'max_turns' => 14
                    ],
                ];

                // Question suivante
                if (isset($data['next_question']) && is_array($data['next_question'])) {
                    $mapped['next_question'] = $data['next_question'];
                } elseif (isset($data['question']) && $data['question']) {
                    $mapped['next_question'] = [
                        'id' => ($data['progress']['current_turn'] ?? 1) + 1,
                        'text' => $data['question']
                    ];
                } else {
                    $mapped['next_question'] = null;
                }

                // Données cliniques collectées
                if (isset($data['clinical_data_so_far'])) {
                    $mapped['clinical_summary'] = $data['clinical_data_so_far'];
                }

                // Si conversation terminée
                if ($data['is_complete'] ?? false) {
                    $mapped['clinical_summary'] = $data['clinical_summary'] ?? [];
                    $mapped['triage_result'] = $this->mapTriageResult(
                        $data['triage_result'] ?? []
                    );
                }

                return $mapped;
            }

            Log::error('Triage IA message failed', [
                'session_id' => $sessionId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return $this->fallbackMessage($sessionId, $message);

        } catch (\Exception $e) {
            Log::error('Triage IA message exception', [
                'session_id' => $sessionId,
                'message' => $e->getMessage()
            ]);
            return $this->fallbackMessage($sessionId, $message);
        }
    }

    /**
     * Récupérer l'état d'une conversation
     * 
     * @param string $sessionId Session IA
     * @return array État de la conversation
     */
    public function getState(string $sessionId): array
    {
        try {
            $response = Http::withToken($this->token)
                ->timeout(10)
                ->get("{$this->baseUrl}/conversation/{$sessionId}/state");

            if ($response->successful()) {
                return $response->json();
            }

            return ['error' => 'State unavailable', 'status' => $response->status()];

        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Récupérer la notification de traçabilité
     * 
     * @param string $patientId UUID du patient
     * @return array Notification
     */
    public function getNotification(string $patientId): array
    {
        try {
            $response = Http::withToken($this->token)
                ->timeout(10)
                ->get("{$this->baseUrl}/notifications/{$patientId}");

            if ($response->successful()) {
                $data = $response->json();
                // Le Python retourne {data: notification} ou directement la notification
                return $data['data'] ?? $data;
            }

            return ['error' => 'Notification unavailable'];

        } catch (\Exception $e) {
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Mapper le résultat de triage Python au format Laravel
     *
     * Le moteur IA renvoie des libellés (orientation, delay, ia_score) plus fins
     * que les enums de la table `triage_events`. On les ramène vers les valeurs
     * autorisées pour éviter une violation de contrainte CHECK à l'insertion.
     */
    private function mapTriageResult(array $pythonResult): array
    {
        // Python ORIENTATION_MAP -> enum triage_events.orientation
        $orientationMap = [
            'urgence_vitale' => 'urgences',
            'urgence_a_surveiller' => 'urgences',
            'consultation_specialiste' => 'specialiste',
            'consultation_generaliste' => 'medecin_gen',
            'teleconsultation' => 'teleconsult',
        ];
        // Python SCORE_MAPPING.recommended_delay -> enum triage_events.recommended_delay
        $delayMap = [
            'immediat' => 'immediat',
            'sous_1h' => 'sous_1h',
            'sous_4h' => 'sous_24h',
            'sous_24h' => 'sous_24h',
            'sous_48h' => 'sous_48h',
            'sous_72h' => 'sous_48h',
        ];
        // Python peut renvoyer P5 (score 1) ; l'enum s'arrête à P4.
        $iaScoreMap = ['P1' => 'P1', 'P2' => 'P2', 'P3' => 'P3', 'P4' => 'P4', 'P5' => 'P4'];

        $rawOrientation = $pythonResult['orientation'] ?? 'consultation_specialiste';
        $rawDelay = $pythonResult['recommended_delay'] ?? 'sous_24h';
        $rawIaScore = $pythonResult['ia_score'] ?? 'P2';

        return [
            'score' => $pythonResult['score'] ?? 3,
            'ia_score' => $iaScoreMap[$rawIaScore] ?? 'P2',
            'orientation' => $orientationMap[$rawOrientation] ?? 'specialiste',
            'recommended_delay' => $delayMap[$rawDelay] ?? 'sous_24h',
            'confidence' => $pythonResult['confidence'] ?? 0.50,
            'justification' => $pythonResult['justification'] ?? '',
            'action' => $pythonResult['action'] ?? '',
            'needs_human_review' => $pythonResult['needs_human_review'] ?? false,
            'red_flags' => $pythonResult['red_flags'] ?? [],
            'message_patient' => $pythonResult['message_patient'] ?? 'Consultation recommandée.',
        ];
    }

    // ========== FALLBACKS ==========

    private function fallbackStart(string $patientUuid): array
    {
        return [
            'session_id' => 'fallback-' . uniqid(),
            'patient_id' => $patientUuid,
            'first_question' => 'Bonjour ! Je suis là pour vous aider. Pouvez-vous me dire ce qui vous amène aujourd\'hui ?',
            'status' => 'in_progress',
            'progress' => [
                'current_turn' => 1,
                'min_turns' => 8,
                'max_turns' => 14
            ],
            'fallback' => true,
        ];
    }

    private function fallbackMessage(string $sessionId, string $message): array
    {
        $messageLower = strtolower($message);

        // Red flags -> P1 immédiat.
        $critical = [
            'perte de connaissance', 'perte connaissance', 'convulsion', 'sang', 'dyspnee',
            'dyspnée', 'essouffl', 'crise', 'malaise', 'étouffe', 'étouffement', 'suffoque',
            'suffocation', 'thoraciqu', 'poitrine', 'irradi', 'paralys', 'avc', 'infarctus',
            'inconscient', 'convulsi', 'hémorragie', 'hemorragie', 'noyade',
        ];
        // Motifs "à voir en priorité" -> P2.
        $concerning = ['douleur', 'fièvre', 'fievre', 'vomiss', 'respir', 'vertige', 'tête', 'tete',
            'abdomin', 'ventre', 'brûl', 'brul', 'chute', 'trauma', 'plaie', 'fracture'];

        $isCritical = collect($critical)->contains(fn ($kw) => str_contains($messageLower, $kw));
        $isConcerning = collect($concerning)->contains(fn ($kw) => str_contains($messageLower, $kw));

        // Compteur de tours pour cette session fallback (le moteur IA étant indisponible,
        // on conclut après 3 échanges pour ne pas boucler).
        $turnKey = "triage_fallback_turns_{$sessionId}";
        $turns = (int) cache()->increment($turnKey);
        if ($turns === 1) {
            cache()->put($turnKey, 1, now()->addHours(2));
        }

        if ($isCritical || $isConcerning || $turns >= 3) {
            $score = $isCritical ? 5 : ($isConcerning ? 4 : 3);
            $map = [
                5 => ['P1', 'urgences', 'immediat', 'Votre cas semble critique. Rendez-vous immédiatement aux urgences ou appelez le 15.'],
                4 => ['P2', 'specialiste', 'sous_1h', 'Votre situation nécessite une consultation prioritaire dans l\'heure.'],
                3 => ['P3', 'medecin_gen', 'sous_24h', 'Une consultation médicale est recommandée dans les 24 heures.'],
            ];
            [$iaScore, $orientation, $delay, $msg] = $map[$score];
            cache()->forget($turnKey);

            return [
                'is_complete' => true,
                'status' => 'completed',
                'clinical_summary' => [
                    'motif_principal' => $message,
                    'red_flags_detectes' => $isCritical ? ['critique_detecte_fallback'] : [],
                ],
                'triage_result' => [
                    'score' => $score,
                    'ia_score' => $iaScore,
                    'orientation' => $orientation,
                    'recommended_delay' => $delay,
                    'message_patient' => $msg,
                    'confidence' => 0.50,
                    'needs_human_review' => true,
                    'fallback' => true,
                ],
                'fallback' => true,
            ];
        }

        return [
            'is_complete' => false,
            'status' => 'in_progress',
            'next_question' => [
                'text' => 'Pouvez-vous préciser depuis combien de temps vous ressentez ces symptômes et à quel point ils vous gênent (léger / modéré / intense) ?',
                'id' => 990 + $turns,
            ],
            'clinical_summary' => ['motif_principal' => $message],
            'progress' => ['current_turn' => $turns + 1, 'min_turns' => 3, 'max_turns' => 3],
            'fallback' => true,
        ];
    }
}