import os
from dotenv import load_dotenv

load_dotenv()

# LLM (Groq - gratuit)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")

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
