"""
Stockage simple en mémoire pour le MVP.
A migrer vers SQLite/Postgres pour la prod.
"""
from app.models import ConversationState, TriageResult

_sessions: dict[str, ConversationState] = {}
_results: dict[str, TriageResult] = {}


def save_state(state: ConversationState) -> None:
    _sessions[state.session_id] = state


def get_state(session_id: str) -> ConversationState | None:
    return _sessions.get(session_id)


def save_result(result: TriageResult) -> None:
    _results[result.patient_id] = result


def get_result(patient_id: str) -> TriageResult | None:
    return _results.get(patient_id)
