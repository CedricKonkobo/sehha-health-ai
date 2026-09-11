"""
RAG: gestion ChromaDB + embeddings (gratuit, local)
2 collections : conversationnelle (guider les questions) et clinique (scoring)
"""
import chromadb
from chromadb.utils import embedding_functions
from app.config import CHROMA_PATH, COLLECTION_CONVERSATIONAL, COLLECTION_CLINICAL, EMBEDDING_MODEL

# Client persistant
_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Fonction d'embedding gratuite (HuggingFace, local)
_embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=EMBEDDING_MODEL
)


def _get_collection(name: str):
    return _client.get_or_create_collection(name=name, embedding_function=_embedding_fn)


def query_conversational_rag(query_text: str, n_results: int = 3) -> list[str]:
    """Récupère des chunks pertinents pour guider la prochaine question."""
    collection = _get_collection(COLLECTION_CONVERSATIONAL)
    if collection.count() == 0:
        return []
    results = collection.query(query_texts=[query_text], n_results=n_results)
    return results["documents"][0] if results["documents"] else []


def query_clinical_rag(query_text: str, n_results: int = 5) -> list[str]:
    """Récupère des chunks pertinents (protocoles CCMU, red flags) pour le scoring."""
    collection = _get_collection(COLLECTION_CLINICAL)
    if collection.count() == 0:
        return []
    results = collection.query(query_texts=[query_text], n_results=n_results)
    return results["documents"][0] if results["documents"] else []


def add_documents(collection_name: str, documents: list[str], metadatas: list[dict], ids: list[str]):
    """Ajoute des documents (chunks) à une collection. Utilisé par scripts/build_kb.py"""
    collection = _get_collection(collection_name)
    collection.add(documents=documents, metadatas=metadatas, ids=ids)
