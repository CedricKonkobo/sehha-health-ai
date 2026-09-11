"""
Simulation d'envoi de notification vers l'hopital (tracabilite).
Aucun envoi reel : on construit un JSON structure (resume + explication),
on l'affiche en console et on le stocke (storage), comme si on l'envoyait
a un systeme externe (ex: webhook hopital).
"""
import json
from app.models import ClinicalSummary, TriageResult, HospitalNotification


def _build_explication(summary: ClinicalSummary, result: TriageResult) -> str:
    """Genere un texte court resumant la situation pour l'equipe hospitaliere."""
    parts = [
        f"Patient (id={summary.patient_id}, age={summary.age} ans) "
        f"se presente pour : {summary.motif_principal}.",
        f"Douleur evaluee a {summary.douleur_eva}/10, "
        f"depuis {summary.duree_symptomes}, evolution : {summary.evolution}.",
    ]
    if summary.symptomes_associes:
        parts.append("Symptomes associes : " + ", ".join(summary.symptomes_associes) + ".")
    if summary.antecedents:
        parts.append("Antecedents : " + ", ".join(summary.antecedents) + ".")
    if result.red_flags:
        parts.append("RED FLAGS DETECTES : " + ", ".join(result.red_flags) + ".")

    parts.append(
        f"Score de triage (CCMU) : {result.score}/5 "
        f"(confiance {result.confidence:.2f}). "
        f"Orientation : {result.orientation}. Action recommandee : {result.action}"
    )
    if result.needs_human_review:
        parts.append("ATTENTION : confiance faible, validation humaine recommandee.")

    return " ".join(parts)


def send_notification(summary: ClinicalSummary, result: TriageResult) -> HospitalNotification:
    """
    Simule l'envoi d'une notification vers l'hopital.
    Construit le JSON complet, l'affiche (console) et le retourne.
    """
    notification = HospitalNotification(
        patient_id=summary.patient_id,
        clinical_summary=summary,
        triage_result=result,
        explication=_build_explication(summary, result),
    )

    # Simulation : on "envoie" en affichant le JSON en console.
    # En prod, remplacer par un appel HTTP (requests.post(url, json=...))
    # ou un message dans une queue/Slack/email, etc.
    print("=" * 60)
    print("[SIMULATION] Notification envoyee a l'hopital :")
    print(json.dumps(notification.model_dump(mode="json"), indent=2, ensure_ascii=False))
    print("=" * 60)

    return notification