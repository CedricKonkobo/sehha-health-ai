"""
Point d'entrée FastAPI - Moteur IA de Triage Médical (MVP)
"""
from fastapi import FastAPI, HTTPException

from app.models import (
    StartConversationResponse,
    MessageRequest,
    MessageResponse,
    ConversationState,
)
from app import agent, triage, storage

app = FastAPI(title="Moteur IA de Triage Médical - MVP")


@app.post("/conversation/start", response_model=StartConversationResponse)
def start_conversation():
    state, first_question = agent.start_conversation()
    storage.save_state(state)

    return StartConversationResponse(
        session_id=state.session_id,
        patient_id=state.patient_id,
        question=first_question,
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

    if not is_complete:
        return MessageResponse(
            session_id=session_id,
            question=next_question,
            is_complete=False,
        )

    # Conversation terminée -> générer le résumé clinique + lancer le triage
    clinical_summary = agent.build_clinical_summary(state)
    triage_result = triage.run_triage(clinical_summary)
    storage.save_result(triage_result)

    return MessageResponse(
        session_id=session_id,
        question=None,
        is_complete=True,
        clinical_summary=clinical_summary,
        triage_result=triage_result,
    )


@app.get("/conversation/{session_id}/state", response_model=ConversationState)
def get_state(session_id: str):
    state = storage.get_state(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session introuvable")
    return state


@app.get("/health")
def health():
    return {"status": "ok"}
