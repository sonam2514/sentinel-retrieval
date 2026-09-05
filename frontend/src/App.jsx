import React, { useState } from 'react';
import Header from './components/Header';
import QueryForm from './components/QueryForm';
import SampleQueries from './components/SampleQueries';
import ClinicalReportCard from './components/ClinicalReportCard';
import EvidenceList from './components/EvidenceList';
import LoadingSkeleton from './components/LoadingSkeleton';
import { querySentinel } from './api/sentinelApi';
import './App.css';

export default function App() {
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [highlightedSource, setHighlightedSource] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);

  const executeSearch = async (queryText, sourcesCount, demoModeOverride, fileOverride) => {
    const q = (queryText !== undefined ? queryText : question).trim();
    const activeFile = fileOverride !== undefined ? fileOverride : uploadedFile;
    if (!q && !activeFile) return;
    if (isLoading) return;

    const sources = sourcesCount !== undefined ? sourcesCount : topK;
    const useDemo = demoModeOverride !== undefined ? demoModeOverride : isDemoMode;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setHighlightedSource(null);

    try {
      const data = await querySentinel(q, sources, useDemo, activeFile);
      setResult(data);
    } catch (err) {
      setError({
        message: err.message || 'Unable to connect to Sentinel backend.',
        isOffline: err.isOffline,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (demoModeOverride) => {
    executeSearch(question, topK, demoModeOverride);
  };

  const handleFileUpload = (file) => {
    setUploadedFile(file);
    // Auto-update the question if it's empty, or if it was previously auto-filled with an analysis prompt
    const isAutoPrompt =
      !question.trim() ||
      question.startsWith('Analyze ') ||
      question.includes('and summarize clinical findings') ||
      (uploadedFile && question.includes(uploadedFile.name));

    if (isAutoPrompt) {
      setQuestion(`Analyze ${file.name} and summarize clinical findings and medical significance`);
    }
  };

  const handleFileRemove = () => {
    if (
      uploadedFile &&
      (question === `Analyze ${uploadedFile.name} and summarize clinical findings and medical significance` ||
       question.startsWith('Analyze '))
    ) {
      setQuestion('');
    }
    setUploadedFile(null);
  };

  const handleSelectSample = (sample) => {
    setQuestion(sample.question);
    const k = sample.topK || topK;
    if (sample.topK) setTopK(sample.topK);
    setError(null);
    // Immediately open and execute clinical search for the clicked topic
    executeSearch(sample.question, k);
  };

  const handleClear = () => {
    setQuestion('');
    setUploadedFile(null);
    setTopK(3);
    setResult(null);
    setError(null);
    setHighlightedSource(null);
  };

  const handleSourceClick = (sourceNumber) => {
    setHighlightedSource(sourceNumber);
    const element = document.getElementById(`source-${sourceNumber}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSwitchToDemo = () => {
    setIsDemoMode(true);
    setError(null);
    executeSearch(question, topK, true);
  };

  return (
    <div className="med-app-wrapper">
      <Header
        isDemoMode={isDemoMode}
        onToggleMode={() => setIsDemoMode((prev) => !prev)}
      />

      {/* Trust Notice Bar */}
      <div className="med-trust-banner">
        <div className="trust-banner-inner">
          <span className="shield-icon">🛡️</span>
          <span>
            <strong>Grounded in Verified Science:</strong> All responses are cross-referenced directly with 18 accredited medical textbooks and must meet a <strong>70% safety score</strong> to be displayed.
          </span>
          {isDemoMode && (
            <span className="demo-pill-tag">
              Demo Simulation Mode Active
            </span>
          )}
        </div>
      </div>

      <main className="med-main-content">
        {/* Common Clinical Topics & AI Guardrail Tests (Above Search Bar) */}
        <section className="top-samples-card">
          <SampleQueries
            onSelectQuery={handleSelectSample}
            currentQuestion={question}
            disabled={isLoading}
          />
        </section>

        {/* Medical Search Section */}
        <section className="search-section-container">
          <QueryForm
            question={question}
            onQuestionChange={setQuestion}
            topK={topK}
            onTopKChange={setTopK}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            onClear={handleClear}
            uploadedFile={uploadedFile}
            onFileUpload={handleFileUpload}
            onFileRemove={handleFileRemove}
          />
        </section>

        {/* Offline Connection Alert */}
        {error && (
          <div className="med-alert-card" role="alert">
            <div className="alert-icon-wrap">⚠️</div>
            <div className="alert-text-wrap">
              <h4>System Connection Alert</h4>
              <p>{typeof error === 'object' ? error.message : error}</p>
              {error.isOffline && (
                <div className="alert-action-row">
                  <button
                    type="button"
                    className="alert-btn"
                    onClick={handleSwitchToDemo}
                  >
                    Switch to Demo Mode to test search now &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Stepper (Directly Below Search Bar) */}
        {isLoading && <LoadingSkeleton query={question} />}

        {/* Search Results (Directly Below Search Bar) */}
        {result && !isLoading && (
          <section className="med-results-container">
            {/* Unified Clinical Report Box: Verification + Score + Summary */}
            <ClinicalReportCard
              answer={result.answer}
              decision={result.decision}
              faithfulnessProbability={result.faithfulness_probability}
              threshold={0.70}
              reason={result.reason}
              onSourceClick={handleSourceClick}
            />

            {/* Consulted Medical References */}
            <EvidenceList
              chunks={result.retrieved_chunks || []}
              highlightedIndex={highlightedSource}
            />
          </section>
        )}

        {/* Welcoming Trust Pillars (when idle) */}
        {!result && !isLoading && !error && (
          <section className="med-pillars-section">
            <h3 className="pillars-main-title">Why Trust Sentinel Over Standard AI?</h3>
            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon-box">📚</div>
                <h4>Accredited Textbooks Only</h4>
                <p>
                  We do not search random websites or blogs. Every answer is retrieved from 18 recognized medical textbooks like <em>Harrison's Internal Medicine</em>.
                </p>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">🛡️</div>
                <h4>Strict 70% Guardrail</h4>
                <p>
                  Before you see an answer, an automated classifier cross-checks every sentence against the source literature. Anything below 70% agreement is rejected.
                </p>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">🔍</div>
                <h4>Complete Transparency</h4>
                <p>
                  Every factual claim includes an interactive citation tag linking directly to the exact textbook passage it was derived from.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Professional Medical Disclaimer Footer */}
      <footer className="med-footer">
        <div className="med-footer-inner">
          <div className="footer-disclaimer-box">
            <strong>Medical Disclaimer:</strong>
            <p>
              Sentinel Medical Reference is an educational AI research tool designed to demonstrate grounded retrieval and hallucination guardrails using MedRAG clinical textbooks. It is not intended as medical advice, diagnosis, or treatment. Always seek the advice of a qualified physician or healthcare provider with any medical questions.
            </p>
          </div>
          <div className="footer-credits">
            <span>&copy; Sentinel Clinical Intelligence &bull; MedRAG Verified Textbooks</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
