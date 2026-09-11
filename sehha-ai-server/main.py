# main.py
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

import services.ocr_service as ocr_svc
import services.llm_service as llm_svc

from routers import stt, ocr, llm
from auth import verify_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n Démarrage SEHHA AI Server\n")

    model_size   = os.getenv("WHISPER_MODEL",   "base")
    device       = os.getenv("WHISPER_DEVICE",  "auto")
    compute_type = os.getenv("WHISPER_COMPUTE", "int8")

    print(f" Whisper ({model_size})...")
    stt.whisper_model = WhisperModel(model_size, device=device, compute_type=compute_type)
    print(" Whisper prêt")

    ocr_svc.get_ocr_engine()
    llm_svc.get_llm()

    print("\nServeur prêt !\n")
    yield
    print("Arrêt du serveur.")


# ── Application principale
app = FastAPI(
    title="SEHHA AI Server",
    version="2.0.0",
    description="STT (Whisper) + OCR (PaddleOCR) + LLM (Mistral)",
    lifespan=lifespan,
)


# ── Route publique (pas de token requis) 
@app.get("/health", tags=["Health"])
async def health():
    return JSONResponse(content={
        "status": "ok",
        "services": ["stt", "ocr", "llm"],
    })


# ── Routes protégées (Bearer token obligatoire) 
from fastapi import APIRouter

protected = APIRouter(dependencies=[Depends(verify_token)])
protected.include_router(stt.router)
protected.include_router(ocr.router)
protected.include_router(llm.router)

app.include_router(protected)


# ── Lancement direct 
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8002"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)