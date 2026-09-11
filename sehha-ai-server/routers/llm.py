# routers/llm.py
import asyncio
from functools import partial

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from services.llm_service import chat

router = APIRouter(prefix="/v1/llm", tags=["LLM"])


class ChatRequest(BaseModel):
    prompt: str = Field(..., description="Le message / la question")
    system_prompt: str = Field(
        default="Tu es un assistant médical précis et concis.",
        description="Instruction système pour guider le modèle"
    )
    max_tokens: int  = Field(default=1024, ge=64,  le=4096)
    temperature: float = Field(default=0.3,  ge=0.0, le=1.0)


@router.post("/chat")
async def llm_chat(body: ChatRequest):
    """
    Appel générique au LLM local.
    
    Exemples d'usage :
    - Résumer un texte médical
    - Répondre à une question sur un traitement
    - Traduire une ordonnance
    - Générer un résumé de consultation
    """
    try:
        loop = asyncio.get_running_loop()
        response_text = await loop.run_in_executor(
            None,
            partial(
                chat,
                body.prompt,
                body.system_prompt,
                body.max_tokens,
                body.temperature,
            ),
        )

        return JSONResponse(content={
            "success": True,
            "data": {
                "response":    response_text,
                "prompt_len":  len(body.prompt),
            }
        })

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "llm_failed", "message": str(e)},
        )