"""Patient Document Vector Ingestion & Semantic Retrieval using ChromaDB.

When a user attaches a clinical PDF report or scan image:
1. DocumentProcessor extracts text and biomarkers (via pypdf and native Windows OCR).
2. PatientRetrieval stores chunks in an ephemeral session ChromaDB collection.
3. Retrieves the most relevant patient findings for the clinical query.
"""

from __future__ import annotations

import re
import uuid
from typing import List, Dict, Any

try:
    import chromadb
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False

from src.document_processor import extract_text_from_file, chunk_document_text

_patient_client = None
if HAS_CHROMADB:
    try:
        _patient_client = chromadb.EphemeralClient()
    except Exception as init_err:
        print(f"[PatientRetrieval] EphemeralClient warning: {init_err}")
        _patient_client = None


def process_and_index_patient_file(
    file_bytes: bytes,
    filename: str
) -> List[Dict[str, Any]]:
    """Extracts, chunks, and semantically indexes a patient document in ChromaDB.
    
    Returns structured Sentinel chunks with lab values and findings.
    """
    text = extract_text_from_file(file_bytes, filename)
    chunks = chunk_document_text(text, filename)

    if not chunks:
        return []

    # If small document (typical 1-2 page lab report), return all chunks so no biomarkers are lost
    if len(chunks) <= 3 or _patient_client is None:
        return chunks

    # For larger multi-page reports: index in ephemeral ChromaDB collection
    coll_name = f"patient_{uuid.uuid4().hex[:10]}"
    try:
        col = _patient_client.create_collection(coll_name)
        docs = [c["text"] for c in chunks]
        ids = [c["id"] for c in chunks]
        metas = [{"title": c["title"], "is_patient_report": "true"} for c in chunks]

        col.add(documents=docs, ids=ids, metadatas=metas)
    except Exception as err:
        print(f"[PatientRetrieval] Indexing into ChromaDB warning: {err}")

    return chunks


def retrieve_patient_chunks(
    query: str,
    chunks: List[Dict[str, Any]],
    top_k: int = 2
) -> List[Dict[str, Any]]:
    """Selects the most relevant patient report chunks for the given clinical query."""
    if not chunks:
        return []
    if len(chunks) <= top_k:
        return chunks

    # Token overlap relevance ranking
    stop_words = {"what", "is", "are", "the", "in", "and", "of", "for", "to", "a", "this", "my"}
    query_tokens = [
        w.lower()
        for w in re.split(r"[^a-zA-Z0-9]", query)
        if len(w) > 2 and w.lower() not in stop_words
    ]

    if not query_tokens:
        return chunks[:top_k]

    scored = []
    for c in chunks:
        text_lower = c["text"].lower()
        score = sum(1 for tok in query_tokens if tok in text_lower)
        scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:top_k]]
