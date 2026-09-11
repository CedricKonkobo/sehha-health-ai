# models.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


# ---------------------------------------------------------
# Requêtes
# ---------------------------------------------------------
class StartConversationRequest(BaseModel):
    patient_id: str
    patient_context: Optional[dict] = None


class MessageRequest(BaseModel):
    message: str


# ---------------------------------------------------------
# Réponses enrichies pour le PHP
# ---------------------------------------------------------
class StartConversationResponse(BaseModel):
    session_id: str
    patient_id: str
    question: str
    # Champs attendus par PHP
    first_question: str  # Alias pour question
    status: str = "in_progress"
    progress: dict = Field(default_factory=lambda: {
        "current_turn": 1,
        "min_turns": 8,
        "max_turns": 14
    })
    fallback: bool = False


class MessageResponse(BaseModel):
    session_id: str
    question: Optional[str] = None
    is_complete: bool
    clinical_summary: Optional["ClinicalSummary"] = None
    triage_result: Optional["TriageResult"] = None
    # Champs attendus par PHP
    status: str  # "in_progress" ou "completed"
    next_question: Optional[dict] = None  # {"id": int, "text": str}
    progress: dict
    clinical_data_so_far: Optional[dict] = None
    fallback: bool = False


# ---------------------------------------------------------
# État de la conversation
# ---------------------------------------------------------
class ConversationState(BaseModel):
    session_id: str
    patient_id: str
    motif_principal: Optional[str] = None
    douleur_eva: Optional[int] = None
    duree_symptomes: Optional[str] = None
    evolution: Optional[str] = None
    age: Optional[int] = None
    antecedents: list[str] = Field(default_factory=list)
    symptomes_associes: list[str] = Field(default_factory=list)
    contexte: dict = Field(default_factory=dict)
    red_flags_detectes: list[str] = Field(default_factory=list)
    history: list[dict] = Field(default_factory=list)
    is_complete: bool = False
    current_turn: int = 0  # Nombre de tours utilisateur


# ---------------------------------------------------------
# Résumé clinique
# ---------------------------------------------------------
class ClinicalSummary(BaseModel):
    patient_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    motif_principal: str
    douleur_eva: int
    duree_symptomes: str
    evolution: str
    age: int
    antecedents: list[str] = Field(default_factory=list)
    symptomes_associes: list[str] = Field(default_factory=list)
    contexte: dict = Field(default_factory=dict)
    red_flags_detectes: list[str] = Field(default_factory=list)


# ---------------------------------------------------------
# Résultat du triage enrichi
# ---------------------------------------------------------
class TriageResult(BaseModel):
    patient_id: str
    score: int  # 1 à 5 (CCMU)
    ia_score: str  # P1, P2, P3, P4, P5
    recommended_delay: str  # immediat, sous_1h, sous_4h, sous_24h, sous_72h
    confidence: float
    justification: str
    orientation: str
    action: str
    needs_human_review: bool
    red_flags: list[str] = Field(default_factory=list)
    message_patient: str = ""  # Message pour le patient


# ---------------------------------------------------------
# Notification hôpital
# ---------------------------------------------------------
class HospitalNotification(BaseModel):
    patient_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    clinical_summary: ClinicalSummary
    triage_result: TriageResult
    explication: str


# Helper
def new_id() -> str:
    return str(uuid.uuid4())


# Résoudre les forward references
MessageResponse.model_rebuild()