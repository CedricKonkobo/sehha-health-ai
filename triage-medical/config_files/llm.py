"""
Wrapper LLM - utilise Groq (gratuit, console.groq.com)
Modèle: llama-3.3-70b-versatile
"""
import json
from groq import Groq
from app.config import GROQ_API_KEY, LLM_MODEL

client = Groq(api_key=GROQ_API_KEY)


def call_llm(messages: list[dict], temperature: float = 0.3, json_mode: bool = False) -> str:
    """
    Appelle le LLM avec une liste de messages au format OpenAI
    [{"role": "system"/"user"/"assistant", "content": "..."}]
    """
    kwargs = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def call_llm_json(messages: list[dict], temperature: float = 0.2) -> dict:
    """Appelle le LLM et parse la réponse JSON."""
    raw = call_llm(messages, temperature=temperature, json_mode=True)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: tenter d'extraire le JSON s'il est entouré de texte
        start = raw.find("{")
        end = raw.rfind("}") + 1
        return json.loads(raw[start:end])
