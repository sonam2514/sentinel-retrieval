from src.retrieve import retrieve
from src.llm import answer_question
from src.faithfulness import check_faithfulness

FAITHFULNESS_THRESHOLD = 0.70


def sentinel(question: str, top_k: int = 3):


    chunks = retrieve(
        question,
        top_k=top_k
    )

    if not chunks:
        return {
            "question": question,
            "decision": "ABSTAIN",
            "reason": "No medical evidence was retrieved."
        }


    answer = answer_question(
        question,
        chunks
    )


    context_parts = []

    for number, chunk in enumerate(chunks, start=1):

        text = str(
            chunk.get("text", "")
        ).strip()

        title = str(
            chunk.get("title", "unknown source")
        )

        if text:
            context_parts.append(
                f"[Source {number}: {title}]\n{text}"
            )

    context = "\n\n".join(context_parts)


    faithfulness = check_faithfulness(
        context=context,
        statement=answer
    )

    if (
        faithfulness["faithfulness_probability"]
        >= FAITHFULNESS_THRESHOLD
    ):
        decision = "ANSWER"
    else:
        decision = "ABSTAIN"

    return {
        "question": question,
        "retrieved_chunks": chunks,
        "answer": answer,
        "faithfulness_probability":
            faithfulness["faithfulness_probability"],
        "unfaithfulness_probability":
            faithfulness["unfaithfulness_probability"],
        "classifier_label":
            faithfulness["label"],
        "decision": decision
    }
