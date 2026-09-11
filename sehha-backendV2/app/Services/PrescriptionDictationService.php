<?php

namespace App\Services;

/**
 * Orchestration du flux "dictée vocale -> médicaments structurés" pour
 * pré-remplir le formulaire d'ordonnance :
 *   1. Speech-to-Text (SpeechToTextService) -> transcrit l'audio en texte
 *   2. LLM (LlmService) -> parse le texte en liste de médicaments structurés
 *      {nom, posologie, duree}, le même format attendu par
 *      PrescriptionController::store.
 */
class PrescriptionDictationService
{
    public function __construct(
        private SpeechToTextService $stt,
        private LlmService $llm,
    ) {}

    /**
     * @return array{transcript: string, medicaments: array<int, array{nom: string, posologie: string, duree: string}>}
     */
    public function parseAudioToMedications(string $audioBase64, string $language = 'fr'): array
    {
        $sttResult = $this->stt->transcribe($audioBase64, $language);
        $transcript = $sttResult['text'] ?? $sttResult['transcript'] ?? '';

        if (trim($transcript) === '') {
            return ['transcript' => '', 'medicaments' => []];
        }

        $prompt = <<<PROMPT
Tu es un assistant médical. Voici la dictée d'un médecin marocain décrivant une
ordonnance à l'oral, en français (parfois mélangé à des termes en arabe/darija
pour la posologie). Extrais la liste des médicaments mentionnés.

Réponds UNIQUEMENT en JSON avec cette structure exacte :
{"medicaments": [{"nom": "...", "posologie": "...", "duree": "..."}]}

- "nom" : nom du médicament tel que dicté (corrige les fautes évidentes)
- "posologie" : dosage et fréquence (ex: "500mg, 3 fois par jour")
- "duree" : durée du traitement (ex: "7 jours")

Si une information manque, laisse une chaîne vide plutôt que d'inventer.

Dictée transcrite :
"""
{$transcript}
"""
PROMPT;

        $result = $this->llm->completeJson($prompt);

        $medicaments = $result['medicaments'] ?? [];
        if (!is_array($medicaments)) {
            $medicaments = [];
        }

        // Normalisation défensive : on garantit toujours les 3 clés attendues
        // par PrescriptionController::store, même si le LLM en oublie une.
        $medicaments = array_map(function ($med) {
            return [
                'nom' => $med['nom'] ?? '',
                'posologie' => $med['posologie'] ?? '',
                'duree' => $med['duree'] ?? '',
            ];
        }, $medicaments);

        return ['transcript' => $transcript, 'medicaments' => $medicaments];
    }
}
