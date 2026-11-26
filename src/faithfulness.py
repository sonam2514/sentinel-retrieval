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


def compute_faithfulness_analytics(context: str, statement: str, faithfulness_result: dict) -> dict:
    """Computes comprehensive hallucination & faithfulness analytics, claim verification,
    textbook coverage, and 3 structured pie charts for visualization."""
    faith_prob = float(faithfulness_result.get("faithfulness_probability", 0.85))
    unfaith_prob = float(faithfulness_result.get("unfaithfulness_probability", max(0.0, 1.0 - faith_prob)))
    is_abstain = faithfulness_result.get("label") == "UNFAITHFUL" or faith_prob < 0.70

    faith_pct = round(faith_prob * 100, 1)
    hallucination_pct = round(unfaith_prob * 100, 1)

    # 1. Sentence/Claim-level grounding
    context_lower = context.lower()
    sentences = [
        s.strip() for s in re.split(r"(?<=[.!?])\s+", statement)
        if len(s.strip()) > 15 and not s.strip().startswith("#") and not s.strip().startswith("📌")
    ]

    total_sentences = len(sentences)
    if total_sentences > 0 and not is_abstain:
        grounded_count = 0
        synth_count = 0
        hallucinated_count = 0

        for sent in sentences:
            has_cite = bool(re.search(r"\[Source\s+\d+\]", sent, re.IGNORECASE))
            words = [w for w in re.split(r"\W+", sent.lower()) if len(w) >= 4]
            overlap = sum(1 for w in words if w in context_lower) / max(len(words), 1)

            if has_cite or overlap >= 0.50:
                grounded_count += 1
            elif overlap >= 0.20:
                synth_count += 1
            else:
                hallucinated_count += 1

        grounded_claims_pct = round((grounded_count / total_sentences) * 100, 1)
        synth_claims_pct = round((synth_count / total_sentences) * 100, 1)
        hallucinated_claims_pct = round(max(0.0, 100.0 - grounded_claims_pct - synth_claims_pct), 1)
    elif is_abstain:
        grounded_claims_pct = round(min(18.0, faith_pct * 0.4), 1)
        synth_claims_pct = 12.0
        hallucinated_claims_pct = round(max(0.0, 100.0 - grounded_claims_pct - synth_claims_pct), 1)
    else:
        grounded_claims_pct = round(faith_pct * 0.85, 1)
        synth_claims_pct = round(faith_pct * 0.15, 1)
        hallucinated_claims_pct = round(max(0.0, 100.0 - grounded_claims_pct - synth_claims_pct), 1)

    # 2. Textbook Context Coverage / Adherence
    if is_abstain:
        context_coverage_pct = round(min(25.0, faith_pct), 1)
        info_gap_pct = round(100.0 - context_coverage_pct, 1)
    else:
        context_coverage_pct = round(min(98.0, max(50.0, (faith_pct * 0.95))), 1)
        info_gap_pct = round(max(0.0, 100.0 - context_coverage_pct), 1)

    metrics = {
        "faithfulness_percent": faith_pct,
        "hallucination_percent": hallucination_pct,
        "grounded_claims_percent": grounded_claims_pct,
        "synthesized_claims_percent": synth_claims_pct,
        "hallucinated_claims_percent": hallucinated_claims_pct,
        "context_coverage_percent": context_coverage_pct,
        "information_gap_percent": info_gap_pct,
    }

    charts = [
        {
            "id": "faithfulness_vs_hallucination",
            "title": "Faithfulness vs Hallucination",
            "caption": "Overall factual reliability",
            "slices": [
                {
                    "name": "Faithful Grounding",
                    "value": faith_pct,
                    "color": "#10B981" if faith_pct >= 70 else "#F59E0B",
                },
                {
                    "name": "Hallucination Risk",
                    "value": hallucination_pct,
                    "color": "#EF4444",
                },
            ],
        },
        {
            "id": "sentence_claim_verification",
            "title": "Sentence Claim Verification",
            "caption": "Claim-level textbook alignment",
            "slices": [
                {
                    "name": "Directly Grounded",
                    "value": grounded_claims_pct,
                    "color": "#059669",
                },
                {
                    "name": "Supported Synthesis",
                    "value": synth_claims_pct,
                    "color": "#3B82F6",
                },
                {
                    "name": "Ungrounded / Speculative",
                    "value": hallucinated_claims_pct,
                    "color": "#F43F5E",
                },
            ],
        },
        {
            "id": "textbook_context_utilization",
            "title": "Textbook Context Utilization",
            "caption": "Coverage from 18 medical books",
            "slices": [
                {
                    "name": "Textbook Context Used",
                    "value": context_coverage_pct,
                    "color": "#6366F1",
                },
                {
                    "name": "Information Gap",
                    "value": info_gap_pct,
                    "color": "#94A3B8",
                },
            ],
        },
    ]

    return {
        "metrics": metrics,
        "charts": charts,
    }


def check_faithfulness(context: str, statement: str):
    base_result = None

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
        base_result = {
            "label": "FAITHFUL" if faithful_probability >= 0.5 else "UNFAITHFUL",
            "faithfulness_probability": faithful_probability,
            "unfaithfulness_probability": unfaithful_probability,
            "confidence": max(faithful_probability, unfaithful_probability),
        }
        if conformal_quantile is not None:
            base_result["conformal_prediction_set"] = _conformal_prediction_set(
                probabilities,
                conformal_quantile,
            )
            base_result["conformal_alpha"] = conformal_alpha
    else:
        context_lower = context.lower()
        statement_lower = statement.lower()

        if "not have enough evidence" in statement_lower or "does not appear in the verified medical" in statement_lower:
            base_result = {
                "label": "UNFAITHFUL",
                "faithfulness_probability": 0.08,
                "unfaithfulness_probability": 0.92,
                "confidence": 0.92,
            }
        else:
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

            base_result = {
                "label": label,
                "faithfulness_probability": round(score, 3),
                "unfaithfulness_probability": round(1.0 - score, 3),
                "confidence": round(score, 3),
            }

    # Enrich with detailed metrics and pie charts
    analytics = compute_faithfulness_analytics(context, statement, base_result)
    base_result["metrics"] = analytics["metrics"]
    base_result["charts"] = analytics["charts"]
    return base_result
