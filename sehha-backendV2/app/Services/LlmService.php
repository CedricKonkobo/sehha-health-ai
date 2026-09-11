<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Wrapper autour du endpoint LLM du serveur IA SEHHA.
 *
 * Route serveur : POST /v1/llm/chat
 * Body          : { "prompt", "system_prompt", "max_tokens", "temperature" }
 * Réponse       : { "success": true, "data": { "response": "...", "prompt_len": N } }
 */
class LlmService
{
    private string $url;
    private string $key;

    public function __construct()
    {
        $this->url = rtrim((string) config('services.llm.url'), '/');
        $this->key = (string) config('services.llm.key');
    }

    /**
     * Envoie un prompt et tente de récupérer un tableau associatif JSON.
     * Si le LLM ne renvoie pas un JSON valide, retourne
     * ['raw' => <texte>, 'parse_error' => true].
     */
    public function completeJson(string $prompt, int $maxTokens = 1024): array
    {
        $text = $this->completeText($prompt, $maxTokens, 0.1);

        if ($text === '') {
            return ['error' => 'LLM_EMPTY_RESPONSE'];
        }

        // Nettoyage des balises markdown que le LLM peut ajouter
        $text = preg_replace('/```json|```/', '', $text);
        $text = trim($text);

        $decoded = json_decode($text, true);

        if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
            Log::warning('LLM: réponse non-JSON', ['output' => $text]);
            return ['raw' => $text, 'parse_error' => true];
        }

        return $decoded;
    }

    /**
     * Envoie un prompt et retourne le texte libre produit par le LLM.
     */
    public function completeText(
        string $prompt,
        int $maxTokens = 1024,
        float $temperature = 0.3,
        string $systemPrompt = 'Tu es un assistant médical précis et concis.'
    ): string {
        $result = $this->call($prompt, $systemPrompt, $maxTokens, $temperature);
        return $result['data']['response'] ?? '';
    }

    private function call(
        string $prompt,
        string $systemPrompt,
        int $maxTokens,
        float $temperature
    ): array {
        if (empty($this->url)) {
            Log::warning('LLM: service non configuré (services.llm.url manquant)');
            return ['error' => 'LLM_NOT_CONFIGURED'];
        }

        try {
            $response = Http::timeout(60)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->key,
                    'Content-Type'  => 'application/json',
                ])
                ->post("{$this->url}/v1/llm/chat", [
                    'prompt'        => $prompt,
                    'system_prompt' => $systemPrompt,
                    'max_tokens'    => $maxTokens,
                    'temperature'   => $temperature,
                ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('LLM service error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return ['error' => 'LLM_FAILED', 'status' => $response->status()];

        } catch (\Exception $e) {
            Log::error('LLM exception', ['message' => $e->getMessage()]);
            return ['error' => 'LLM_EXCEPTION', 'message' => $e->getMessage()];
        }
    }
}