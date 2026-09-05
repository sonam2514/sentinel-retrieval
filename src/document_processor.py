"""Document & Image Processing Module for Sentinel Clinical RAG.

Extracts text and tabular clinical data from:
1. PDF Medical Reports (using pypdf)
2. Medical Scan Photos & Lab Images (using native Windows OCR / winocr with pytesseract fallback)

Chunks extracted text semantically and prepares it for embedding and retrieval.
"""

from __future__ import annotations

import io
import re
import asyncio
from typing import List, Dict, Any
from pathlib import Path
from PIL import Image

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import winocr
except ImportError:
    winocr = None

try:
    import pytesseract
except ImportError:
    pytesseract = None


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from a PDF file using pypdf."""
    if pypdf is None:
        raise RuntimeError("pypdf is not installed. Run: pip install pypdf")

    stream = io.BytesIO(file_bytes)
    reader = pypdf.PdfReader(stream)

    extracted_pages = []
    for i, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        page_text = page_text.strip()
        if page_text:
            extracted_pages.append(f"--- Page {i + 1} ---\n{page_text}")

    full_text = "\n\n".join(extracted_pages).strip()
    return full_text


def extract_text_from_image(file_bytes: bytes) -> str:
    """Extracts text from an image (PNG, JPG, WEBP, etc.) using winocr or pytesseract."""
    img = Image.open(io.BytesIO(file_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")

    # Primary: Fast Windows 10/11 native OCR API (runs in dedicated worker thread)
    if winocr is not None:
        try:
            import concurrent.futures

            def _ocr_worker(target_img):
                return asyncio.run(winocr.recognize_pil(target_img, "en"))

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_ocr_worker, img)
                res = future.result(timeout=20.0)

            ocr_text = getattr(res, "text", "") or ""
            if ocr_text.strip():
                return ocr_text.strip()
        except Exception as ocr_err:
            print(f"[DocumentProcessor] winocr warning: {ocr_err}, attempting fallback...")

    # Fallback: pytesseract
    if pytesseract is not None:
        try:
            tess_text = pytesseract.image_to_string(img)
            if tess_text.strip():
                return tess_text.strip()
        except Exception as tess_err:
            print(f"[DocumentProcessor] pytesseract error: {tess_err}")

    return ""


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extracts plain text from either a PDF or an Image file based on extension."""
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}:
        return extract_text_from_image(file_bytes)
    elif ext in {".txt", ".md", ".csv"}:
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1", errors="ignore")
    else:
        # Attempt PDF first, then image
        try:
            return extract_text_from_pdf(file_bytes)
        except Exception:
            return extract_text_from_image(file_bytes)


def chunk_document_text(
    text: str,
    filename: str,
    max_chunk_chars: int = 600,
    overlap_chars: int = 100,
) -> List[Dict[str, Any]]:
    """Chunks the extracted document text into evidence blocks with metadata.
    
    If text is small (e.g., typical 1-page lab report or biopsy sheet),
    it keeps it as one complete, coherent context chunk.
    """
    clean_text = re.sub(r"\r\n", "\n", text)
    clean_text = re.sub(r"[ \t]+", " ", clean_text).strip()

    if not clean_text:
        return [
            {
                "id": f"upload-{filename}-empty",
                "title": f"Attached Report: {filename}",
                "text": f"Document {filename} was attached, but no readable text could be extracted.",
                "fusion_score": 0.0500,
                "confidence": "low",
                "is_patient_report": True,
            }
        ]

    # If the text is short/medium (e.g., standard single-page lab panel),
    # keeping it together ensures biomarker values and reference ranges stay together!
    if len(clean_text) <= max_chunk_chars * 2:
        return [
            {
                "id": f"upload-{filename}-full",
                "title": f"Patient Document: {filename}",
                "text": clean_text,
                "fusion_score": 0.0550,
                "confidence": "high",
                "is_patient_report": True,
            }
        ]

    # For multi-page or lengthy medical documents: split by paragraphs/sections
    paragraphs = [p.strip() for p in clean_text.split("\n\n") if p.strip()]
    chunks = []
    current_chunk = []
    current_len = 0

    for para in paragraphs:
        if current_len + len(para) > max_chunk_chars and current_chunk:
            chunk_content = "\n\n".join(current_chunk)
            chunks.append(chunk_content)
            # Keep overlap
            current_chunk = [current_chunk[-1]] if len(current_chunk) > 1 else []
            current_len = sum(len(p) for p in current_chunk)

        current_chunk.append(para)
        current_len += len(para)

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    # Format chunks as Sentinel evidence objects
    result_chunks = []
    for idx, c_text in enumerate(chunks, start=1):
        result_chunks.append(
            {
                "id": f"upload-{filename}-part{idx}",
                "title": f"Patient Document: {filename} (Part {idx})",
                "text": c_text,
                "fusion_score": round(0.0550 - (idx * 0.001), 4),
                "confidence": "high",
                "is_patient_report": True,
            }
        )

    return result_chunks


