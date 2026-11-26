import json
import math
from pathlib import Path
import re


MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "sentinel_roberta_lora_context"
CONFORMAL_PATH = MODEL_PATH / "conformal.json"
LEGACY_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "sentinel_faithfulness_classifier"
LABELS = ("UNFAITHFUL", "FAITHFUL")

tokenizer = None
model = None
conformal_alpha = None
conformal_quantile = None
device = None


def _load_conformal_config(path: Path) -> tuple[float, float]:
    with path.open(encoding="utf-8") as config_file:
        config = json.load(config_file)

    alpha = config.get("alpha")
    quantile = config.get("quantile")
    labels = config.get("labels")
    if config.get("method") != "split_conformal_classification":
        raise ValueError(f"Unsupported conformal method in {path}")
    if not isinstance(alpha, (int, float)) or not math.isfinite(alpha) or not 0 < alpha < 1:
        raise ValueError(f"Invalid conformal alpha in {path}")
    if not isinstance(quantile, (int, float)) or not math.isfinite(quantile) or not 0 <= quantile <= 1:
        raise ValueError(f"Invalid conformal quantile in {path}")
    if labels != {"0": "UNFAITHFUL", "1": "FAITHFUL"}:
        raise ValueError(f"Unexpected class labels in {path}")

    return float(alpha), float(quantile)


def _conformal_prediction_set(probabilities: list[float], quantile: float) -> list[str]:
    return [
        label
        for label, probability in zip(LABELS, probabilities)
        if 1.0 - probability <= quantile
    ]


if MODEL_PATH.exists():
    try:
        import torch
        from peft import AutoPeftModelForSequenceClassification
        from transformers import AutoTokenizer

        conformal_alpha, conformal_quantile = _load_conformal_config(CONFORMAL_PATH)
        tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
        model = AutoPeftModelForSequenceClassification.from_pretrained(str(MODEL_PATH))
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval()
        print(
            "[Faithfulness] RoBERTa+LoRA loaded with split-conformal calibration "
            f"(alpha={conformal_alpha}, quantile={conformal_quantile})."
        )
    except Exception as exc:
        tokenizer = None
        model = None
        conformal_alpha = None
        conformal_quantile = None
        print(f"[Faithfulness] RoBERTa+LoRA could not be loaded ({exc}). Using grounding fallback.")
elif LEGACY_MODEL_PATH.exists():
    try:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        tokenizer = AutoTokenizer.from_pretrained(str(LEGACY_MODEL_PATH))
        model = AutoModelForSequenceClassification.from_pretrained(str(LEGACY_MODEL_PATH))
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        model.eval()
        print("[Faithfulness] Legacy local classifier loaded (no conformal calibration).")
    except Exception as exc:
        tokenizer = None
        model = None
        print(f"[Faithfulness] Local classifier could not be loaded ({exc}). Using grounding fallback.")


def check_faithfulness(context: str, statement: str):
    if model is not None and tokenizer is not None:
        import torch

        inputs = tokenizer(
            context,
            statement,
            return_tensors="pt",
            truncation=True,
            max_length=384 if conformal_quantile is not None else 512,
        ).to(device)

        with torch.inference_mode():
            outputs = model(**inputs)

        probabilities = torch.softmax(outputs.logits, dim=-1)[0].cpu().tolist()
        unfaithful_probability = float(probabilities[0])
        faithful_probability = float(probabilities[1])
        result = {
            "label": "FAITHFUL" if faithful_probability >= 0.5 else "UNFAITHFUL",
            "faithfulness_probability": faithful_probability,
            "unfaithfulness_probability": unfaithful_probability,
            "confidence": max(faithful_probability, unfaithful_probability),
        }
        if conformal_quantile is not None:
            result["conformal_prediction_set"] = _conformal_prediction_set(
                probabilities,
                conformal_quantile,
            )
            result["conformal_alpha"] = conformal_alpha
        return result

    context_lower = context.lower()
    statement_lower = statement.lower()

    if "not have enough evidence" in statement_lower or "does not appear in the verified medical" in statement_lower:
        return {
            "label": "UNFAITHFUL",
            "faithfulness_probability": 0.08,
            "unfaithfulness_probability": 0.92,
            "confidence": 0.92,
        }

    has_citations = bool(re.search(r"\[Source\s+\d+\]", statement, re.IGNORECASE))
    statement_words = [word for word in re.split(r"\W+", statement_lower) if len(word) >= 4]
    if statement_words:
        grounded_count = sum(1 for word in statement_words if word in context_lower)
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
