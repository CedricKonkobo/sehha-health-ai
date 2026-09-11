"""
Point d'entrée FastAPI - Moteur IA de Triage Médical (MVP)
Corrigé pour intégration Laravel
"""
from fastapi import FastAPI, HTTPException

from app.models import (
    StartConversationRequest,
    StartConversationResponse,
    MessageRequest,
    MessageResponse,
    ConversationState,
    HospitalNotification,
)
from app import agent, triage, storage, notify

app = FastAPI(title="Moteur IA de Triage Médical - MVP")


@app.post("/conversation/start", response_model=StartConversationResponse)
def start_conversation(body: StartConversationRequest):
    """
    Démarre une conversation de triage.
    Accepte patient_id et patient_context depuis Laravel.
    """
    state, first_question = agent.start_conversation(
        patient_id=body.patient_id,
        patient_context=body.patient_context
    )
    storage.save_state(state)

    return StartConversationResponse(
        session_id=state.session_id,
        patient_id=state.patient_id,
        question=first_question,
        first_question=first_question,  # Pour compatibilité PHP
        status="in_progress",
        progress={
            "current_turn": 1,
            "min_turns": agent.MIN_TURNS,
            "max_turns": agent.MAX_TURNS
        },
        fallback=False
    )


@app.post("/conversation/{session_id}/message", response_model=MessageResponse)
def post_message(session_id: str, body: MessageRequest):
    state = storage.get_state(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session introuvable")

    if state.is_complete:
        raise HTTPException(status_code=400, detail="Conversation déjà terminée")

    state, next_question, is_complete = agent.process_message(state, body.message)
    storage.save_state(state)

    # Calculer la progression
    current_turn = state.current_turn
    progress = {
        "current_turn": current_turn,
        "min_turns": agent.MIN_TURNS,
        "max_turns": agent.MAX_TURNS
    }

    # Préparer les données cliniques collectées jusqu'à présent
    clinical_data_so_far = {
        "motif_principal": state.motif_principal,
        "douleur_eva": state.douleur_eva,
        "duree_symptomes": state.duree_symptomes,
        "evolution": state.evolution,
        "age": state.age,
        "antecedents": state.antecedents,
        "symptomes_associes": state.symptomes_associes,
        "red_flags_detectes": state.red_flags_detectes,
        "contexte": state.contexte
    }

    if not is_complete:
        return MessageResponse(
            session_id=session_id,
            question=next_question,
            is_complete=False,
            status="in_progress",
            next_question={
                "id": current_turn + 1,
                "text": next_question
            },
            progress=progress,
            clinical_data_so_far=clinical_data_so_far,
            fallback=False
        )

    # Conversation terminée -> générer le résumé clinique + lancer le triage
    clinical_summary = agent.build_clinical_summary(state)
    triage_result = triage.run_triage(clinical_summary)
    storage.save_result(triage_result)

    # Simulation : envoi d'une notification à l'hôpital
    notification = notify.send_notification(clinical_summary, triage_result)
    storage.save_notification(notification)

    return MessageResponse(
        session_id=session_id,
        question=None,
        is_complete=True,
        status="completed",
        clinical_summary=clinical_summary,
        triage_result=triage_result,
        progress=progress,
        clinical_data_so_far=clinical_data_so_far,
        fallback=False
    )


@app.get("/conversation/{session_id}/state")
def get_state(session_id: str):
    state = storage.get_state(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session introuvable")
    
    # Retourner un format riche pour le PHP
    return {
        "session_id": state.session_id,
        "patient_id": state.patient_id,
        "is_complete": state.is_complete,
        "current_turn": state.current_turn,
        "history": state.history,
        "clinical_data": {
            "motif_principal": state.motif_principal,
            "douleur_eva": state.douleur_eva,
            "duree_symptomes": state.duree_symptomes,
            "evolution": state.evolution,
            "age": state.age,
            "antecedents": state.antecedents,
            "symptomes_associes": state.symptomes_associes,
            "red_flags_detectes": state.red_flags_detectes,
            "contexte": state.contexte
        }
    }


@app.get("/notifications/{patient_id}")
def get_notification(patient_id: str):
    notification = storage.get_notification(patient_id)
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    
    # Wrapper pour compatibilité PHP
    return {
        "data": notification.model_dump(mode="json")
    }


@app.get("/health")
def health():
    return {"status": "ok"}