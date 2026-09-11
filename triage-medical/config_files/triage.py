"""
Moteur de décision IA (triage).
1. Vérifie les red flags -> court-circuit si présents (score 4/5)
2. Sinon, interroge le RAG clinique
3. Le LLM applique un raisonnement en 4 passes
4. Vérifie le niveau de confiance
5. Détermine l'orientation
"""
from app.models import ClinicalSummary, TriageResult
from app.llm import call_llm_json
from app.rag import query_clinical_rag
from app.config import CONFIDENCE_THRESHOLD


SYSTEM_PROMPT_SCORING = """Tu es un moteur de décision médical de triage, basé sur la
Classification Clinique des Malades aux Urgences (CCMU) et le Manchester Triage System.

Tu reçois un résumé clinique JSON et des extraits de protocoles médicaux (RAG).

Applique un raisonnement structuré en 4 passes :
1. Gravité des symptômes individuels (douleur EVA, red flags, constantes)
2. Contexte aggravant (âge, antécédents, évolution, durée)
3. Comparaison avec les critères CCMU des extraits fournis
4. Score final + justification point par point

Règles :
- Score CCMU de 1 (le moins grave) à 5 (le plus grave / urgence vitale)
- Si red_flags_detectes non vide -> score doit être 4 ou 5
- Fournis un niveau de confiance entre 0.0 et 1.0

Réponds UNIQUEMENT avec un JSON de la forme :
{
  "score": <int 1-5>,
  "confidence": <float 0-1>,
  "justification": "<texte expliquant le raisonnement en 4 passes, concis>"
}"""


def _check_red_flags(summary: ClinicalSummary) -> bool:
    """Court-circuit immédiat si red flags détectés."""
    return len(summary.red_flags_detectes) > 0


def _run_scoring(summary: ClinicalSummary) -> dict:
    """Interroge le RAG clinique puis le LLM pour obtenir score/confidence/justification."""
    query_text = " ".join(
        [summary.motif_principal] + summary.symptomes_associes + summary.red_flags_detectes
    )
    rag_chunks = query_clinical_rag(query_text, n_results=5)
    rag_context = "\n---\n".join(rag_chunks) if rag_chunks else "Aucun protocole RAG disponible."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_SCORING},
        {
            "role": "user",
            "content": (
                f"Résumé clinique:\n{summary.model_dump_json()}\n\n"
                f"Extraits de protocoles (RAG clinique):\n{rag_context}"
            ),
        },
    ]
    return call_llm_json(messages, temperature=0.2)


def _determine_orientation(score: int) -> str:
    """Mappe le score CCMU vers une orientation."""
    if score >= 4:
        return "urgence_immediate"
    elif score in (2, 3):
        return "consultation_specialiste"
    else:
        return "teleconsultation"


def run_triage(summary: ClinicalSummary) -> TriageResult:
    """Point d'entrée principal du moteur de triage."""

    # 1. Red flags -> court-circuit
    if _check_red_flags(summary):
        score = 5 if len(summary.red_flags_detectes) > 1 else 4
        return TriageResult(
            patient_id=summary.patient_id,
            score=score,
            confidence=1.0,
            justification=(
                f"Red flag(s) détecté(s): {', '.join(summary.red_flags_detectes)}. "
                "Score maximal attribué par sécurité, arrêt immédiat du raisonnement."
            ),
            orientation=_determine_orientation(score),
            needs_human_review=False,
            red_flags=summary.red_flags_detectes,
        )

    # 2-4. Scoring via RAG clinique + LLM (4 passes)
    result = _run_scoring(summary)
    score = int(result.get("score", 3))
    confidence = float(result.get("confidence", 0.5))
    justification = result.get("justification", "Aucune justification fournie.")

    # 5. Vérification du seuil de confiance
    needs_human_review = confidence < CONFIDENCE_THRESHOLD

    return TriageResult(
        patient_id=summary.patient_id,
        score=score,
        confidence=confidence,
        justification=justification,
        orientation=_determine_orientation(score),
        needs_human_review=needs_human_review,
        red_flags=summary.red_flags_detectes,
    )
