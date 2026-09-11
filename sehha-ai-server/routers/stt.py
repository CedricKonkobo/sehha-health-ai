# routers/stt.py
import os, tempfile, asyncio
from functools import partial
from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

router = APIRouter(prefix="/v1/stt", tags=["STT"])

# Sera injecté par main.py au démarrage
whisper_model: WhisperModel | None = None

LANGUAGE      = os.getenv("WHISPER_LANGUAGE", "fr")
MAX_MB        = int(os.getenv("WHISPER_MAX_MB", "50"))
ALLOWED_EXT   = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".webm"}


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str  = Query(default=LANGUAGE),
    task: str      = Query(default="transcribe"),
    word_timestamps: bool = Query(default=False),
):
    filename  = audio.filename or ""
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXT:
        raise HTTPException(status_code=415, detail={"error": "format_not_supported"})

    content = await audio.read()
    if len(content) / 1024 / 1024 > MAX_MB:
        raise HTTPException(status_code=413, detail={"error": "file_too_large"})

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        loop   = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            partial(_transcribe_sync, tmp_path, language, task, word_timestamps),
        )
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": str(e)})
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _transcribe_sync(path, language, task, word_timestamps):
    segments, info = whisper_model.transcribe(
        path, language=language, task=task,
        word_timestamps=word_timestamps,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
    )
    text_parts, words_data = [], []
    for seg in segments:
        text_parts.append(seg.text.strip())
        if word_timestamps and seg.words:
            for w in seg.words:
                words_data.append({"word": w.word, "start": round(w.start,3), "end": round(w.end,3)})

    return {
        "success": True,
        "data": {
            "text":     " ".join(text_parts),
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "duration": round(info.duration, 2),
            "words":    words_data or None,
        }
    }