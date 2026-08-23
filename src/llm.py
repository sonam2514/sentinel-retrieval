"""Grounded LLM integration for Sentinel.

The LLM receives retrieved chunks and is explicitly restricted to those
chunks. Ollama must be running locally, for example::

    ollama run llama3.2:3b
"""

from __future__ import annotations

from typing import Any, Mapping, Sequence

import requests


OLLAMA_URL = "http://localhost:11434"
MODEL = "llama3.2:3b"


class LLMError(RuntimeError):
    """Raised when the Ollama request fails."""


def _build_context(chunks: Sequence[Mapping[str, Any]]) -> str:
    sources = []
    for number, chunk in enumerate(chunks, start=1):
        text = str(chunk.get("text", "")).strip()
        if text:
            title = str(chunk.get("title", "unknown source"))
            sources.append(f"[Source {number}: {title}]\n{text}")
    return "\n\n".join(sources)


def answer_question(
    question: str,
    chunks: Sequence[Mapping[str, Any]],
    *,
    model: str = MODEL,
    ollama_url: str = OLLAMA_URL,
    timeout: float = 120.0,
    session: requests.Session | None = None,
) -> str:
    """Generate an answer from retrieved chunks only.

    ``chunks`` accepts the dictionaries returned by ``retrieve.retrieve``.
    """
    context = _build_context(chunks)
    if not context:
        raise LLMError("No retrieved context was provided")

    prompt = (
        "Answer the question using only the retrieved sources below. "
        "Do not use outside knowledge. If the sources do not contain the answer, "
        "say exactly: I do not have enough evidence to answer this question. "
        "Cite supporting sources as [Source N].\n\n"
        f"Question: {question}\n\nRetrieved sources:\n{context}"
    )

    client = session or requests.Session()
    try:
        response = client.post(
            f"{ollama_url.rstrip('/')}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=timeout,
        )
        response.raise_for_status()
        answer = str(response.json()["response"]).strip()
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        raise LLMError(f"Ollama request failed: {exc}") from exc

    if not answer:
        raise LLMError("Ollama returned an empty answer")
    return answer


def answer_with_retrieval(question: str, top_k: int = 3) -> str:
    """Retrieve evidence and generate a grounded answer in one call."""
    from src.retrieve import retrieve

    return answer_question(question, retrieve(question, top_k=top_k))
