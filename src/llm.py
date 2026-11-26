"""Grounded LLM integration for Sentinel.

The LLM receives retrieved chunks from medical textbooks and is explicitly restricted to those
chunks. Ollama can be running locally with models like llama3.2:3b, qwen3.5:4b, etc.
"""

from __future__ import annotations

import os
import re
from typing import Any, Mapping, Sequence

import requests


OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")


class LLMError(RuntimeError):
    """Raised when the Ollama request fails."""


def _detect_ollama_model(ollama_url: str = OLLAMA_URL, preferred: str = MODEL) -> str:
    """Detects available model in Ollama. Uses preferred model if present,
    otherwise chooses the first available local model (e.g. qwen3.5:4b)."""
    try:
        resp = requests.get(f"{ollama_url.rstrip('/')}/api/tags", timeout=2.0)
        if resp.status_code == 200:
            models = resp.json().get("models", [])
            names = [m.get("name") for m in models if m.get("name")]
            if names:
                if preferred in names:
                    return preferred
                # Prefer models matching common LLM architectures
                for n in names:
                    if any(arch in n.lower() for arch in ("qwen", "llama", "mistral", "phi", "gemma")):
                        return n
                return names[0]
    except Exception:
        pass
    return preferred


def _build_context(chunks: Sequence[Mapping[str, Any]]) -> str:
    sources = []
    for number, chunk in enumerate(chunks, start=1):
        text = str(chunk.get("text", "")).strip()
        if text:
            title = str(chunk.get("title", "unknown source"))
            sources.append(f"[Source {number}: {title}]\n{text}")
    return "\n\n".join(sources)


