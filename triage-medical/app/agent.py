"""
Agent conversationnel adaptatif - VERSION AMÉLIORÉE
Conversation plus naturelle, tout en gardant la sécurité clinique
"""
from app.models import ConversationState, ClinicalSummary, new_id
from app.llm import call_llm_json
from app.rag import query_conversational_rag
from app.config import REQUIRED_FIELDS

MAX_TURNS = 14
MIN_TURNS = 6  # Réduit de 8 à 6 pour plus de fluidité


SYSTEM_PROMPT_TURN = """Tu es un assistant médical de triage empathique et conversationnel.
Tu mènes un ENTRETIEN CLINIQUE avec un patient, comme un infirmier d'accueil aux urgences.

Etat actuel des informations déjà collectées (JSON) :
{state}

Champs encore manquants : {missing_fields}

Tour actuel : {nb_turns} / minimum recommandé : {min_turns}

Dernière question posée : "{last_question}"
Réponse du patient : "{user_message}"

Contexte médical (RAG) :
{rag_context}

TÂCHE : Analyse la réponse du patient et réponds avec UN SEUL objet JSON :
{{
  "updates": {{}},
  "patient_asked_question": false,
  "answer_to_patient": null,
  "next_question": "",
  "conversation_style": "natural"
}}

RÈGLES D'EXTRACTION ("updates") :
- Extrais TOUTE information présente dans la réponse, même hors-sujet.
- Champs possibles : motif_principal, douleur_eva (0-10), duree_symptomes, 
  evolution (stable/aggravation/amelioration), age, antecedents (liste), 
  symptomes_associes (liste), contexte (dict), red_flags_detectes (liste).
- N'ajoute un red flag QUE si le patient l'a explicitement décrit.

STYLE CONVERSATIONNEL (TRÈS IMPORTANT) :
- Sois chaleureux et empathique, pas robotique.
- Si le patient donne plusieurs infos d'un coup, remercie-le et passe à la suite.
- Si le patient pose une question, réponds brièvement (1-2 phrases) puis repose ta question.
- Ne répète PAS une question déjà répondue.
- Adapte ton langage au niveau de compréhension du patient.
- Si le patient semble anxieux, rassure-le avant de continuer.

CHECKLIST DE SIGNES D'ALARME (à explorer naturellement) :
- Céphalée : raideur de nuque, fièvre, troubles vision, confusion, faiblesse unilatérale.
- Douleur thoracique : irradiation, essoufflement, sueurs, palpitations.
- Douleur abdominale : fièvre, vomissements, transit, sang.
- Vertiges : trouble équilibre, parole, vision double, faiblesse membre.
- Difficulté respiratoire : douleur thoracique, cyanose, capacité à parler.
- Traumatisme : perte de connaissance, mécanisme, mobilité.

PRIORITÉS :
1. Si champs obligatoires manquants → les collecter naturellement.
2. Si champs obligatoires remplis → explorer les signes d'alarme pertinents.
3. Si nb_turns < min_turns → continuer l'anamnèse générale.
4. Si red flag détecté → creuser en priorité absolue.
5. Si le patient donne beaucoup d'infos → remercie et adapte la suite.

Reponds UNIQUEMENT avec le JSON, sans texte autour."""


FIELD_QUESTIONS = {
    "motif_principal": "Bonjour ! Je suis là pour vous aider aujourd'hui. Pouvez-vous me dire ce qui vous amène ?",
    "douleur_eva": "Sur une échelle de 0 à 10, où 0 c'est aucune gêne et 10 c'est insupportable, comment évalueriez-vous votre douleur ?",
    "duree_symptomes": "Depuis quand ressentez-vous ces symptômes ?",
    "evolution": "Est-ce que cela s'aggrave, s'améliore, ou c'est stable depuis le début ?",
    "age": "Pour mieux vous orienter, quel âge avez-vous ?",
}

# Questions de secours pour approfondir
DEEPENING_FALLBACK_QUESTIONS = [
    "Avez-vous remarqué d'autres symptômes qui vous inquiètent, comme de la fièvre, des nausées, ou des vertiges ?",
    "Y a-t-il quelque chose qui aggrave ou soulage vos symptômes ?",
    "Avez-vous des antécédents médicaux importants ou des allergies que je devrais connaître ?",
    "Avez-vous déjà eu des symptômes similaires par le passé ?",
    "Comment qualifieriez-vous cette douleur ? (brûlure, crampe, picotement, oppression...)",
    "Ressentez-vous cette douleur ailleurs aussi, ou elle reste au même endroit ?",
]


