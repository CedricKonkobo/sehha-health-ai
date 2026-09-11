# services/llm_service.py
"""
Service LLM avec llama-cpp-python.
Utilisé pour l'OCR médical ET pour d'autres tâches génériques.
"""

import os
from llama_cpp import Llama

MODEL_PATH   = os.getenv("LLM_MODEL_PATH", "models/mistral-7b-instruct-v0.2.Q4_K_M.gguf")
N_CTX        = int(os.getenv("LLM_CTX",     "4096"))   # taille contexte
N_GPU_LAYERS = int(os.getenv("LLM_GPU_LAYERS", "-1"))    # 0=CPU, -1=tout sur GPU

_llm: Llama | None = None


def get_llm() -> Llama:
    global _llm
    if _llm is None:
        print(f"Chargement LLM : {MODEL_PATH}")
        _llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=N_CTX,
            n_gpu_layers=N_GPU_LAYERS,
            verbose=False,
        )
        print("LLM prêt.")
    return _llm


def chat(
    prompt: str,
    system_prompt: str = "Tu es un assistant médical précis et concis.",
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> str:
    """
    Appel générique au LLM.
    Utilisable pour n'importe quelle tâche : résumé, extraction, Q&A...
    """
    llm = get_llm()

    # Format instruction Mistral : <s>[INST] <<SYS>>\n{system}\n<</SYS>>\n{user}[/INST]
    formatted_prompt = (
        f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]"
    )

    output = llm(
        formatted_prompt,
        max_tokens=max_tokens,
        temperature=temperature,
        stop=["</s>", "[INST]"],
    )

    return output["choices"][0]["text"].strip()


def extract_medical_info(ocr_text: str) -> dict:
    """
    Cas d'usage spécifique : analyse un texte OCR médical
    et retourne les informations structurées pour l'historique patient.
    """
    prompt = f"""Voici le texte extrait d'un document médical par OCR :

<document>
{ocr_text}
</document>

Extrais les informations suivantes en JSON valide UNIQUEMENT (pas d'explication) :
{{
  "type_document": "ordonnance|analyse|compte_rendu|autre",
  "date": "YYYY-MM-DD ou null",
  "medecin": "nom ou null",
  "patient": "nom ou null",
  "diagnostics": ["liste des diagnostics"],
  "medicaments": [
    {{"nom": "...", "dosage": "...", "duree": "..."}}
  ],
  "analyses": [
    {{"nom": "...", "valeur": "...", "unite": "...", "normal": true/false/null}}
  ],
  "notes": "autres informations importantes ou null"
}}"""

    raw = chat(
        prompt=prompt,
        system_prompt="Tu es un assistant médical. Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication.",
        temperature=0.1,   # très bas pour extraction structurée
        max_tokens=1024,
    )

    # Nettoyage et parsing JSON
    import json, re
    raw = re.sub(r"```json|```", "", raw).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Si le LLM n'a pas respecté le format, on retourne le brut
        return {"raw_extraction": raw, "parse_error": True}