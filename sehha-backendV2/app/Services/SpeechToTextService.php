<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Wrapper autour du endpoint STT du serveur IA SEHHA.
 *
 * Route serveur : POST /v1/stt/transcribe  (multipart/form-data)
 * Params        : audio (binaire), language (query string), task (query string)
 * Réponse       : {
 *   "success": true,
 *   "data": {
 *     "text": "...",
 *     "language": "fr",
 *     "language_probability": 0.99,
 *     "duration": 12.4,
 *     "words": null
 *   }
 * }
 */
class SpeechToTextService
{
    private string $url;
    private string $key;

    public function __construct()
    {
        $this->url = rtrim((string) config('services.speech_to_text.url'), '/');
        $this->key = (string) config('services.speech_to_text.key');
    }

    /**
     * Transcrit un audio envoyé en base64 ou en chemin de fichier.
     *
     * @param string $input    Base64 de l'audio OU chemin fichier temporaire
     * @param string $language Code langue (fr, ar, en)
     * @param bool   $isPath   true si $input est un chemin fichier
     * @param string $filename Nom du fichier (détermine l'extension / MIME)
     * @param string $task     "transcribe" (défaut) ou "translate" (→ anglais)
     *
     * @return array{text: string, language: string, duration: float, error?: string}
     */
    public function transcribe(
        string $input,
        string $language = 'fr',
        bool $isPath = false,
        string $filename = 'audio.wav',
        string $task = 'transcribe'
    ): array {
        try {
            if ($isPath) {
                $binaryContent = file_get_contents($input);
            } else {
                $base64 = preg_replace('/^data:[^;]+;base64,/', '', $input);
                $binaryContent = base64_decode($base64);
            }

            if ($binaryContent === false || $binaryContent === '') {
                Log::error('STT: contenu audio invalide');
                return $this->emptyResult('STT_INVALID_INPUT');
            }

            $response = Http::timeout(120) // Whisper peut être lent sur CPU
                ->withHeaders(['Authorization' => 'Bearer ' . $this->key])
                ->attach('audio', $binaryContent, $filename)
                ->post("{$this->url}/v1/stt/transcribe?language={$language}&task={$task}");

            if ($response->successful()) {
                $json = $response->json();
                $data = $json['data'] ?? [];

                return [
                    'text'                 => $data['text']                 ?? '',
                    'language'             => $data['language']             ?? $language,
                    'language_probability' => $data['language_probability'] ?? null,
                    'duration'             => $data['duration']             ?? null,
                    'words'                => $data['words']                ?? null,
                ];
            }

            Log::error('STT service error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return $this->emptyResult('STT_FAILED');

        } catch (\Exception $e) {
            Log::error('STT exception', ['message' => $e->getMessage()]);
            return $this->emptyResult('STT_EXCEPTION');
        }
    }

    private function emptyResult(string $error): array
    {
        return [
            'text'     => '',
            'language' => 'fr',
            'error'    => $error,
        ];
    }
}