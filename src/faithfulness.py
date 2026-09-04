from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


MODEL_PATH = str(Path(__file__).resolve().parents[1] / "models" / "sentinel_faithfulness_classifier")


print("Loading faithfulness classifier...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_PATH
)

model.eval()

print("Faithfulness classifier ready.")


def check_faithfulness(context: str, statement: str):

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