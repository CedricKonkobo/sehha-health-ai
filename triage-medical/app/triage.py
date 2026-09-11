"""
Moteur de décision IA (triage) - VERSION ENRICHIE
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
2. Contexte aggravant (age, antécédents, évolution, durée)
3. Comparaison avec les critères CCMU des extraits fournis
4. Score final + justification point par point

Règles :
- Score CCMU de 1 (le moins grave) à 5 (le plus grave / urgence vitale)
- Si red_flags_detectes non vide -> score doit être 4 ou 5
- Fournis un niveau de confiance entre 0.0 et 1.0
- Génère un message patient rassurant et clair

Réponds UNIQUEMENT avec un JSON de la forme :
{
  "score": 0,
  "confidence": 0.0,
  "justification": "",
  "message_patient": ""
}"""


# Mapping score CCMU -> orientation + action
ORIENTATION_MAP = {
    5: {
        "orientation": "urgence_vitale",
        "action": "Contacter les urgences et réserver une place + déclencher une ambulance si nécessaire.",
    },
    4: {
        "orientation": "urgence_a_surveiller",
        "action": "Alerter l'hôpital pour suivi du cas.",
    },
    3: {
        "orientation": "consultation_specialiste",
        "action": "Proposer une consultation avec un spécialiste adapté.",
    },
    2: {
        "orientation": "consultation_generaliste",
        "action": "Proposer une consultation avec un médecin généraliste.",
    },
    1: {
        "orientation": "teleconsultation",
        "action": "Proposer une téléconsultation.",
    },
}

# Mapping score -> code P1-P5 et délai recommandé
SCORE_MAPPING = {
    5: {"ia_score": "P1", "recommended_delay": "immediat", "message": "Votre situation nécessite une prise en charge urgente. Rendez-vous immédiatement aux urgences ou appelez le 15."},
    4: {"ia_score": "P2", "recommended_delay": "sous_1h", "message": "Votre cas est préoccupant. Vous devez consulter dans l'heure qui vient."},
    3: {"ia_score": "P3", "recommended_delay": "sous_4h", "message": "Une consultation médicale est recommandée dans les 4 heures."},
    2: {"ia_score": "P4", "recommended_delay": "sous_24h", "message": "Votre état nécessite une consultation dans les 24 heures."},
    1: {"ia_score": "P5", "recommended_delay": "sous_72h", "message": "Votre situation semble stable. Une téléconsultation ou un rendez-vous sous 72h est recommandé."},
}


def _check_red_flags(summary: ClinicalSummary) -> bool:
    return len(summary.red_flags_detectes) > 0


def _run_scoring(summary: ClinicalSummary) -> dict:
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


def _orientation_and_action(score: int) -> tuple[str, str]:
    score = max(1, min(5, score))
    entry = ORIENTATION_MAP[score]
    return entry["orientation"], entry["action"]


def run_triage(summary: ClinicalSummary) -> TriageResult:
    """Point d'entrée principal du moteur de triage."""

    # 1. Red flags -> court-circuit
    if _check_red_flags(summary):
        score = 5 if len(summary.red_flags_detectes) > 1 else 4
        mapping = SCORE_MAPPING[score]
        orientation, action = _orientation_and_action(score)
        return TriageResult(
            patient_id=summary.patient_id,
            score=score,
            ia_score=mapping["ia_score"],
            recommended_delay=mapping["recommended_delay"],
            confidence=1.0,
            justification=(
                f"Red flag(s) détecté(s): {', '.join(summary.red_flags_detectes)}. "
                "Score maximal attribué par sécurité."
            ),
            orientation=orientation,
            action=action,
            needs_human_review=False,
            red_flags=summary.red_flags_detectes,
            message_patient=mapping["message"]
        )

    # 2-4. Scoring via RAG clinique + LLM
    result = _run_scoring(summary)
    score = int(result.get("score", 3))
    confidence = float(result.get("confidence", 0.5))
    justification = result.get("justification", "Aucune justification fournie.")
    message_patient = result.get("message_patient", "")

    # 5. Vérification du seuil de confiance + orientation/action
    needs_human_review = confidence < CONFIDENCE_THRESHOLD
    orientation, action = _orientation_and_action(score)
    mapping = SCORE_MAPPING.get(score, SCORE_MAPPING[3])

    # Si le LLM n'a pas généré de message patient, utiliser le mapping par défaut
    if not message_patient:
        message_patient = mapping["message"]

    return TriageResult(
        patient_id=summary.patient_id,
        score=score,
        ia_score=mapping["ia_score"],
        recommended_delay=mapping["recommended_delay"],
        confidence=confidence,
        justification=justification,
        orientation=orientation,
        action=action,
        needs_human_review=needs_human_review,
        red_flags=summary.red_flags_detectes,
        message_patient=message_patient
    )