def start_conversation(patient_id: str = None, patient_context: dict = None) -> tuple[ConversationState, str]:
    """Crée une nouvelle session avec le patient_id de Laravel et injecte le contexte."""
    session_id = new_id()
    patient_id = patient_id or new_id()

    state = ConversationState(session_id=session_id, patient_id=patient_id)

    # Injecter le contexte patient si fourni
    if patient_context:
        if 'known_conditions' in patient_context:
            state.antecedents.extend(patient_context['known_conditions'])
        if 'known_allergies' in patient_context:
            state.contexte['allergies'] = patient_context['known_allergies']
        if 'recent_vitals' in patient_context:
            state.contexte['recent_vitals'] = patient_context['recent_vitals']
        if 'previous_triages' in patient_context:
            state.contexte['previous_triages'] = patient_context['previous_triages']
        if 'age' in patient_context and patient_context['age']:
            try:
                state.age = int(patient_context['age'])
            except (ValueError, TypeError):
                pass

    first_question = FIELD_QUESTIONS["motif_principal"]
    state.history.append({"role": "assistant", "content": first_question})

    return state, first_question


def _apply_updates(state: ConversationState, updates: dict) -> None:
    """Applique les mises à jour extraites à l'état."""
    if not isinstance(updates, dict):
        return
    for key, value in updates.items():
        if value is None or not hasattr(state, key):
            continue
        if key in ("antecedents", "symptomes_associes", "red_flags_detectes"):
            existing = getattr(state, key)
            for v in (value if isinstance(value, list) else [value]):
                if v and v not in existing:
                    existing.append(v)
        elif key == "contexte":
            if isinstance(value, dict):
                state.contexte.update(value)
        else:
            setattr(state, key, value)


def _missing_required_fields(state: ConversationState) -> list[str]:
    return [f for f in REQUIRED_FIELDS if getattr(state, f) is None]


def _nb_turns(state: ConversationState) -> int:
    return sum(1 for m in state.history if m["role"] == "user")


def _is_complete(state: ConversationState, nb_turns: int) -> bool:
    # Red flag détecté -> arrêt immédiat
    if state.red_flags_detectes:
        return True
    # Champs obligatoires manquants -> jamais complet
    if _missing_required_fields(state):
        return False
    # Minimum d'échanges atteint
    return nb_turns >= MIN_TURNS


def _build_rag_context(state: ConversationState) -> str:
    query_parts = [state.motif_principal or ""]
    query_parts += state.symptomes_associes
    query_parts += state.red_flags_detectes
    query_text = " ".join(p for p in query_parts if p) or "entretien initial triage"

    rag_chunks = query_conversational_rag(query_text, n_results=3)
    return "\n---\n".join(rag_chunks) if rag_chunks else "Aucun contexte RAG disponible."


def _fallback_next_question(state: ConversationState) -> str:
    """Question de secours si le LLM échoue."""
    asked = {m["content"].strip().lower() for m in state.history if m["role"] == "assistant"}

    missing = _missing_required_fields(state)
    if missing:
        for field in missing:
            q = FIELD_QUESTIONS.get(field)
            if q and q.strip().lower() not in asked:
                return q
        return "Pouvez-vous préciser davantage ?"

    for q in DEEPENING_FALLBACK_QUESTIONS:
        if q.strip().lower() not in asked:
            return q
    return "Y a-t-il autre chose que vous souhaitez me signaler ?"


def _is_repeated_question(state: ConversationState, question: str) -> bool:
    """Vérifie si cette question a déjà été posée."""
    normalized = question.strip().lower()
    for msg in state.history:
        if msg["role"] == "assistant" and msg["content"].strip().lower() == normalized:
            return True
    return False


def process_message(state: ConversationState, user_message: str) -> tuple[ConversationState, str | None, bool]:
    """
    Traite un message utilisateur.
    Retourne (state, next_question_or_None, is_complete)
    """
    last_question = state.history[-1]["content"] if state.history else ""
    state.history.append({"role": "user", "content": user_message})

    rag_context = _build_rag_context(state)
    missing_before = _missing_required_fields(state)
    nb_turns = _nb_turns(state)
    state.current_turn = nb_turns

    prompt = SYSTEM_PROMPT_TURN.format(
        state=state.model_dump(exclude={"history"}),
        missing_fields=missing_before,
        nb_turns=nb_turns,
        min_turns=MIN_TURNS,
        last_question=last_question,
        user_message=user_message,
        rag_context=rag_context,
    )

    try:
        result = call_llm_json([{"role": "user", "content": prompt}])
    except Exception as e:
        print(f"[AGENT ERROR] call_llm_json failed: {e}")
        result = {}

    updates = result.get("updates", {})
    _apply_updates(state, updates)

    # Garde-fou absolu
    if nb_turns >= MAX_TURNS:
        state.is_complete = True
        state.current_turn = nb_turns
        return state, None, True

    if _is_complete(state, nb_turns):
        state.is_complete = True
        state.current_turn = nb_turns
        return state, None, True

    next_question = result.get("next_question") or ""

    # Si le LLM répète une question -> fallback
    if not next_question.strip() or _is_repeated_question(state, next_question):
        next_question = _fallback_next_question(state)

    # Si le patient a posé une question
    if result.get("patient_asked_question") and result.get("answer_to_patient"):
        next_question = f"{result['answer_to_patient']}\n\n{next_question}"

    state.history.append({"role": "assistant", "content": next_question})
    state.current_turn = nb_turns
    return state, next_question, False


def build_clinical_summary(state: ConversationState) -> ClinicalSummary:
    """Construit le JSON clinique final."""
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