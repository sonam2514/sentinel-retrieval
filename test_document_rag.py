import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import io
from PIL import Image, ImageDraw
from src.sentinel import sentinel

print("\n--- Generating synthetic patient lab scan image ---")
img = Image.new("RGB", (450, 140), color="white")
draw = ImageDraw.Draw(img)
draw.text((15, 15), "PATIENT CLINICAL REPORT: John Doe", fill="black")
draw.text((15, 40), "Fasting Blood Glucose: 168 mg/dL (High)", fill="black")
draw.text((15, 65), "HbA1c: 8.4% (Elevated)", fill="black")
draw.text((15, 90), "Blood Pressure: 138/88 mmHg | LDL: 142 mg/dL", fill="black")

buffer = io.BytesIO()
img.save(buffer, format="PNG")
file_bytes = buffer.getvalue()

print("--- Running Sentinel Dual-Grounded Ingestion & Retrieval ---")
result = sentinel(
    question="Analyze abnormal values in this report and cross-reference with medical guidelines",
    top_k=2,
    file_bytes=file_bytes,
    filename="patient_lab_results.png"
)

print("\n" + "=" * 50)
print(f"QUESTION: {result['question']}")
print("=" * 50)

print("\nRETRIEVED EVIDENCE SOURCES:")
for idx, c in enumerate(result.get("retrieved_chunks", []), start=1):
    source_tag = "[PATIENT DOCUMENT]" if c.get("is_patient_report") else "[MEDRAG TEXTBOOK]"
    print(f"\n{source_tag} Source {idx}: {c.get('title')}")
    print(f"Content: {c.get('text', '')[:220]}...")

print("\n" + "=" * 50)
print("CLINICAL SYNTHESIS:")
print("=" * 50)
print(result.get("answer"))

print("\n" + "=" * 50)
print("GUARDRAIL METRICS:")
print(f"Faithfulness Score: {result.get('faithfulness_probability') * 100:.1f}%")
print(f"Classifier Label:   {result.get('classifier_label')}")
print(f"Clinical Decision:  {result.get('decision')}")
print("=" * 50 + "\n")
