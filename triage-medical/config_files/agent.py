"""
Agent conversationnel adaptatif.
Pose des questions une à une, met à jour l'état, décide quand c'est complet,
et génère le résumé clinique JSON final.
"""
from app.models import ConversationState, ClinicalSummary, new_id
from app.llm import call_llm, call_llm_json
from app.rag import query_conversational_rag
from app.config import REQUIRED_FIELDS


SYSTEM_PROMPT_QUESTION = """Tu es un agent médical de triage qui mène un entretien avec un patient.
Ton rôle est de poser UNE SEULE question à la fois, claire et simple, pour recueillir
les informations cliniques nécessaires à un triage (CCMU).

Champs à collecter : motif_principal, douleur_eva (0-10), duree_symptomes, evolution
(stable/aggravation/amélioration), age, antecedents, symptomes_associes, contexte.

Règles :
- Si le patient mentionne un symptôme grave (douleur thoracique, difficulté à respirer,
  perte de connaissance, saignement important, paralysie...), priorise immédiatement
  les questions de détection de RED FLAGS.
- Sois concis, empathique, une question à la fois.
- Ne pose pas une question déjà répondue (vois l'état actuel ci-dessous).
- Utilise le contexte médical fourni (RAG) pour orienter tes questions si pertinent.

Réponds uniquement avec la prochaine question à poser au patient (texte simple, pas de JSON)."""


SYSTEM_PROMPT_EXTRACT = """Tu es un extracteur d'informations cliniques.
Analyse le dernier échange (question posée + réponse du patient) et l'état actuel,
puis renvoie un JSON avec UNIQUEMENT les champs mis à jour ou nouvellement détectés.

Champs possibles : motif_principal (str), douleur_eva (int 0-10), duree_symptomes (str),
evolution (str: "stable"/"aggravation"/"amelioration"), age (int),
antecedents (list[str], à ajouter), symptomes_associes (list[str], à ajouter),
contexte (dict, à fusionner), red_flags_detectes (list[str], à ajouter si détecté).

Red flags à détecter : douleur thoracique intense, difficulté respiratoire sévère,
perte de connaissance, paralysie/AVC suspecté, saignement abondant, douleur abdominale
intense + fièvre, idées suicidaires actives.

Réponds UNIQUEMENT avec un objet JSON contenant les champs à mettre à jour (clé: valeur).
Si rien de nouveau, renvoie {}."""


SYSTEM_PROMPT_COMPLETION = """Tu es un agent médical de triage.
Voici l'état actuel des informations collectées sur un patient (JSON).
Détermine si on a SUFFISAMMENT d'informations pour lancer un triage fiable.

Réponds UNIQUEMENT avec un JSON: {"is_complete": true/false, "reason": "..."}

Considère que c'est complet si : motif_principal, douleur_eva, duree_symptomes,
evolution, age sont renseignés, ET si un red flag a été détecté (dans ce cas,
arrêter immédiatement même si d'autres champs manquent)."""


def start_conversation() -> tuple[ConversationState, str]:
    """Crée une nouvelle session et génère la première question."""
    session_id = new_id()
    patient_id = new_id()

    state = ConversationState(session_id=session_id, patient_id=patient_id)

    first_question = "Bonjour, je suis l'assistant de triage. Pouvez-vous décrire le motif de votre venue aujourd'hui ?"
    state.history.append({"role": "assistant", "content": first_question})

    return state, first_question


def _extract_updates(state: ConversationState, last_question: str, user_message: str) -> dict:
    """Utilise le LLM pour extraire les champs mis à jour à partir de la réponse."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_EXTRACT},
        {
            "role": "user",
            "content": (
                f"Etat actuel: {state.model_dump(exclude={'history'})}\n\n"
                f"Question posée: {last_question}\n"
                f"Réponse du patient: {user_message}"
            ),
        },
    ]
    return call_llm_json(messages)


def _apply_updates(state: ConversationState, updates: dict) -> None:
    """Applique les mises à jour extraites à l'état (gère fusion listes/dicts)."""
    for key, value in updates.items():
        if not hasattr(state, key):
            continue
        if key in ("antecedents", "symptomes_associes", "red_flags_detectes"):
            existing = getattr(state, key)
            for v in (value if isinstance(value, list) else [value]):
                if v not in existing:
                    existing.append(v)
        elif key == "contexte":
            state.contexte.update(value if isinstance(value, dict) else {})
        else:
            setattr(state, key, value)


def _check_completion(state: ConversationState) -> bool:
    """Vérifie via règles + LLM si l'état est suffisant pour lancer le triage."""
    # Règle codée : si red flag détecté, on arrête immédiatement
    if state.red_flags_detectes:
        return True

    # Règle codée : champs obligatoires manquants -> pas complet
    missing = [f for f in REQUIRED_FIELDS if getattr(state, f) is None]
    if missing:
        return False

    # Jugement LLM (optionnel, peut décider de continuer si cas complexe)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_COMPLETION},
        {"role": "user", "content": str(state.model_dump(exclude={"history"}))},
    ]
    try:
        result = call_llm_json(messages)
        return bool(result.get("is_complete", True))
    except Exception:
        # En cas d'erreur LLM, se fier aux champs obligatoires
        return True


def _generate_next_question(state: ConversationState) -> str:
    """Génère la prochaine question en s'appuyant sur le RAG conversationnel."""
    # Requête RAG basée sur le contexte actuel
    query_parts = [state.motif_principal or ""]
    query_parts += state.symptomes_associes
    query_parts += state.red_flags_detectes
    query_text = " ".join(p for p in query_parts if p) or "entretien initial triage"

    rag_chunks = query_conversational_rag(query_text, n_results=3)
    rag_context = "\n---\n".join(rag_chunks) if rag_chunks else "Aucun contexte RAG disponible."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT_QUESTION},
        {
            "role": "user",
            "content": (
                f"Etat actuel des informations:\n{state.model_dump(exclude={'history'})}\n\n"
                f"Contexte médical (RAG):\n{rag_context}\n\n"
                f"Historique récent:\n{state.history[-4:]}"
            ),
        },
    ]
    return call_llm(messages, temperature=0.4)


def process_message(state: ConversationState, user_message: str) -> tuple[ConversationState, str | None, bool]:
    """
    Traite un message utilisateur :
    - extrait et applique les mises à jour
    - vérifie la complétude
    - génère la prochaine question si nécessaire

    Retourne (state, next_question_or_None, is_complete)
    """
    last_question = state.history[-1]["content"] if state.history else ""

    state.history.append({"role": "user", "content": user_message})

    updates = _extract_updates(state, last_question, user_message)
    _apply_updates(state, updates)

    if _check_completion(state):
        state.is_complete = True
        return state, None, True

    next_question = _generate_next_question(state)
    state.history.append({"role": "assistant", "content": next_question})

    return state, next_question, False


def build_clinical_summary(state: ConversationState) -> ClinicalSummary:
    """Construit le JSON clinique final à partir de l'état complété."""
    return ClinicalSummary(
        patient_id=state.patient_id,
        motif_principal=state.motif_principal or "non précisé",
        douleur_eva=state.douleur_eva if state.douleur_eva is not None else 0,
        duree_symptomes=state.duree_symptomes or "non précisé",
        evolution=state.evolution or "non précisé",
        age=state.age if state.age is not None else 0,
        antecedents=state.antecedents,
        symptomes_associes=state.symptomes_associes,
        contexte=state.contexte,
        red_flags_detectes=state.red_flags_detectes,
    )
