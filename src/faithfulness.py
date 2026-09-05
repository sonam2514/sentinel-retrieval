from pathlib import Path
import re

MODEL_PATH = str(Path(__file__).resolve().parents[1] / "models" / "sentinel_faithfulness_classifier")

tokenizer = None
model = None

try:
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    if Path(MODEL_PATH).exists():
        print("Loading faithfulness classifier from local model...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)
        model.eval()
        print("Faithfulness classifier ready.")
except Exception as exc:
    print(f"[Faithfulness] PyTorch model not loaded ({exc}). Using citation grounding verification fallback.")


def check_faithfulness(context: str, statement: str):
    if model is not None and tokenizer is not None:
        import torch

        inputs = tokenizer(
            context,
            statement,
            return_tensors="pt",
            truncation=True,
            max_length=512
        )

        with torch.no_grad():
            outputs = model(**inputs)

        probabilities = torch.softmax(
            outputs.logits,
            dim=-1
        )[0]

        unfaithful_probability = probabilities[0].item()
        faithful_probability = probabilities[1].item()

        label = (
            "FAITHFUL"
            if faithful_probability >= 0.5
            else "UNFAITHFUL"
        )

        return {
            "label": label,
            "faithfulness_probability": faithful_probability,
            "unfaithfulness_probability": unfaithful_probability,
            "confidence": max(
                faithful_probability,
                unfaithful_probability
            )
        }

    # Resilient Grounding Verification Fallback:
    # Verifies that citations ([Source N]) exist and assertions align with context
    context_lower = context.lower()
    statement_lower = statement.lower()

    # If the statement is an explicit abstention or lacks evidence, return low score
    if "not have enough evidence" in statement_lower or "does not appear in the verified medical" in statement_lower:
        return {
            "label": "UNFAITHFUL",
            "faithfulness_probability": 0.08,
            "unfaithfulness_probability": 0.92,
            "confidence": 0.92,
        }

    # Check citation markers
    has_citations = bool(re.search(r"\[Source\s+\d+\]", statement, re.IGNORECASE))

    # Calculate token grounding overlap
    statement_words = [w for w in re.split(r"\W+", statement_lower) if len(w) >= 4]
    if statement_words:
        grounded_count = sum(1 for w in statement_words if w in context_lower)
        overlap_ratio = grounded_count / len(statement_words)
    else:
        overlap_ratio = 0.5

    base_score = 0.82 if has_citations else 0.45
    score = min(0.96, max(0.35, base_score + (overlap_ratio * 0.15)))

    label = "FAITHFUL" if score >= 0.70 else "UNFAITHFUL"

    return {
        "label": label,
        "faithfulness_probability": round(score, 3),
        "unfaithfulness_probability": round(1.0 - score, 3),
        "confidence": round(score, 3),
    }