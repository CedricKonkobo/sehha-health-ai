import os

from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Charge sehha-ai-server/.env quel que soit le répertoire de lancement.
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

EXPECTED_TOKEN = os.getenv("AI_SERVER_TOKEN")
if not EXPECTED_TOKEN:
    raise RuntimeError(
        "AI_SERVER_TOKEN manquant. Copiez sehha-ai-server/.env.example vers "
        "sehha-ai-server/.env et renseignez AI_SERVER_TOKEN "
        "(même valeur que OCR_API_KEY / SPEECH_TO_TEXT_KEY / LLM_API_KEY côté backend Laravel)."
    )

security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != EXPECTED_TOKEN:
        raise HTTPException(status_code=403, detail="Token invalide")
    return credentials.credentials
