# routers/ocr.py
import os
import tempfile
import asyncio
from functools import partial

from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse

from services.ocr_service import extract_text_from_image, extract_text_from_pdf
from services.llm_service  import extract_medical_info

router = APIRouter(prefix="/v1/ocr", tags=["OCR"])

ALLOWED_IMAGE = {".jpg", ".jpeg", ".png", ".tiff", ".bmp", ".webp"}
ALLOWED_PDF   = {".pdf"}
MAX_MB        = int(os.getenv("OCR_MAX_MB", "20"))


@router.post("/scan")
async def scan_document(
    file: UploadFile = File(...),
    analyze: bool = Query(
        default=True,
        description="Si True, envoie le texte OCR au LLM pour extraction médicale structurée"
    ),
):
    """
    Scanne un document médical (image ou PDF) et extrait les informations.
    
    - **file** : image (jpg/png/tiff) ou PDF
    - **analyze** : active l'analyse LLM pour extraction structurée (défaut: true)
    """
    filename  = file.filename or ""
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_IMAGE | ALLOWED_PDF:
        raise HTTPException(
            status_code=415,
            detail={
                "error": "format_not_supported",
                "allowed_images": sorted(ALLOWED_IMAGE),
                "allowed_pdf": sorted(ALLOWED_PDF),
            },
        )

    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > MAX_MB:
        raise HTTPException(
            status_code=413,
            detail={"error": "file_too_large", "max_mb": MAX_MB, "received_mb": round(size_mb, 2)},
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        loop = asyncio.get_running_loop()

        # OCR dans un thread (bloquant)
        if extension in ALLOWED_PDF:
            ocr_result = await loop.run_in_executor(
                None, partial(extract_text_from_pdf, tmp_path)
            )
        else:
            ocr_result = await loop.run_in_executor(
                None, partial(extract_text_from_image, tmp_path)
            )

        response = {
            "success": True,
            "data": {
                "ocr": {
                    "text":   ocr_result["text"],
                    "pages":  ocr_result["pages"],
                    "blocks": ocr_result["blocks"],  # coords + confiance par bloc
                },
                "medical_info": None,
            }
        }

        # Analyse LLM si demandée ET si du texte a été trouvé
        if analyze and ocr_result["text"].strip():
            medical_info = await loop.run_in_executor(
                None, partial(extract_medical_info, ocr_result["text"])
            )
            response["data"]["medical_info"] = medical_info

        return JSONResponse(content=response)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "ocr_failed", "message": str(e)},
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)