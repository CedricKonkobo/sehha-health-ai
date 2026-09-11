#!/usr/bin/env python3
"""
Serveur HTTP local Faster Whisper pour SEHHA.
Exposé sur le port configuré (default: 8002).
"""

import os
import tempfile
import asyncio
from contextlib import asynccontextmanager
from functools import partial

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
MODEL_SIZE   = os.getenv("WHISPER_MODEL",   "base")
DEVICE       = os.getenv("WHISPER_DEVICE",  "cuda")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE", "float16")   # int8 | float16 | float32
LANGUAGE     = os.getenv("WHISPER_LANGUAGE","fr")
MAX_UPLOAD_MB = int(os.getenv("WHISPER_MAX_MB", "50"))

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm"}

# ---------------------------------------------------------------------------
# Lifespan : chargement du modèle une seule fois
# ---------------------------------------------------------------------------
model: WhisperModel | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    print(f"Chargement modèle {MODEL_SIZE} (device={DEVICE}, compute={COMPUTE_TYPE})…")
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    print( "Modèle prêt.")
    yield
    print("Arrêt du serveur.")


app = FastAPI(title="SEHHA STT Server", version="1.1.0", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Endpoint principal
# ---------------------------------------------------------------------------
@app.post("/v1/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Query(default=LANGUAGE),
    task: str = Query(default="transcribe"),         # transcribe | translate
    word_timestamps: bool = Query(default=False),
):
    """
    Transcrit un fichier audio en texte.
    Formats supportés : wav, mp3, m4a, ogg, flac, webm
    """
    # --- Validation de l'extension (plus fiable que content_type) -----------
    filename  = audio.filename or ""
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail={
                "error": "format_not_supported",
                "message": f"Extension '{extension}' non supportée.",
                "allowed": sorted(ALLOWED_EXTENSIONS),
            },
        )

    # --- Limite de taille ---------------------------------------------------
    content = await audio.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_MB:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "file_too_large",
                "message": f"Fichier trop volumineux ({size_mb:.1f} MB). Max : {MAX_UPLOAD_MB} MB.",
            },
        )

    # --- Écriture fichier temporaire ----------------------------------------
    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # --- Transcription dans un thread pool (non-bloquant) ---------------
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            partial(_run_transcription, tmp_path, language, task, word_timestamps),
        )

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "transcription_failed", "message": str(e)},
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ---------------------------------------------------------------------------
# Transcription synchrone (exécutée dans un thread séparé)
# ---------------------------------------------------------------------------
def _run_transcription(
    tmp_path: str,
    language: str,
    task: str,
    word_timestamps: bool,
) -> dict:
    segments, info = model.transcribe(
        tmp_path,
        language=language,
        task=task,
        word_timestamps=word_timestamps,   # ← activé si demandé
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
    )

    text_parts: list[str] = []
    words_data: list[dict] = []

    for segment in segments:
        text_parts.append(segment.text.strip())

        if word_timestamps and segment.words:
            for w in segment.words:
                words_data.append({
                    "word":        w.word,
                    "start":       round(w.start, 3),
                    "end":         round(w.end,   3),
                    "probability": round(w.probability, 4),
                })

    return {
        "success": True,
        "data": {
            "text":                 " ".join(text_parts),
            "language":             info.language,
            "language_probability": round(info.language_probability, 4),
            "duration":             round(info.duration, 2),
            "words":                words_data or None,
        },
        "meta": {
            "model":  MODEL_SIZE,
            "device": DEVICE,
            "task":   task,
        },
    }


# ---------------------------------------------------------------------------
# Healthcheck
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model":  MODEL_SIZE,
        "device": DEVICE,
        "ready":  model is not None,
    }


# ---------------------------------------------------------------------------
# Entrée
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.getenv("WHISPER_PORT", "8002"))
    uvicorn.run("stt_server:app", host="0.0.0.0", port=port, reload=False)