"""
Provides retrieve(question) — hybrid retrieval (dense + BM25, combined via
Reciprocal Rank Fusion) over the full MedRAG/textbooks dataset (18 textbooks,
125,528 cleaned chunks), with adaptive retrieval confidence scoring.

Usage:
    from retrieve import retrieve
    results = retrieve("What are the symptoms of asthma?", top_k=3)

Each result is a dict:
    id            - chunk id
    text          - full chunk text
    title         - source textbook
    fusion_score  - combined dense+BM25 relevance score (higher = more relevant)
    confidence    - "high" / "medium" / "low" / "unknown"

IMPORTANT FOR INTEGRATION:
    Import this module ONCE, at application startup (not per-request) —
    loading the dataset, embedding model, and BM25 index takes real time.
    Reusing the same import across requests keeps things fast.
"""

import re
import statistics
import chromadb
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from datasets import load_dataset
import nltk
from nltk.corpus import stopwords

nltk.download("stopwords", quiet=True)
STOPWORDS = set(stopwords.words("english"))

print("Loading Sentinel retrieval pipeline...")

# --- Load and clean full dataset (in memory, no CSV/npy saved to disk) ---
dataset = load_dataset("MedRAG/textbooks")
df = dataset["train"].to_pandas()
df["content_length"] = df["content"].str.len()
df = df[df["content_length"] >= 50].reset_index(drop=True)

# --- Dense retrieval setup ---
_client = chromadb.PersistentClient(path="data/chroma_db")
_dense_collection = _client.get_or_create_collection(name="medical_chunks_full")
_model = SentenceTransformer("all-MiniLM-L6-v2")

# --- BM25 setup ---
def _tokenize(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = text.split()
    return [t for t in tokens if t not in STOPWORDS]

_tokenized_docs = [_tokenize(doc) for doc in df["content"]]
_bm25 = BM25Okapi(_tokenized_docs)

print("Retrieval pipeline ready.")


def _dense_search(question, top_k=10):
    """Returns ranked ids + a dict of {id: distance} for confidence scoring."""
    q_embedding = _model.encode([question]).tolist()
    results = _dense_collection.query(query_embeddings=q_embedding, n_results=top_k)
    ids = results["ids"][0]
    distances = results["distances"][0]
    return ids, dict(zip(ids, distances))


def _bm25_search_ids(question, top_k=10):
    tokenized_query = _tokenize(question)
    scores = _bm25.get_scores(tokenized_query)
    top_indices = scores.argsort()[::-1][:top_k]
    return [df.iloc[idx]["id"] for idx in top_indices]


def _reciprocal_rank_fusion(dense_ids, bm25_ids, k=60):
    scores = {}
    for rank, doc_id in enumerate(dense_ids):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (rank + k)
    for rank, doc_id in enumerate(bm25_ids):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (rank + k)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


def _compute_confidence(top_distance, all_distances):
    """
    Hybrid confidence: combines an absolute distance check (grounded in
    real testing - good matches consistently scored 0.42-0.87, bad matches
    1.47-1.67) with a relative check (is this result a clear standout
    within its own candidate pool, or just the "least bad" of a bad group).
    Both must agree for high/medium confidence - this avoids the failure
    mode where one mediocre result looks falsely confident just because
    everything else nearby was equally bad.
    """
    if top_distance is None or len(all_distances) < 2:
        return "unknown"

    mean_distance = statistics.mean(all_distances)
    std_distance = statistics.stdev(all_distances)

    if std_distance == 0:
        return "unknown"

    z_score = (mean_distance - top_distance) / std_distance

    # Absolute sanity check first - grounded in real tested distance ranges
    if top_distance >= 1.3:
        return "low"  # regardless of z-score, this is just too far to trust

    # Within a reasonable absolute range, use relative standout to refine
    if top_distance < 1.0 and z_score > 1.0:
        return "high"
    elif top_distance < 1.3 and z_score > 0.3:
        return "medium"
    else:
        return "low"


def retrieve(question: str, top_k: int = 3):
    """
    Given a medical question, return the top_k most relevant chunks using
    hybrid retrieval (dense + BM25 combined via Reciprocal Rank Fusion),
    each annotated with an adaptive confidence label.
    """
    dense_ids, distance_map = _dense_search(question, top_k=10)
    all_distances = list(distance_map.values())

    bm25_ids = _bm25_search_ids(question, top_k=10)
    fused = _reciprocal_rank_fusion(dense_ids, bm25_ids)

    results = []
    for doc_id, score in fused[:top_k]:
        row = df[df["id"] == doc_id].iloc[0]
        dense_distance = distance_map.get(doc_id)
        results.append({
            "id": doc_id,
            "text": row["content"],
            "title": row["title"],
            "fusion_score": score,
            "confidence": _compute_confidence(dense_distance, all_distances)
        })
    return results


if __name__ == "__main__":
    test_questions = [
        "What are the symptoms of asthma?",
        "What causes type 2 diabetes?",
        "What is the capital of France?",
        "How do I fix a car engine?",
    ]
    for q in test_questions:
        print(f"\n=== {q} ===")
        for r in retrieve(q):
            print(f"  [{r['confidence']}] {r['title']} | {round(r['fusion_score'], 5)} | {r['text'][:80]}")