def _generate_extractive_summary(
    question: str,
    chunks: Sequence[Mapping[str, Any]]
) -> str:
    """Generates a patient-friendly plain-English synthesis from the retrieved chunks
    when Ollama local LLM is offline or not responding."""
    patient_chunks = [c for c in chunks if c.get("is_patient_report")]

    sections = []

    if patient_chunks:
        from src.document_processor import analyze_clinical_report
        p_text = "\n\n".join(str(c.get("text", "")) for c in patient_chunks)
        first_title = str(patient_chunks[0].get("title", "your report"))
        filename = first_title.replace("Patient Document: ", "").replace("📄 Uploaded Source: ", "").split(" (Part")[0].strip()
        return analyze_clinical_report(p_text, filename=filename)
    else:
        # Check if chunks are out of domain or low confidence without patient doc
        all_low = all(c.get("confidence") == "low" or c.get("is_out_of_domain") for c in chunks)
        if all_low:
            return "I do not have enough evidence to answer this question. The query does not appear in the verified medical textbooks."

        # Standard query without document
        sections.append(
            f"📌 Quick Summary in Plain English:\n"
            f"Here is an easy-to-understand, evidence-based guide regarding your query: \"{question}\"."
        )

        tb_bullets = []
        for idx, c in enumerate(chunks, start=1):
            raw = c.get("text", "")
            sentences = [s.strip() for s in raw.split(".") if len(s.strip()) > 20][:2]
            if sentences:
                tb_bullets.append(f"• {'. '.join(sentences)}. [Source {idx}]")

        sections.append("🔍 Key Facts from Medical Textbooks Explained Simply:\n" + "\n".join(tb_bullets))

        sections.append(
            "💡 What Medical Experts Recommend:\n"
            "If you or a loved one are experiencing persistent or worrying symptoms, the safest step is to discuss them directly with your healthcare provider for an individualized evaluation."
        )

        sections.append(
            "🩺 Helpful Questions to Ask Your Doctor:\n"
            "• What is the most likely cause of my symptoms?\n"
            "• What preventive steps or treatment options are safest for me?"
        )

    return "\n\n".join(sections)


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

    has_patient_doc = any(chunk.get("is_patient_report") for chunk in chunks)

    if has_patient_doc:
        prompt = (
            "You are Sentinel, a compassionate, expert medical assistant helping everyday people understand health information.\n"
            "A patient's clinical document/report has been provided alongside verified medical reference textbooks.\n"
            "Provide a CLEAR, PATIENT-FRIENDLY, EASY-TO-UNDERSTAND clinical explanation that tells the patient directly WHAT PROBLEM THEY HAVE based on their numbers.\n\n"
            "Guidelines:\n"
            "- Speak in plain, warm, everyday English. Avoid dense medical jargon; if you mention a medical term, immediately explain what it means in simple everyday terms.\n"
            "- Clearly diagnose the primary health issue in the first section. Do not speak generically—tell them plainly what condition their report points to.\n"
            "- Clearly point out which numbers or findings are abnormal or concerning, their healthy target ranges, and what they mean for the body.\n"
            "- Always cite the source with [Source N] immediately after each fact or finding.\n\n"
            "Structure your answer with these exact sections:\n\n"
            "🚨 Primary Health Issue Identified:\n"
            "State directly in 1-2 sentences what health condition or diagnosis the patient has based on their report numbers (e.g. Type 2 Diabetes, High Cholesterol, Hypertension, Anemia, etc.). [Source N]\n\n"
            "⚠️ What's Wrong in Your Report (Abnormal Test Numbers):\n"
            "Clear bullet points formatted as:\n"
            "• **Test Name: Value** ➔ HIGH / ELEVATED / LOW (Healthy target: range)\n"
            "  What this means: [1-sentence simple explanation] [Source N]\n\n"
            "🩺 What Problem This Causes in Your Body (In Plain English):\n"
            "Explain in simple, everyday words what happens inside the body when these levels are abnormal and how it relates to symptoms like fatigue or numbness. [Source N]\n\n"
            "💡 Immediate Next Steps & What to Do:\n"
            "Practical steps including prompt physician evaluation, dietary changes, and symptom tracking. [Source N]\n\n"
            "💬 Exact Questions to Ask Your Doctor at Your Next Visit:\n"
            "3-4 clear, actionable questions formatted as:\n"
            "1. \"Doctor, my report shows...\"\n\n"
            f"Question: {question}\n\nRetrieved sources:\n{context}"
        )
    else:
        prompt = (
            "You are Sentinel, a compassionate, expert medical assistant helping everyday people understand medical topics.\n"
            "Provide a CLEAR, EASY-TO-UNDERSTAND, PATIENT-FRIENDLY clinical synthesis answering the question using ONLY the retrieved medical textbook sources below.\n\n"
            "Guidelines:\n"
            "- Speak in plain, accessible everyday English that anyone without medical training can understand.\n"
            "- Avoid overly technical jargon; if you mention a medical term, immediately explain what it means in simple terms.\n"
            "- Always cite the source with [Source N] immediately following every factual statement.\n"
            "- Do NOT speculate or use outside knowledge. If the retrieved sources do not contain sufficient evidence, say exactly: I do not have enough evidence to answer this question.\n\n"
            "Structure your response with these clear sections:\n\n"
            "📌 Quick Summary in Plain English:\n"
            "A simple, clear overview answering the question directly in 2-3 sentences.\n\n"
            "🔍 Common Signs, Symptoms, or Key Facts:\n"
            "Bullet points explaining the main symptoms, causes, or mechanisms in everyday terms.\n\n"
            "💡 What Medical Experts Recommend & Next Steps:\n"
            "Standard care, lifestyle suggestions, or treatment concepts described in the reference books.\n\n"
            "🩺 When to Seek Medical Care / Questions for Your Doctor:\n"
            "Practical advice on red flags or what to ask a healthcare professional.\n\n"
            f"Question: {question}\n\nRetrieved sources:\n{context}"
        )

    # If all chunks are out-of-domain / low confidence and no patient doc, abstain immediately
    if not has_patient_doc and all(c.get("confidence") == "low" or c.get("is_out_of_domain") for c in chunks):
        return "I do not have enough evidence to answer this question. The query does not appear in the verified medical textbooks."

    # Detect active model if the default is requested
    resolved_model = model
    if model == MODEL:
        resolved_model = _detect_ollama_model(ollama_url, preferred=MODEL)

    client = session or requests.Session()
    try:
        response = client.post(
            f"{ollama_url.rstrip('/')}/api/generate",
            json={"model": resolved_model, "prompt": prompt, "stream": False},
            timeout=(3.0, timeout),
        )
        response.raise_for_status()
        raw_answer = str(response.json().get("response", "")).strip()
        # Clean any reasoning tokens from thinking models (e.g. <think>...</think>)
        answer = re.sub(r"<think>.*?</think>", "", raw_answer, flags=re.DOTALL).strip()
        if answer:
            return answer
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        print(f"[LLM] Ollama request to model '{resolved_model}' failed ({exc}), generating extractive clinical summary...")
        return _generate_extractive_summary(question, chunks)

    return _generate_extractive_summary(question, chunks)


def answer_with_retrieval(question: str, top_k: int = 3) -> str:
    """Retrieve evidence and generate a grounded answer in one call."""
    from src.retrieve import retrieve

    return answer_question(question, retrieve(question, top_k=top_k))
