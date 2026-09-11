<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
// supprimer
class TriageIaService
{
    private string $baseUrl;
    private string $token;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.triage_ia.url'), '/');
        $this->token = config('services.triage_ia.token');
    }

    public function analyze(array $symptoms, array $context): array
    {
        try {
            $response = Http::withToken($this->token)
                ->timeout(10)
                ->post("{$this->baseUrl}/v1/triage/analyze", [
                    'symptoms' => $symptoms,
                    'context' => $context,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('Triage IA HTTP error', ['status' => $response->status(), 'body' => $response->body()]);
            return $this->fallback($symptoms);
        } catch (\Exception $e) {
            Log::error('Triage IA exception', ['message' => $e->getMessage()]);
            return $this->fallback($symptoms);
        }
    }

    private function fallback(array $symptoms): array
    {
        $criticalKeywords = ['thoracique', 'convulsion', 'perte_conscience', 'dyspnee', 'sueurs', 'irradiation'];
        $chiefComplaint = strtolower($symptoms['chief_complaint'] ?? '');

        $isCritical = collect($criticalKeywords)->contains(fn ($kw) => str_contains($chiefComplaint, $kw));

        return [
            'ia_score' => $isCritical ? 'P1' : 'P2',
            'ccmu_score' => $isCritical ? 5 : 3,
            'ia_confidence' => 0.50,
            'fallback' => true,
            'orientation' => $isCritical ? 'urgences' : 'specialiste',
            'recommended_delay' => $isCritical ? 'immediat' : 'sous_24h',
            'red_flags' => [],
            'message_patient' => $isCritical
                ? 'Votre cas est critique. Rendez-vous aux urgences immédiatement.'
                : 'Votre cas nécessite une consultation prioritaire.',
        ];
    }
}