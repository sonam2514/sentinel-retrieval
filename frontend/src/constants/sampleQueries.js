/**
 * Sample queries designed for testing the Sentinel Retrieval pipeline.
 * Includes both valid medical queries (expected to ANSWER) and out-of-domain /
 * ungrounded queries (expected to trigger the guardrail and ABSTAIN).
 */

export const SAMPLE_QUERIES = [
  {
    id: 'asthma-symptoms',
    label: 'Asthma Symptoms',
    category: 'Clinical Medical',
    question: 'What are the symptoms of asthma?',
    topK: 3,
    expectedDecision: 'ANSWER',
    description: 'Common respiratory condition covered extensively in MedRAG textbooks.',
  },
  {
    id: 'insulin-production',
    label: 'Insulin Production',
    category: 'Biochemistry / Pharmacology',
    question: 'How are current insulin preparations produced?',
    topK: 3,
    expectedDecision: 'ANSWER',
    description: 'Detailed pharmacological query testing multi-source evidence synthesis.',
  },
  {
    id: 'diabetes-causes',
    label: 'Type 2 Diabetes',
    category: 'Clinical Medical',
    question: 'What causes type 2 diabetes and what are its primary risk factors?',
    topK: 3,
    expectedDecision: 'ANSWER',
    description: 'Etiology and risk factors covered in endocrinology chapters.',
  },
  {
    id: 'metformin-mechanism',
    label: 'Metformin MOA',
    category: 'Pharmacology',
    question: 'What is the mechanism of action of metformin in lowering blood glucose?',
    topK: 3,
    expectedDecision: 'ANSWER',
    description: 'Specific drug mechanism testing retrieval precision and citations.',
  },
  {
    id: 'car-engine-abstain',
    label: 'Fix Car Engine (Guardrail Test)',
    category: 'Out-of-Domain',
    question: 'How do I fix a car engine when it overheats?',
    topK: 3,
    expectedDecision: 'ABSTAIN',
    description: 'Non-medical query designed to verify low confidence retrieval and guardrail abstention.',
  },
  {
    id: 'capital-france-abstain',
    label: 'Capital of France (Guardrail Test)',
    category: 'Out-of-Domain',
    question: 'What is the capital of France and what is its population?',
    topK: 3,
    expectedDecision: 'ABSTAIN',
    description: 'General knowledge query testing the system refusal to use ungrounded outside knowledge.',
  },
];

export default SAMPLE_QUERIES;
