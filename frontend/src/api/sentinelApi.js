const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Pre-computed realistic responses for testing the full Sentinel pipeline
 * without requiring the heavy local models (Ollama + ChromaDB + PyTorch) to be running.
 */
const MOCK_DATABASE = {
  asthma: {
    question: 'What are the symptoms of asthma?',
    retrieved_chunks: [
      {
        id: 'medrag-chunk-1042',
        title: "Harrison's Principles of Internal Medicine - Pulmonary Disorders",
        text: 'The hallmark symptoms of asthma include episodic dyspnea (shortness of breath), wheezing, cough (particularly nocturnal or early morning), and chest tightness. Physical examination during acute exacerbations frequently reveals expiratory wheezing across lung fields, tachypnea, and accessory respiratory muscle use.',
        fusion_score: 0.0324,
        confidence: 'high',
      },
      {
        id: 'medrag-chunk-3819',
        title: 'Current Medical Diagnosis and Treatment - Asthma Management',
        text: 'Common clinical manifestations of bronchial asthma consist of recurrent bouts of wheezing, chest tightness, breathlessness, and coughing. Symptoms are typically variable in frequency and intensity, often triggered by viral respiratory infections, cold air, exercise, or allergens.',
        fusion_score: 0.0298,
        confidence: 'high',
      },
      {
        id: 'medrag-chunk-7104',
        title: 'Nelson Textbook of Pediatrics - Allergic Diseases',
        text: 'Asthma presentation varies from mild intermittent wheezing to severe respiratory distress. Chronic cough may be the sole manifesting symptom in cough-variant asthma.',
        fusion_score: 0.0215,
        confidence: 'medium',
      },
    ],
    answer:
      `📌 Quick Summary in Plain English:
Asthma is a common, manageable lung condition where your airways become sensitive, swollen, and narrow, making it harder to move air in and out of your lungs. [Source 1]

🔍 Common Symptoms Explained Simply:
• Shortness of Breath: Feeling like you cannot catch your breath or get enough air into your lungs, which often comes and goes in waves. [Source 1]
• Wheezing: A high-pitched whistling or squeaking sound when you breathe out. [Source 1]
• Chest Tightness: A heavy, squeezing feeling across your chest that makes deep breaths feel uncomfortable. [Source 2]
• Nighttime or Early Morning Cough: A persistent cough that frequently wakes you up or gets triggered by cold air. [Source 1, Source 3]

💡 Common Triggers to Watch For:
Symptoms often flare up when exposed to triggers like cold weather, exercise, viral colds or flu, pet fur, house dust, or smoke. [Source 2]

🩺 Helpful Questions to Ask Your Doctor:
• Could an everyday controller (preventative) inhaler help stop my symptoms before they start?
• How should I use my quick-relief rescue inhaler if I suddenly feel short of breath? [Source 3]
• Would an asthma action plan help me track my breathing levels at home?`,
    faithfulness_probability: 0.942,
    unfaithfulness_probability: 0.058,
    classifier_label: 'FAITHFUL',
    decision: 'ANSWER',
  },
  insulin: {
    question: 'How are current insulin preparations produced?',
    retrieved_chunks: [
      {
        id: 'medrag-chunk-2291',
        title: "Goodman & Gilman's: The Pharmacological Basis of Therapeutics",
        text: 'Contemporary human insulin and insulin analogs are manufactured using recombinant DNA technology. Expression systems utilize genetically modified strains of Escherichia coli or Saccharomyces cerevisiae (baker’s yeast) containing human proinsulin or insulin precursor expression plasmids.',
        fusion_score: 0.0312,
        confidence: 'high',
      },
      {
        id: 'medrag-chunk-5510',
        title: 'Basic and Clinical Pharmacology - Pancreatic Hormones',
        text: 'Recombinant DNA synthesis has entirely replaced animal-derived insulin from bovine or porcine pancreas. Specific amino acid substitutions in modern analogs (e.g., lispro, aspart, glargine) modify absorption kinetics and self-association without reducing binding affinity to the insulin receptor.',
        fusion_score: 0.0284,
        confidence: 'high',
      },
    ],
    answer:
      `📌 Quick Summary in Plain English:
Modern insulin used for diabetes is no longer taken from animals like pigs or cows. Instead, it is made cleanly and safely in advanced medical laboratories to match human insulin exactly. [Source 2]

🔍 How Modern Insulin Is Made Explained Simply:
• Harmless Microorganism Helpers: Scientists use specialized, safe laboratory strains of bacteria (E. coli) or baker's yeast as tiny factories to produce pure human insulin. [Source 1]
• Pure and Identical: Because this insulin matches natural human insulin, your body accepts it easily with very low risk of allergic reactions. [Source 1]
• Tailored for Daily Life: Scientists have designed different types of insulin to fit your routine—fast-acting insulins that start working quickly with meals, and long-acting background insulins that keep your blood sugar steady for 24 hours. [Source 2]

💡 What Medical Experts Recommend:
Always discuss your daily eating and activity schedule with your healthcare team to find the exact insulin timing and dosage that fits your lifestyle. [Source 2]`,
    faithfulness_probability: 0.915,
    unfaithfulness_probability: 0.085,
    classifier_label: 'FAITHFUL',
    decision: 'ANSWER',
  },
  diabetes: {
    question: 'What causes type 2 diabetes and what are its primary risk factors?',
    retrieved_chunks: [
      {
        id: 'medrag-chunk-4011',
        title: 'Robbins and Cotran Pathologic Basis of Disease',
        text: 'Type 2 diabetes mellitus is characterized by peripheral insulin resistance paired with progressive pancreatic beta-cell secretory defect. Environmental triggers operating on a multigenic susceptibility background drive pathology.',
        fusion_score: 0.0335,
        confidence: 'high',
      },
      {
        id: 'medrag-chunk-6120',
        title: "Harrison's Endocrinology - Diabetes Mellitus",
        text: 'Major risk factors for type 2 diabetes include adiposity (particularly central/visceral obesity), sedentary lifestyle, advancing age, and familial aggregation. Metabolic syndrome components like hypertension and dyslipidemia commonly coexist.',
        fusion_score: 0.0301,
        confidence: 'high',
      },
    ],
    answer:
      `📌 Quick Summary in Plain English:
Type 2 diabetes happens when your body's cells become resistant to insulin (the hormone that helps sugar enter your cells for energy). Because sugar cannot get into your cells easily, it builds up in your bloodstream instead. [Source 1]

🔍 Primary Causes & Risk Factors Explained Simply:
• Insulin Resistance: Your pancreas still makes insulin, but muscle and liver cells stop listening to it properly, leaving sugar trapped in your blood. [Source 1]
• Carrying Extra Weight Around the Stomach: Belly fat releases signals that block insulin from working normally. [Source 2]
• Inactive Lifestyle: Moving your muscles helps them naturally soak up blood sugar for energy. Long periods of sitting make cells more resistant to insulin. [Source 2]
• Family History & Genetics: Having parents or siblings with type 2 diabetes significantly increases your chances, especially when combined with lifestyle factors. [Source 1]

💡 What Medical Guidelines Recommend:
• Daily Movement: Simple physical activity like walking for 30 minutes a day makes your cells much more responsive to insulin and brings sugar down naturally. [Source 2]
• First-Line Medication: When lifestyle changes need extra help, medications like metformin help your liver release less sugar into your blood. [Source 2]

🩺 Helpful Questions to Ask Your Doctor:
• What is my current HbA1c number, and what target should we aim for?
• Could working with a dietitian or diabetes educator help me create a realistic meal plan?`,
    faithfulness_probability: 0.928,
    unfaithfulness_probability: 0.072,
    classifier_label: 'FAITHFUL',
    decision: 'ANSWER',
  },
  metformin: {
    question: 'What is the mechanism of action of metformin in lowering blood glucose?',
    retrieved_chunks: [
      {
        id: 'medrag-chunk-3345',
        title: 'Katzung Basic & Clinical Pharmacology',
        text: 'Metformin primary mechanism involves activation of AMP-activated protein kinase (AMPK), which suppresses hepatic gluconeogenesis and lipogenesis. It also enhances insulin sensitivity in peripheral tissues and reduces intestinal glucose absorption.',
        fusion_score: 0.0341,
        confidence: 'high',
      },
    ],
    answer:
      `📌 Quick Summary in Plain English:
Metformin is usually the very first prescription pill doctors recommend for type 2 diabetes. It works gently with your body to lower blood sugar without causing dangerous low-sugar crashes. [Source 1]

🔍 How Metformin Works in Plain English:
• Tells Your Liver to Ease Up on Sugar: Your liver naturally stores sugar and releases it into your blood. Metformin activates a natural enzyme (AMPK) that tells your liver to produce less sugar, especially overnight. [Source 1]
• Helps Your Muscles Use Sugar: It makes your muscle cells more sensitive to insulin, allowing them to absorb glucose easily for energy. [Source 1]
• Safe from "Sugar Crashes": Because metformin doesn't force your pancreas to pump out extra insulin, it carries a very low risk of hypoglycemia (shaky low blood sugar) when taken on its own. [Source 1]

💡 Practical Tips for Taking Metformin:
Take it with meals (like breakfast or dinner) to prevent mild stomach upset, and have your doctor check your kidney function annually with a routine blood test. [Source 1]`,
    faithfulness_probability: 0.951,
    unfaithfulness_probability: 0.049,
    classifier_label: 'FAITHFUL',
    decision: 'ANSWER',
  },
  engine: {
    question: 'How do I fix a car engine when it overheats?',
    retrieved_chunks: [
      {
        id: 'medrag-chunk-8831',
        title: 'Emergency Medicine: A Comprehensive Study Guide',
        text: 'Hyperthermia and environmental heat exhaustion involve critical elevation of core body temperature. Internal heat dissipation failure requires rapid cooling protocols including cold water immersion, evaporative misting, and fluid resuscitation.',
        fusion_score: 0.0084,
        confidence: 'low',
      },
      {
        id: 'medrag-chunk-9112',
        title: 'Robbins and Cotran Pathologic Basis of Disease',
        text: 'Mechanical trauma to thoracic organs can occur during high-velocity motor vehicle collisions, resulting in pulmonary contusion or pericardial tamponade.',
        fusion_score: 0.0071,
        confidence: 'low',
      },
    ],
    answer:
      'I do not have enough evidence to answer this question. The retrieved medical literature discusses human hyperthermia protocols and vehicular trauma, but contains no technical documentation regarding automotive mechanical maintenance or engine cooling systems.',
    faithfulness_probability: 0.314,
    unfaithfulness_probability: 0.686,
    classifier_label: 'UNFAITHFUL',
    decision: 'ABSTAIN',
    reason:
      'Query is outside the medical domain. Low retrieval confidence detected and faithfulness score (31.4%) falls below the 70% guardrail threshold.',
  },
  france: {
    question: 'What is the capital of France and what is its population?',
    retrieved_chunks: [
      {
        id: 'medrag-chunk-9912',
        title: 'Global Health and Infectious Diseases',
        text: 'European epidemiological surveillance networks track seasonal influenza outbreaks and vaccine distribution throughout Western Europe.',
        fusion_score: 0.0062,
        confidence: 'low',
      },
    ],
    answer:
      'I do not have enough evidence to answer this question. The available medical databases do not contain non-medical geographical or demographic data.',
    faithfulness_probability: 0.221,
    unfaithfulness_probability: 0.779,
    classifier_label: 'UNFAITHFUL',
    decision: 'ABSTAIN',
    reason:
      'Non-medical query. MedRAG textbooks contain no evidence on European geography. Sentinel abstains to prevent ungrounded generation.',
  },
};

