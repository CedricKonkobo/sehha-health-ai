import os
from dotenv import load_dotenv

load_dotenv()

# LLM - fallback automatique : Groq (cloud, quota gratuit) -> Ollama (local, illimite)
# Renseigner GROQ_API_KEY dans .env (l'ancienne cle commitee ici etait expiree).
# Vide -> le wrapper saute Groq et passe directement sur Ollama.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_MODEL_GROQ = os.getenv("LLM_MODEL_GROQ", "llama-3.3-70b-versatile")
LLM_MODEL_OLLAMA = os.getenv("LLM_MODEL_OLLAMA", "qwen3:8b")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")

# ChromaDB
CHROMA_PATH = os.getenv("CHROMA_PATH", "./data/chroma_db")
COLLECTION_CONVERSATIONAL = "rag_conversationnel"
COLLECTION_CLINICAL = "rag_clinique_scoring"

# Embeddings (gratuit, local, HuggingFace)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Triage
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.70"))

# Champs obligatoires avant de pouvoir lancer le triage
REQUIRED_FIELDS = [
    "motif_principal",
    "douleur_eva",
    "duree_symptomes",
    "evolution",
    "age",
]