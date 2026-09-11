# services/ocr_service.py
"""
Service OCR avec PaddleOCR.
Extrait le texte brut d'une image ou d'un PDF (page par page).
"""

import os
import tempfile
from pathlib import Path
from PIL import Image
import numpy as np
from paddleocr import PaddleOCR

# Initialisation unique au démarrage
# lang="fr" pour français, "en" pour anglais, "fr,en" pour les deux
_ocr_engine: PaddleOCR | None = None


def get_ocr_engine() -> PaddleOCR:
    global _ocr_engine
    if _ocr_engine is None:
        print("Chargement PaddleOCR...")
        _ocr_engine = PaddleOCR(
            use_angle_cls=True,   # détecte texte retourné/incliné
            lang="fr",         
        )
        print("PaddleOCR prêt.")
    return _ocr_engine


def extract_text_from_image(image_path: str) -> dict:
    """
    Extrait le texte d'une image.
    Retourne le texte brut + les blocs détectés avec leur confiance.
    """
    engine = get_ocr_engine()
    result = engine.ocr(image_path, cls=True)

    blocks = []
    lines = []

    # result est une liste de pages, chaque page = liste de détections
    for page in result:
        if page is None:
            continue
        for detection in page:
            # detection = [[coords], [texte, confiance]]
            coords    = detection[0]
            text      = detection[1][0]
            confidence = detection[1][1]

            # Convertir coords numpy.float32 → float Python natif
            # (JSONResponse ne peut pas sérialiser numpy.float32)
            safe_coords = [[float(pt[0]), float(pt[1])] for pt in coords]
            blocks.append({
                "text":       text,
                "confidence": round(float(confidence), 4),
                "coords":     safe_coords,
            })
            lines.append(text)

    full_text = "\n".join(lines)

    return {
        "text":   full_text,
        "blocks": blocks,
        "pages":  1,
    }


def extract_text_from_pdf(pdf_path: str) -> dict:
    """
    Extrait le texte d'un PDF page par page.
    Convertit chaque page en image puis applique l'OCR.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("PyMuPDF requis pour les PDFs : pip install pymupdf")

    doc = fitz.open(pdf_path)
    all_text  = []
    all_blocks = []
    total_pages = len(doc)

    for page_num in range(total_pages):
        page = doc[page_num]

        # Convertit la page en image haute résolution
        mat = fitz.Matrix(2.0, 2.0)   # zoom x2 pour meilleure qualité OCR
        pix = page.get_pixmap(matrix=mat)

        # Sauvegarde temporaire
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            pix.save(tmp.name)
            tmp_path = tmp.name

        try:
            page_result = extract_text_from_image(tmp_path)
            all_text.append(f"--- Page {page_num + 1} ---\n{page_result['text']}")
            for block in page_result["blocks"]:
                block["page"] = page_num + 1
                all_blocks.append(block)
        finally:
            os.unlink(tmp_path)

    doc.close()

    return {
        "text":   "\n\n".join(all_text),
        "blocks": all_blocks,
        "pages":  total_pages,
    }