/**
 * Returns a realistic simulated response after a brief delay.
 */
function getSimulatedResponse(question, topK, uploadedFile = null) {
  // If a clinical file was uploaded, generate a dual-grounded response citing both the document and medical literature
  if (uploadedFile) {
    const fileName = uploadedFile.name || 'Clinical_Document.pdf';

    const patientChunk = {
      id: 'patient-upload-01',
      title: `📄 Uploaded Source: ${fileName}`,
      text: `[Optical Character & Table Extraction from ${fileName}]:
• Fasting Plasma Glucose: 168 mg/dL (Reference: 70–99 mg/dL; High)
• Glycated Hemoglobin (HbA1c): 8.4% (Reference: < 5.7%; Elevated)
• Total Cholesterol: 228 mg/dL (Desirable: < 200 mg/dL)
• LDL-C: 142 mg/dL (Optimal: < 100 mg/dL)
• Serum Creatinine: 1.0 mg/dL (eGFR: 88 mL/min/1.73m²)
• Blood Pressure Recorded: 138/88 mmHg
Clinical Notes: Patient reports mild numbness in bilateral lower extremities.`,
      fusion_score: 0.0452,
      confidence: 'high',
      is_patient_report: true,
    };

    const textbookChunks = [
      {
        id: 'medrag-chunk-harrison-diabetes',
        title: "Harrison's Principles of Internal Medicine - Glycemic Targets & Diabetes",
        text: "Diagnostic criteria for diabetes mellitus include an HbA1c ≥ 6.5% or fasting plasma glucose ≥ 126 mg/dL. The general glycemic target for most non-pregnant adults is HbA1c < 7.0%, which significantly attenuates the onset and progression of microvascular complications such as diabetic neuropathy, nephropathy, and retinopathy. Metformin remains the preferred initial pharmacological agent alongside structured lifestyle therapy, provided renal function (eGFR ≥ 45 mL/min) is preserved.",
        fusion_score: 0.0381,
        confidence: 'high',
      },
      {
        id: 'medrag-chunk-ada-guidelines',
        title: 'American Diabetes Association (ADA) - Comprehensive Medical Evaluation',
        text: "Patients presenting with dyslipidemia (LDL ≥ 100 mg/dL) and hypertension (> 130/80 mmHg) alongside elevated HbA1c require aggressive cardiovascular risk reduction, including moderate-to-high intensity statin therapy. Evaluation for distal symmetric polyneuropathy using 10-g monofilament testing and comprehensive visual foot inspections should be conducted at regular clinical intervals.",
        fusion_score: 0.0315,
        confidence: 'high',
      },
      {
        id: 'medrag-chunk-katzung-metformin',
        title: 'Katzung Basic & Clinical Pharmacology - Biguanides',
        text: "Metformin suppresses hepatic gluconeogenesis and activates AMPK. It enhances peripheral insulin sensitivity in skeletal muscle and reduces intestinal glucose absorption. It remains first-line pharmacotherapy for type 2 diabetes alongside cardiovascular risk reduction.",
        fusion_score: 0.0298,
        confidence: 'high',
      },
    ];

    // Source 1 is always the patient document; append at least 2 textbook chunks so [Source 2] & [Source 3] always resolve
    const numTextbooks = Math.max(2, topK);
    const chunks = [patientChunk, ...textbookChunks.slice(0, numTextbooks)];

    return {
      question,
      retrieved_chunks: chunks,
      answer:
        `🚨 Primary Health Issue Identified:
Based on the clinical data in your uploaded report (${fileName}), your primary health concern is **Type 2 Diabetes with High Cholesterol (Dyslipidemia)** [Source 1, Source 2].

⚠️ What's Wrong in Your Report (Abnormal Test Numbers):
• **Fasting Blood Glucose: 168 mg/dL** ➔ HIGH (Healthy target: 70–99 mg/dL)
  What this means: Your body is having significant difficulty clearing sugar from your blood into cells. This level indicates active diabetes that needs prompt medical care. [Source 1, Source 2]
• **HbA1c: 8.4%** ➔ HIGH (Healthy target: Under 5.7%)
  What this means: HbA1c measures your 3-month sugar average. A level of 8.4% confirms your blood sugar has been consistently elevated over the past 90 days. [Source 1, Source 2]
• **Total Cholesterol: 228 mg/dL & LDL: 142 mg/dL** ➔ HIGH (Desirable: Under 100 mg/dL)
  What this means: Extra circulating LDL particles build plaque along artery walls, increasing your risk of cardiovascular strain over time. [Source 1, Source 3]
• **Blood Pressure: 138/88 mmHg** ➔ ELEVATED (Healthy target: Under 120/80 mmHg)
  What this means: Your cardiovascular system is pumping against higher resistance than recommended. [Source 1, Source 3]
• **Reported Foot/Leg Numbness** ➔ EARLY NERVE WARNING
  What this means: Prolonged high blood sugar levels irritate sensitive nerve endings in your feet (diabetic peripheral neuropathy). [Source 1, Source 3]

🩺 What Problem This Causes in Your Body (In Plain English):
Your report shows that your body cannot easily move sugar from your blood into cells to create daily energy. Instead, excess sugar stays trapped in your bloodstream. Over time, high circulating sugar and cholesterol irritate arterial walls and irritate the sensitive nerves in your feet, causing the tingling or numbness you have experienced. [Source 1, Source 2]

💡 Immediate Next Steps & What to Do:
• See Your Doctor Promptly: Schedule a visit within the next 1–2 weeks to discuss starting or adjusting blood sugar medication (such as metformin) and cholesterol protection (such as a statin). [Source 2, Source 3]
• Cut Down on Sugars & Refined Carbs: Replace sodas, sweetened drinks, white breads, and fried snacks with leafy vegetables, whole grains, and lean proteins. [Source 2]
• Evening Foot Checks: Inspect your feet and toes every evening for any blisters, cuts, or redness, and avoid walking barefoot. [Source 3]

💬 Exact Questions to Ask Your Doctor at Your Next Visit:
1. "Doctor, my report shows elevated blood sugar and an HbA1c of 8.4%. What is our 3-month goal to bring this down?"
2. "Do I need to start a medication like metformin to protect my numbers and blood vessels?"
3. "Can we do a foot examination today to evaluate the numbness I've been feeling in my feet?"`,
      faithfulness_probability: 0.958,
      unfaithfulness_probability: 0.042,
      classifier_label: 'FAITHFUL',
      decision: 'ANSWER',
    };
  }

  const q = question.toLowerCase();

  let matchKey = null;
  if (q.includes('asthma')) matchKey = 'asthma';
  else if (q.includes('insulin')) matchKey = 'insulin';
  else if (q.includes('diabetes')) matchKey = 'diabetes';
  else if (q.includes('metformin')) matchKey = 'metformin';
  else if (q.includes('car') || q.includes('engine')) matchKey = 'engine';
  else if (q.includes('france') || q.includes('capital')) matchKey = 'france';

  if (matchKey && MOCK_DATABASE[matchKey]) {
    const mock = { ...MOCK_DATABASE[matchKey] };
    mock.question = question;
    mock.retrieved_chunks = mock.retrieved_chunks.slice(0, topK);
    return mock;
  }

  // Dynamic fallback for any other question
  const isMedical =
    /symptom|disease|cancer|heart|blood|drug|patient|therapy|infection|fever|pain|treatment|medicine|lung|brain|kidney|liver/i.test(
      question
    );

  if (isMedical) {
    return {
      question,
      retrieved_chunks: [
        {
          id: 'medrag-chunk-general-1',
          title: "Harrison's Principles of Internal Medicine",
          text: `Clinical evaluation and diagnostic findings related to "${question}". Medical literature emphasizes early evidence-based diagnosis, symptom assessment, and targeted therapeutic management based on standard clinical guidelines.`,
          fusion_score: 0.0295,
          confidence: 'high',
        },
        {
          id: 'medrag-chunk-general-2',
          title: 'Current Medical Diagnosis and Treatment',
          text: 'Pathophysiological pathways and treatment options should be tailored to individual patient presentation, monitoring for therapeutic efficacy and potential contraindications.',
          fusion_score: 0.0241,
          confidence: 'medium',
        },
      ].slice(0, topK),
      answer: `📌 Quick Summary in Plain English:
Based on verified medical textbooks, evidence-based management for "${question}" involves early recognition of symptoms, objective clinical evaluation, and personalized care. [Source 1]

🔍 Key Facts Explained Simply:
• Understanding the Underlying Cause: Medical guidelines emphasize identifying the specific biological cause of symptoms rather than just treating discomfort on the surface. [Source 1]
• Tailored Treatment: Treatment plans work best when adjusted to each person's unique overall health, age, and existing medications. [Source 2]
• Monitoring Progress: Checking in periodically with your doctor ensures therapies are working well without unwanted side effects. [Source 2]

💡 What Medical Experts Recommend:
If you are experiencing persistent, worsening, or unexplained symptoms, the safest step is to schedule an evaluation with your healthcare provider for an accurate in-person diagnosis. [Source 1]

🩺 Helpful Questions to Ask Your Doctor:
• What is the most likely cause of my symptoms?
• What diagnostic tests or blood work do you recommend?
• What lifestyle changes can I start making right away?`,
      faithfulness_probability: 0.884,
      unfaithfulness_probability: 0.116,
      classifier_label: 'FAITHFUL',
      decision: 'ANSWER',
    };
  }

  return {
    question,
    retrieved_chunks: [
      {
        id: 'medrag-chunk-out-domain',
        title: 'MedRAG Clinical Reference Textbooks',
        text: 'The retrieved medical indices do not contain relevant documentation for non-clinical or non-biomedical queries.',
        fusion_score: 0.0051,
        confidence: 'low',
      },
    ],
    answer:
      'I do not have enough evidence to answer this question. The query does not appear in the verified medical textbooks.',
    faithfulness_probability: 0.285,
    unfaithfulness_probability: 0.715,
    classifier_label: 'UNFAITHFUL',
    decision: 'ABSTAIN',
    reason:
      'Low retrieval confidence detected and faithfulness probability (28.5%) falls below the 70% guardrail threshold.',
  };
}

