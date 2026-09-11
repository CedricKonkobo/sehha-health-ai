from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


# ---------------------------------------------------------
# Etat de la conversation (rempli progressivement)
# ---------------------------------------------------------
class ConversationState(BaseModel):
    session_id: str
    patient_id: str

    # Champs cliniques collectés progressivement
    motif_principal: Optional[str] = None
    douleur_eva: Optional[int] = None  # 0-10
    duree_symptomes: Optional[str] = None
    evolution: Optional[str] = None  # stable / aggravation / amélioration
    age: Optional[int] = None
    antecedents: list[str] = Field(default_factory=list)
    symptomes_associes: list[str] = Field(default_factory=list)
    contexte: dict = Field(default_factory=dict)  # seul, immobilisé, etc.
    red_flags_detectes: list[str] = Field(default_factory=list)

    # Historique conversationnel (pour le LLM)
    history: list[dict] = Field(default_factory=list)  # [{role, content}]

    is_complete: bool = False


# ---------------------------------------------------------
# Requête / réponse endpoint conversation
# ---------------------------------------------------------
class StartConversationResponse(BaseModel):
    session_id: str
    patient_id: str
    question: str


class MessageRequest(BaseModel):
    message: str


class MessageResponse(BaseModel):
    session_id: str
    question: Optional[str] = None  # prochaine question si pas complet
    is_complete: bool
    clinical_summary: Optional["ClinicalSummary"] = None
    triage_result: Optional["TriageResult"] = None


# ---------------------------------------------------------
# Résumé clinique structuré (JSON "passeport clinique")
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
# Résultat du moteur de triage
# ---------------------------------------------------------
class TriageResult(BaseModel):
    patient_id: str
    score: int  # 1 à 5 (CCMU)
    confidence: float  # 0.0 - 1.0
    justification: str
    orientation: str  # "urgence_immediate" | "consultation_specialiste" | "teleconsultation"
    needs_human_review: bool
    red_flags: list[str] = Field(default_factory=list)


# Helper pour générer des IDs
def new_id() -> str:
    return str(uuid.uuid4())


# Résoudre les forward references
MessageResponse.model_rebuild()
