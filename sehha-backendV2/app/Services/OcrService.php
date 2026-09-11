<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Wrapper autour du endpoint OCR du serveur IA SEHHA.
 *
 * Route serveur : POST /v1/ocr/scan  (multipart/form-data)
 * Params        : file (binaire), analyze (bool, défaut true)
 * Réponse       : {
 *   "success": true,
 *   "data": {
 *     "ocr": { "text": "...", "pages": N, "blocks": [...] },
 *     "medical_info": { ... } | null
 *   }
 * }
 */
class OcrService
{
    private string $url;
    private string $key;

    public function __construct()
    {
        $this->url = rtrim((string) config('services.ocr.url'), '/');
        $this->key = (string) config('services.ocr.key');
    }

    /**
     * Envoie une image (base64) ou un fichier binaire au serveur OCR.
     *
     * @param string      $input    Base64 de l'image (sans préfixe data:...) OU chemin fichier temporaire
     * @param bool        $isPath   true si $input est un chemin, false si c'est du base64
     * @param bool        $analyze  Active l'extraction LLM médicale côté serveur
     * @param string      $filename Nom du fichier pour le Content-Type MIME
     *
     * @return array{text: string, blocks: array, pages: int, medical_info: array|null}
     */
    public function scan(
        string $input,
        bool $isPath = false,
        bool $analyze = true,
        string $filename = 'document.jpg'
    ): array {
        try {
            if ($isPath) {
                $binaryContent = file_get_contents($input);
            } else {
                // Supprimer éventuel préfixe data:image/jpeg;base64,
                $base64 = preg_replace('/^data:[^;]+;base64,/', '', $input);
                $binaryContent = base64_decode($base64);
            }

            if ($binaryContent === false || $binaryContent === '') {
                Log::error('OCR: contenu binaire invalide');
                return $this->emptyResult('OCR_INVALID_INPUT');
            }

            // 'analyze' est un Query param dans l'API Python (pas body).
            $analyzeParam = $analyze ? 'true' : 'false';
            $response = Http::timeout(60)
                ->withHeaders(['Authorization' => 'Bearer ' . $this->key])
                ->attach('file', $binaryContent, $filename)
                ->post("{$this->url}/v1/ocr/scan?analyze={$analyzeParam}");

            if ($response->successful()) {
                $json = $response->json();
                $data = $json['data'] ?? [];

                return [
                    'text'         => $data['ocr']['text']         ?? '',
                    'pages'        => $data['ocr']['pages']         ?? 1,
                    'blocks'       => $data['ocr']['blocks']        ?? [],
                    'medical_info' => $data['medical_info']         ?? null,
                ];
            }

            Log::error('OCR service error', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            return $this->emptyResult('OCR_FAILED');

        } catch (\Exception $e) {
            Log::error('OCR exception', ['message' => $e->getMessage()]);
            return $this->emptyResult('OCR_EXCEPTION');
        }
    }

    private function emptyResult(string $error): array
    {
        return [
            'text'         => '',
            'pages'        => 0,
            'blocks'       => [],
            'medical_info' => null,
            'error'        => $error,
        ];
    }
}