<?php

namespace App\Services;

use App\Models\MedicalDocument;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Orchestration du flux « scanner un document » :
 *   1. OCR (OcrService)  → extrait le texte brut de l'image (base64 ou chemin)
 *   2. LLM (LlmService)  → structure / résume ce texte
 *   3. Stockage du fichier image original + création du MedicalDocument
 */
class DocumentIngestionService
{
    public function __construct(
        private OcrService $ocr,
        private LlmService $llm,
    ) {}

    /**
     * @param string      $imageBase64    Image brute en base64 (préfixe data:.. accepté)
     * @param int         $patientId      ID Laravel du patient propriétaire
     * @param int         $createdById    ID Laravel de l'utilisateur qui scanne
     * @param string|null $titleHint      Titre suggéré par l'UI (sinon déduit du LLM)
     * @param bool        $visibleToPatient
     */
    public function ingestScannedDocument(
        string $imageBase64,
        int $patientId,
        int $createdById,
        ?string $titleHint = null,
        bool $visibleToPatient = true,
    ): MedicalDocument {
        // 1. OCR — on passe le base64, le service gère le décodage
        $ocrResult = $this->ocr->scan(
            input: $imageBase64,
            isPath: false,
            analyze: false,          // on fait nous-mêmes le LLM ci-dessous
            filename: 'document.jpg'
        );

        $extractedText = $ocrResult['text'] ?? '';

        // 2. Résumé LLM
        $summary = $this->summarize($extractedText);

        $documentType = $summary['document_type'] ?? 'biologie';
        $title = $titleHint ?: ($summary['title'] ?? 'Document scanné le ' . now()->format('d/m/Y'));

        // 3. Stockage de l'image brute
        $base64Clean = preg_replace('/^data:[^;]+;base64,/', '', $imageBase64);
        $filename = 'scans/' . Str::uuid() . '.jpg';
        Storage::put($filename, base64_decode($base64Clean));

        return MedicalDocument::create([
            'patient_id'        => $patientId,
            'created_by'        => $createdById,
            'type'              => $this->mapToDocumentType($documentType),
            'title'             => $title,
            'issued_at'         => now()->toDateString(),
            'storage_path'      => $filename,
            'structured_data'   => $summary['structured_data'] ?? null,
            'extracted_text'    => $extractedText,
            'ai_summary'        => $summary['summary'] ?? $extractedText,
            'source'            => 'ocr_scan',
            'status'            => 'valide',
            'visible_to_patient' => $visibleToPatient,
        ]);
    }

    private function summarize(string $extractedText): array
    {
        if (trim($extractedText) === '') {
            return ['summary' => '', 'title' => null, 'document_type' => 'biologie'];
        }

        $prompt = <<<PROMPT
Tu analyses le texte brut extrait par OCR d'un document médical marocain.
Réponds UNIQUEMENT en JSON avec ces clés :
- "title": titre court et lisible du document (ex: "Bilan lipidique - Mars 2026")
- "document_type": un seul mot parmi [biologie, imagerie, ordonnance, compte_rendu, ecg, certificat]
- "summary": résumé clinique de 2-4 phrases en français, des informations clés
- "structured_data": objet JSON des valeurs numériques importantes si présentes (ex: résultats de labo {"parametre": "valeur unite"})

Texte brut OCR :
"""
{$extractedText}
"""
PROMPT;

        $result = $this->llm->completeJson($prompt);

        if (isset($result['error']) || isset($result['parse_error'])) {
            return ['summary' => $extractedText, 'title' => null, 'document_type' => 'biologie'];
        }

        return $result;
    }

    private function mapToDocumentType(string $type): string
    {
        $allowed = ['ordonnance', 'biologie', 'imagerie', 'compte_rendu', 'ecg', 'certificat', 'bilan_triage'];
        return in_array($type, $allowed, true) ? $type : 'biologie';
    }
}