/**
 * Sends a question to the Sentinel backend API or uses demo simulation.
 *
 * @param {string} question - The user's query
 * @param {number} topK - Number of medical evidence chunks to retrieve
 * @param {boolean} [demoMode=false] - If true, uses pre-configured simulation
 * @param {File|null} [uploadedFile=null] - Optional clinical document (PDF or Image)
 * @returns {Promise<Object>} The Sentinel result object
 */
export async function querySentinel(question, topK = 3, demoMode = false, uploadedFile = null) {
  if (demoMode) {
    // Simulate real pipeline processing time (1.2s)
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return getSimulatedResponse(question, topK, uploadedFile);
  }

  try {
    let fetchOptions;

    if (uploadedFile) {
      // Use FormData for multipart file upload + question
      const formData = new FormData();
      formData.append('question', question.trim());
      formData.append('top_k', String(topK));
      formData.append('file', uploadedFile);

      fetchOptions = {
        method: 'POST',
        body: formData,
      };
    } else {
      // Standard JSON payload
      fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          top_k: Number(topK),
        }),
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/sentinel`, fetchOptions);

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `API Error (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.detail) errorMessage = parsed.detail;
        else if (parsed.error) errorMessage = parsed.error;
      } catch {
        if (errorBody) errorMessage = errorBody;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (err) {
    // If the backend server is unreachable (port 8000 not running)
    const isNetworkError =
      err.message === 'Failed to fetch' ||
      err.name === 'TypeError' ||
      err.message.includes('NetworkError') ||
      err.message.includes('Failed to connect');

    if (isNetworkError) {
      const enhancedError = new Error(
        'Backend server is not running on http://localhost:8000. Start the Python backend or switch to Demo Mode.'
      );
      enhancedError.isOffline = true;
      throw enhancedError;
    }
    throw err;
  }
}
