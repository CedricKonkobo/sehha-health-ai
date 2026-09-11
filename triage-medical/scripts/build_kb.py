"""
Script de construction des bases RAG (conversationnelle + clinique).
A exécuter une fois pour charger les documents médicaux dans ChromaDB.

Usage:
    python scripts/build_kb.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.rag import add_documents
from app.config import COLLECTION_CONVERSATIONAL, COLLECTION_CLINICAL

DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "medical_docs")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1600,   # ~400 tokens
    chunk_overlap=200,  # ~50 tokens
    separators=["\n\n", "\n", ". ", " "],
)


def load_and_chunk(filepath: str) -> list[str]:
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()
    return splitter.split_text(text)


def build_collection(collection_name: str, filenames: list[str]):
    documents, metadatas, ids = [], [], []
    for filename in filenames:
        filepath = os.path.join(DOCS_DIR, filename)
        if not os.path.exists(filepath):
            print(f"  [skip] {filename} introuvable")
            continue
        chunks = load_and_chunk(filepath)
        for i, chunk in enumerate(chunks):
            documents.append(chunk)
            metadatas.append({"source": filename, "chunk_index": i})
            ids.append(f"{filename}_{i}")
        print(f"  [ok] {filename} -> {len(chunks)} chunks")

    if documents:
        add_documents(collection_name, documents, metadatas, ids)
        print(f"-> {len(documents)} chunks ajoutés à '{collection_name}'\n")


if __name__ == "__main__":
    print("Construction de la base RAG conversationnelle...")
    build_collection(
        COLLECTION_CONVERSATIONAL,
        filenames=[
            "ccmu_protocoles.txt",
            "questions_par_symptome.txt",
            "has_fiches_symptomes.txt",
        ],
    )

    print("Construction de la base RAG clinique (scoring)...")
    build_collection(
        COLLECTION_CLINICAL,
        filenames=[
            "ccmu_grilles.txt",
            "manchester_triage.txt",
            "red_flags_par_pathologie.txt",
        ],
    )

    print("Terminé.")
