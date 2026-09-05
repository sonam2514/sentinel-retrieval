from src.retrieve import retrieve
from src.llm import answer_question
from src.faithfulness import check_faithfulness
from src.document_processor import extract_text_from_file, chunk_document_text

FAITHFULNESS_THRESHOLD = 0.70


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
        # Extract first 150 chars of key patient findings to enrich search against MedRAG
        p_snippet = patient_chunks[0].get("text", "")[:200].replace("\n", " ")
        textbook_query = f"{effective_question} {p_snippet}".strip()

    # Retrieve from MedRAG textbooks
    medrag_chunks = retrieve(
        textbook_query,
        top_k=top_k
    )

    all_chunks = patient_chunks + medrag_chunks

    if not all_chunks:
        return {
            "question": effective_question,
            "retrieved_chunks": [],
            "decision": "ABSTAIN",
            "reason": "No medical evidence was retrieved.",
            "faithfulness_probability": 0.0,
            "unfaithfulness_probability": 1.0,
            "classifier_label": "UNFAITHFUL",
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

    if (
        not is_abstain_text
        and not all_low_confidence
        and faithfulness["faithfulness_probability"] >= FAITHFULNESS_THRESHOLD
    ):
        decision = "ANSWER"
        reason = None
    else:
        decision = "ABSTAIN"
        faithfulness["faithfulness_probability"] = min(faithfulness["faithfulness_probability"], 0.15)
        faithfulness["unfaithfulness_probability"] = round(1.0 - faithfulness["faithfulness_probability"], 3)
        faithfulness["label"] = "UNFAITHFUL"
        if is_abstain_text or all_low_confidence:
            reason = (
                "Non-medical or out-of-domain query. Verified MedRAG textbooks contain no evidence. "
                "Sentinel automatically abstains to prevent ungrounded generation."
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
        "decision": decision,
        "reason": reason,
    }
