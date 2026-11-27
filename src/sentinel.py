from src.retrieve import retrieve
from src.llm import answer_question
from src.faithfulness import check_faithfulness, compute_faithfulness_analytics
from src.document_processor import extract_text_from_file, chunk_document_text

FAITHFULNESS_THRESHOLD = 0.70
MIN_RETRIEVAL_SCORE = 0.020


def sentinel(
    question: str,
    top_k: int = 3,
    file_bytes: bytes | None = None,
    filename: str | None = None,
):
    patient_chunks = []
    if file_bytes and filename:
        try:
            extracted_text = extract_text_from_file(file_bytes, filename)
            patient_chunks = chunk_document_text(extracted_text, filename)
        except Exception as proc_err:
            print(f"[Sentinel] Error processing attached file {filename}: {proc_err}")
            patient_chunks = [
                {
                    "id": f"upload-{filename}-error",
                    "title": f"Patient Document: {filename}",
                    "text": f"Error parsing {filename}: {proc_err}",
                    "fusion_score": 0.0500,
                    "confidence": "low",
                    "is_patient_report": True,
                }
            ]

    # Clean question text
    effective_question = (question or "").strip()
    if not effective_question and patient_chunks:
        effective_question = f"Analyze {filename} and summarize abnormal values, clinical significance, and guidance."

    # Build search query for MedRAG textbook retrieval
    textbook_query = effective_question
    if patient_chunks:
        p_snippet = patient_chunks[0].get("text", "")[:200].replace("\n", " ")
        textbook_query = f"{effective_question} {p_snippet}".strip()

    # Retrieve from MedRAG textbooks
    medrag_chunks = retrieve(
        textbook_query,
        top_k=top_k
    )

    all_chunks = patient_chunks + medrag_chunks

    if not all_chunks:
        abstain_metrics = compute_faithfulness_analytics(
            "",
            "No medical evidence was retrieved.",
            {"label": "UNFAITHFUL", "faithfulness_probability": 0.0, "unfaithfulness_probability": 1.0}
        )
        return {
            "question": effective_question,
            "retrieved_chunks": [],
            "decision": "ABSTAIN",
            "reason": "No medical evidence was retrieved.",
            "faithfulness_probability": 0.0,
            "unfaithfulness_probability": 1.0,
            "classifier_label": "UNFAITHFUL",
            "metrics": abstain_metrics["metrics"],
            "charts": abstain_metrics["charts"],
        }

    # Strict Context Validation: Short-circuit before calling Ollama if context is missing/low confidence
    max_fusion_score = max((float(c.get("fusion_score", 0.0)) for c in all_chunks), default=0.0)
    has_out_of_domain = any(c.get("is_out_of_domain") for c in medrag_chunks)
    all_low_confidence = (
        not patient_chunks
        and (has_out_of_domain or all(c.get("confidence") == "low" for c in medrag_chunks))
    )
    insufficient_context = (not patient_chunks and (max_fusion_score < MIN_RETRIEVAL_SCORE or all_low_confidence))

    if insufficient_context:
        abstain_answer = (
            "I do not have enough evidence to answer this question. "
            "The query does not appear in the verified medical textbooks."
        )
        abstain_metrics = compute_faithfulness_analytics(
            "",
            abstain_answer,
            {"label": "UNFAITHFUL", "faithfulness_probability": 0.0, "unfaithfulness_probability": 1.0}
        )
        abstain_reason = (
            "Query is outside the medical domain or not documented in verified clinical textbooks. "
            "Sentinel automatically abstains without generating ungrounded advice to prevent hallucination."
            if has_out_of_domain
            else "Insufficient verified medical evidence found (retrieval score below strict cutoff). "
                 "Sentinel automatically abstains without calling Ollama to prevent hallucination."
        )
        return {
            "question": effective_question,
            "retrieved_chunks": all_chunks,
            "answer": abstain_answer,
            "faithfulness_probability": 0.0,
            "unfaithfulness_probability": 1.0,
            "classifier_label": "UNFAITHFUL",
            "conformal_prediction_set": ["UNFAITHFUL"],
            "conformal_alpha": 0.05,
            "decision": "ABSTAIN",
            "reason": abstain_reason,
            "metrics": abstain_metrics["metrics"],
            "charts": abstain_metrics["charts"],
        }

    answer = answer_question(
        effective_question,
        all_chunks
    )

    context_parts = []
    for number, chunk in enumerate(all_chunks, start=1):
        text = str(chunk.get("text", "")).strip()
        title = str(chunk.get("title", "unknown source"))
        if text:
            context_parts.append(
                f"[Source {number}: {title}]\n{text}"
            )

    context = "\n\n".join(context_parts)

    faithfulness = check_faithfulness(
        context=context,
        statement=answer
    )

    is_abstain_text = (
        "not have enough evidence" in answer.lower()
        or "does not appear in the verified medical" in answer.lower()
    )

    all_low_confidence = (
        not patient_chunks
        and all(c.get("confidence") == "low" or c.get("is_out_of_domain") for c in medrag_chunks)
    )

    conformal_set = faithfulness.get("conformal_prediction_set")
    passes_faithfulness_gate = (
        conformal_set == ["FAITHFUL"]
        if conformal_set is not None
        else faithfulness["faithfulness_probability"] >= FAITHFULNESS_THRESHOLD
    )

    if not is_abstain_text and not all_low_confidence and passes_faithfulness_gate:
        decision = "ANSWER"
        reason = None
    else:
        decision = "ABSTAIN"
        faithfulness["faithfulness_probability"] = min(faithfulness["faithfulness_probability"], 0.15)
        faithfulness["unfaithfulness_probability"] = round(1.0 - faithfulness["faithfulness_probability"], 3)
        faithfulness["label"] = "UNFAITHFUL"
        # Recompute analytics for abstention
        recalculated = compute_faithfulness_analytics(context, answer, faithfulness)
        faithfulness["metrics"] = recalculated["metrics"]
        faithfulness["charts"] = recalculated["charts"]

        if is_abstain_text or all_low_confidence:
            reason = (
                "Non-medical or out-of-domain query. Verified MedRAG textbooks contain no evidence. "
                "Sentinel automatically abstains to prevent ungrounded generation."
            )
        elif conformal_set is not None and conformal_set != ["FAITHFUL"]:
            labels = ", ".join(conformal_set) if conformal_set else "no labels"
            reason = (
                f"Conformal prediction set is {{{labels}}}, not the singleton {{FAITHFUL}}. "
                "Sentinel automatically abstains because the result is uncertain."
            )
        else:
            pct = round(faithfulness["faithfulness_probability"] * 100)
            thresh = int(FAITHFULNESS_THRESHOLD * 100)
            reason = (
                f"Evidence alignment ({pct}%) falls below the {thresh}% safety threshold. "
                "Sentinel automatically abstains to protect clinical safety."
            )

    return {
        "question": effective_question,
        "retrieved_chunks": all_chunks,
        "answer": answer,
        "faithfulness_probability":
            faithfulness["faithfulness_probability"],
        "unfaithfulness_probability":
            faithfulness["unfaithfulness_probability"],
        "classifier_label":
            faithfulness["label"],
        "conformal_prediction_set":
            faithfulness.get("conformal_prediction_set"),
        "conformal_alpha":
            faithfulness.get("conformal_alpha"),
        "decision": decision,
        "reason": reason,
        "metrics": faithfulness.get("metrics"),
        "charts": faithfulness.get("charts"),
    }
