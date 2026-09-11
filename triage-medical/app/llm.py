"""
Wrapper LLM avec fallback automatique :
1. Essaie Groq (API cloud, gratuite avec quota journalier) si GROQ_API_KEY est definie.
2. Si Groq echoue (quota depasse / 429, erreur reseau, cle absente), bascule
   automatiquement sur Ollama (local, illimite).

Modeles configures via .env : LLM_MODEL_GROQ et LLM_MODEL_OLLAMA.
"""
import json
import re
import requests
from app.config import (
    GROQ_API_KEY,
    LLM_MODEL_GROQ,
    LLM_MODEL_OLLAMA,
    OLLAMA_URL,
)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _strip_think(text: str) -> str:
    """Retire les blocs <think>...</think> emis par les modeles de raisonnement (ex: qwen3)."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _call_groq(messages: list[dict], temperature: float, json_mode: bool) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY non definie")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": LLM_MODEL_GROQ,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]


def _call_ollama(messages: list[dict], temperature: float, json_mode: bool) -> str:
    payload = {
        "model": LLM_MODEL_OLLAMA,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if json_mode:
        payload["format"] = "json"

    response = requests.post(OLLAMA_URL, json=payload, timeout=180)
    response.raise_for_status()
    return response.json()["message"]["content"]


def call_llm(messages: list[dict], temperature: float = 0.3, json_mode: bool = False) -> str:
    """
    Appelle le LLM avec une liste de messages au format OpenAI
    [{"role": "system"/"user"/"assistant", "content": "..."}]

    Essaie Groq en premier, bascule sur Ollama (local) en cas d'echec.
    """
    try:
        content = _call_groq(messages, temperature, json_mode)
        return _strip_think(content)
    except Exception as e:
        print(f"[LLM] Groq indisponible ({e}) -> bascule sur Ollama local ({LLM_MODEL_OLLAMA})")

    try:
        content = _call_ollama(messages, temperature, json_mode)
        return _strip_think(content)
    except Exception as e:
        print(f"[LLM ERROR] Ollama egalement indisponible: {e}")
        raise


def call_llm_json(messages: list[dict], temperature: float = 0.2) -> dict:
    """Appelle le LLM et parse la réponse JSON."""
    raw = call_llm(messages, temperature=temperature, json_mode=True)

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        try:
            return json.loads(raw[start:end])
        except Exception as e:
            print(f"[LLM ERROR - JSON parse failed]: {e}\nRAW: {raw}")
            raise