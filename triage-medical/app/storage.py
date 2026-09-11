"""
Stockage simple en memoire pour le MVP.
A migrer vers SQLite/Postgres pour la prod.
"""
from app.models import ConversationState, TriageResult, HospitalNotification

_sessions: dict[str, ConversationState] = {}
_results: dict[str, TriageResult] = {}
_notifications: dict[str, HospitalNotification] = {}


def save_state(state: ConversationState) -> None:
    _sessions[state.session_id] = state


def get_state(session_id: str) -> ConversationState | None:
    return _sessions.get(session_id)


def save_result(result: TriageResult) -> None:
    _results[result.patient_id] = result


def get_result(patient_id: str) -> TriageResult | None:
    return _results.get(patient_id)


def save_notification(notification: HospitalNotification) -> None:
    _notifications[notification.patient_id] = notification


def get_notification(patient_id: str) -> HospitalNotification | None:
    return _notifications.get(patient_id)