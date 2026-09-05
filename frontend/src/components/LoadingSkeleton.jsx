import React from 'react';

export default function LoadingSkeleton({ query }) {
  return (
    <div className="med-loading-card" aria-live="polite">
      <div className="loading-header">
        <div className="med-spinner" />
        <div>
          <h4>Reviewing Medical Literature...</h4>
          <p>
            Cross-referencing accredited clinical textbooks to ensure verified accuracy.
          </p>
        </div>
      </div>

      <div className="clinical-stepper">
        <div className="stepper-step step-active">
          <span className="step-badge">1</span>
          <div className="step-text">
            <strong>Textbook Retrieval</strong>
            <span>Scanning 125k+ medical passages</span>
          </div>
        </div>
        <div className="stepper-connector" />
        <div className="stepper-step step-active">
          <span className="step-badge">2</span>
          <div className="step-text">
            <strong>Clinical Synthesis</strong>
            <span>Drafting grounded medical summary</span>
          </div>
        </div>
        <div className="stepper-connector" />
        <div className="stepper-step step-active">
          <span className="step-badge">3</span>
          <div className="step-text">
            <strong>Safety Guardrail Check</strong>
            <span>Verifying 70%+ evidence alignment</span>
          </div>
        </div>
      </div>

      {query && (
        <div className="evaluating-query-pill">
          <span>Consulting evidence for:</span>
          <strong>"{query}"</strong>
        </div>
      )}

      {/* Shimmer Cards */}
      <div className="shimmer-placeholder placeholder-banner" />
      <div className="shimmer-placeholder placeholder-answer" />
      <div className="shimmer-placeholder placeholder-ref" />
    </div>
  );
}