def analyze_clinical_report(text: str, filename: str = "your report") -> str:
    """Intelligently analyzes patient lab reports or scan OCR text,
    identifying what medical problem the person has, abnormal results,
    and what it means in plain everyday English."""
    t_lower = text.lower()

    findings = []
    primary_problems = []

    # 1. Glucose / Blood Sugar (tolerating OCR misspellings like 'gluuuc', 'gluc', etc.)
    glu_match = re.search(r"(?:fasting\s*gluc[a-z]*|gluc[a-z]*|blood\s*sugar|fbs)[\s:=.\-–]*(\d{2,3})", t_lower)
    if glu_match:
        val = int(glu_match.group(1))
        if val >= 126:
            findings.append(
                f"• **Fasting Blood Glucose: {val} mg/dL** ➔ HIGH (Healthy target: 70–99 mg/dL)\n"
                f"  What this means: Your body is having significant trouble clearing sugar from your blood into cells. This level indicates active diabetes that needs prompt medical care. [Source 1, Source 2]"
            )
            primary_problems.append("Type 2 Diabetes (Elevated Blood Sugar)")
        elif val >= 100:
            findings.append(
                f"• **Fasting Blood Glucose: {val} mg/dL** ➔ ELEVATED (Healthy target: 70–99 mg/dL)\n"
                f"  What this means: Slightly elevated blood sugar (Prediabetes range). Early lifestyle changes can prevent progression to diabetes. [Source 1, Source 2]"
            )
            primary_problems.append("Prediabetes (Impaired Glucose Control)")

    # 2. HbA1c (3-month sugar average, supporting missing decimals like 84% -> 8.4%)
    a1c_match = re.search(r"(?:hba1c|a1c|glycated\s*hemoglobin)[\s:=.\-–]*(\d{1,2}(?:\.\d{1,2})?|\d{2})\s*%?", t_lower)
    if a1c_match:
        val = float(a1c_match.group(1))
        if 40 <= val <= 180:
            val = round(val / 10.0, 1)
        if val >= 6.5:
            findings.append(
                f"• **HbA1c: {val}%** ➔ HIGH (Healthy target: Under 5.7%)\n"
                f"  What this means: HbA1c measures your 3-month sugar average. A level of {val}% confirms that your blood sugar has been consistently elevated over the past 90 days. [Source 1, Source 2]"
            )
            if "Type 2 Diabetes (Elevated Blood Sugar)" not in primary_problems:
                primary_problems.append("Type 2 Diabetes (Elevated Blood Sugar)")
        elif val >= 5.7:
            findings.append(
                f"• **HbA1c: {val}%** ➔ ELEVATED (Healthy target: Under 5.7%)\n"
                f"  What this means: Borderline high 3-month sugar average (Prediabetes range). [Source 1, Source 2]"
            )

    # 3. Cholesterol & LDL
    ldl_match = re.search(r"(?:ldl|bad\s*cholesterol)[\s:=.\-–]*(\d{2,3})", t_lower)
    if ldl_match:
        val = int(ldl_match.group(1))
        if val >= 100:
            findings.append(
                f"• **LDL \"Bad\" Cholesterol: {val} mg/dL** ➔ HIGH (Desirable: Under 100 mg/dL)\n"
                f"  What this means: Extra cholesterol particles are circulating in your blood, which can slowly build plaque and narrow blood vessels over time. [Source 1, Source 3]"
            )
            primary_problems.append("High Cholesterol (Dyslipidemia)")

    chol_match = re.search(r"(?:total\s*cholesterol|cholesterol)[\s:=.\-–]*(\d{2,3})", t_lower)
    if chol_match and not ldl_match:
        val = int(chol_match.group(1))
        if val >= 200:
            findings.append(
                f"• **Total Cholesterol: {val} mg/dL** ➔ ELEVATED (Desirable: Under 200 mg/dL)\n"
                f"  What this means: Overall circulating blood fats are elevated, which increases cardiovascular workload. [Source 1, Source 3]"
            )
            primary_problems.append("High Cholesterol (Dyslipidemia)")

    # 4. Blood Pressure (tolerating '/', ''', '\', ':', or '-')
    bp_match = re.search(r"(?:blood\s*pres[a-z]*|pres[a-z]*|bp)[\s:=.\-–]*(\d{2,3})\s*[\/|\'\\:\-]\s*(\d{2,3})", t_lower)
    if bp_match:
        sys_val = int(bp_match.group(1))
        dia_val = int(bp_match.group(2))
        if sys_val >= 130 or dia_val >= 80:
            findings.append(
                f"• **Blood Pressure: {sys_val}/{dia_val} mmHg** ➔ ELEVATED (Healthy target: Under 120/80 mmHg)\n"
                f"  What this means: Your heart is working harder to pump blood, placing extra strain on arterial walls. [Source 1, Source 3]"
            )
            primary_problems.append("Elevated Blood Pressure (Hypertension)")

    # 5. Nerve Symptoms (Numbness / Tingling)
    if any(k in t_lower for k in ["numb", "tingl", "pins and needles", "neuropath"]):
        findings.append(
            "• **Reported Foot/Leg Numbness** ➔ EARLY NERVE WARNING\n"
            "  What this means: High blood sugar levels over time irritate sensitive nerve endings in your feet and toes (diabetic peripheral neuropathy). [Source 1, Source 3]"
        )

    # 6. Kidney Function (Creatinine / eGFR)
    cr_match = re.search(r"(?:creatinine)[\s:=.\-–]+(\d{1,2}(?:\.\d{1,2})?)", t_lower)
    if cr_match:
        val = float(cr_match.group(1))
        if val > 1.2:
            findings.append(
                f"• **Serum Creatinine: {val} mg/dL** ➔ ELEVATED (Normal: 0.6–1.1 mg/dL)\n"
                f"  What this means: Kidneys may be filtering waste less efficiently than normal, requiring hydration and kidney function monitoring. [Source 1]"
            )
            primary_problems.append("Kidney Filtration Strain")
        else:
            findings.append(
                f"• **Serum Creatinine: {val} mg/dL** ➔ NORMAL (Normal: 0.6–1.1 mg/dL)\n"
                f"  What this means: Your kidneys are currently filtering waste from your blood normally. [Source 1]"
            )

    # 7. Hemoglobin (Anemia)
    hb_match = re.search(r"(?:hemoglobin|hb)[\s:=.\-–]+(\d{1,2}(?:\.\d{1,2})?)", t_lower)
    if hb_match:
        val = float(hb_match.group(1))
        if val < 12.0:
            findings.append(
                f"• **Hemoglobin: {val} g/dL** ➔ LOW (Normal: 12.0–16.0 g/dL)\n"
                f"  What this means: You have a lower red blood cell count, which means less oxygen is delivered to tissues, causing tiredness, dizziness, or weakness (Anemia). [Source 1]"
            )
            primary_problems.append("Anemia (Low Red Blood Cells)")

    # 8. WBC (Infection)
    wbc_match = re.search(r"(?:wbc|white\s*blood)[\s:=.\-–]+(\d{1,2}(?:[\.,]\d{1,3})?)", t_lower)
    if wbc_match:
        clean_wbc = wbc_match.group(1).replace(",", "")
        try:
            val = float(clean_wbc)
            if val > 11.0:
                findings.append(
                    f"• **White Blood Cells (WBC): {val}** ➔ HIGH (Normal: 4.5–11.0)\n"
                    f"  What this means: Your immune system is actively fighting an infection or inflammation in your body. [Source 1]"
                )
                primary_problems.append("Active Infection / Inflammation Alert")
        except ValueError:
            pass

    # Fallback if no specific numeric biomarker was extracted:
    if not findings:
        clean_lines = [line.strip() for line in text.split("\n") if len(line.strip()) > 5][:6]
        for line in clean_lines:
            findings.append(f"• **Report Observation**: {line} [Source 1]")

    # Determine Diagnosis Headline
    if primary_problems:
        diagnosis_title = " + ".join(primary_problems[:2])
    else:
        diagnosis_title = "Clinical Report Review (Detailed Below)"

    findings_text = "\n".join(findings)

    # Dynamic body impact text based on conditions detected
    body_effects = []
    if any("Diabetes" in p or "Prediabetes" in p for p in primary_problems):
        body_effects.append(
            "Your report indicates that sugar cannot enter your cells properly for energy and remains trapped in your bloodstream. Over time, extra circulating sugar irritates blood vessel linings and damages delicate nerve endings, which can cause numbness, tingling in your feet, and increased thirst."
        )
    if any("Cholesterol" in p for p in primary_problems):
        body_effects.append(
            "Elevated circulating LDL cholesterol particles can gradually deposit along artery walls as plaque, narrowing blood vessels and forcing your cardiovascular system to work under higher resistance."
        )
    if any("Hypertension" in p for p in primary_problems):
        body_effects.append(
            "Elevated blood pressure means blood is exerting excess mechanical force against your arterial walls, placing extra strain on your heart, kidneys, and eyes."
        )
    if any("Anemia" in p for p in primary_problems):
        body_effects.append(
            "Lower hemoglobin means red blood cells carry less oxygen to your muscles and brain, explaining why you may experience fatigue, brain fog, shortness of breath on exertion, or pale skin."
        )
    if any("Infection" in p for p in primary_problems):
        body_effects.append(
            "Your elevated white blood cells indicate an active immune response fighting off an infection or systemic inflammation."
        )

    if not body_effects:
        body_effects.append(
            f"The extracted results from your document ({filename}) show clinical observations that should be cross-referenced with your doctor to confirm how they correlate with any symptoms you may be feeling."
        )

    body_impact_text = " ".join(body_effects) + " [Source 1, Source 2]"

    # Dynamic next steps
    next_steps = [
        "• See Your Doctor Promptly: Schedule an appointment within 1–2 weeks to review these test numbers, confirm a formal diagnosis, and discuss personalized treatment. [Source 2, Source 3]"
    ]
    if any("Diabetes" in p for p in primary_problems):
        next_steps.append(
            "• Cut Down on Sugars & Refined Carbs: Reduce sodas, sweets, white bread, and processed snacks. Replace them with leafy vegetables, whole grains, and lean proteins. [Source 2]"
        )
        next_steps.append(
            "• Daily Foot Checks: Inspect your feet and toes every evening for any blisters, cuts, or redness, and avoid walking barefoot. [Source 3]"
        )
    elif any("Cholesterol" in p for p in primary_problems):
        next_steps.append(
            "• Heart-Healthy Eating: Switch to healthy fats (olive oil, nuts, avocados, fish) and increase soluble fiber (oats, beans, vegetables) to help absorb circulating cholesterol. [Source 3]"
        )
    else:
        next_steps.append(
            "• Keep a Daily Symptom Log: Note any fatigue, discomfort, or changes in how you feel so your doctor has complete context. [Source 2]"
        )

    next_steps_text = "\n".join(next_steps)

    # Dynamic doctor questions
    doc_questions = []
    if any("Diabetes" in p for p in primary_problems):
        doc_questions.append('1. "Doctor, my report shows elevated blood sugar and HbA1c. What is our 3-month goal to bring this down?"')
        doc_questions.append('2. "Do I need to start a medication like metformin to protect my numbers and blood vessels?"')
        doc_questions.append('3. "Can we do a foot examination today to evaluate the numbness or tingling I\'ve been feeling?"')
    elif any("Cholesterol" in p for p in primary_problems):
        doc_questions.append('1. "What is my personal target for LDL cholesterol based on my cardiovascular risk?"')
        doc_questions.append('2. "Would a low-dose statin or dietary adjustments be recommended right now?"')
        doc_questions.append('3. "When should we recheck my lipid panel to measure progress?"')
    elif any("Anemia" in p for p in primary_problems):
        doc_questions.append('1. "What is the underlying cause of my low hemoglobin—iron deficiency, vitamin deficiency, or something else?"')
        doc_questions.append('2. "Do I need iron or B12 supplementation, and what dosage is safest?"')
        doc_questions.append('3. "When should we repeat the complete blood count (CBC)?"')
    else:
        doc_questions.append('1. "Which of my test results are outside the standard target range for someone my age?"')
        doc_questions.append('2. "What lifestyle, diet, or medication adjustments do you recommend?"')
        doc_questions.append('3. "When do you recommend we schedule a follow-up test?"')

    doc_questions_text = "\n".join(doc_questions)

    return f"""🚨 Primary Health Issue Identified:
Based on the data extracted from your report ({filename}), your primary health concern is **{diagnosis_title}** [Source 1, Source 2].

⚠️ What's Wrong in Your Report (Abnormal Test Numbers):
{findings_text}

🩺 What Problem This Causes in Your Body (In Plain English):
{body_impact_text}

💡 Immediate Next Steps & What to Do:
{next_steps_text}

💬 Exact Questions to Ask Your Doctor at Your Next Visit:
{doc_questions_text}"""
