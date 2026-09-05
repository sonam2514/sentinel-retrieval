import React from 'react';
import { SAMPLE_QUERIES } from '../constants/sampleQueries';

export default function SampleQueries({
  onSelectQuery,
  currentQuestion,
  disabled = false,
}) {
  const clinicalQueries = SAMPLE_QUERIES.filter((q) => q.expectedDecision === 'ANSWER');
  const guardrailQueries = SAMPLE_QUERIES.filter((q) => q.expectedDecision === 'ABSTAIN');
  const activeItem = SAMPLE_QUERIES.find((q) => q.question.trim() === currentQuestion?.trim());

  return (
    <div className="med-samples-section">
      <div className="sample-group">
        <span className="sample-group-label">
          <span className="dot dot-green" /> Common Clinical Topics:
        </span>
        <div className="sample-pills-row">
          {clinicalQueries.map((item) => {
            const isSelected = currentQuestion?.trim() === item.question.trim();
            return (
              <button
                key={item.id}
                type="button"
                className={`med-pill ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectQuery(item)}
                disabled={disabled}
                title={`Click to open clinical evidence: "${item.question}"`}
              >
                <span>{item.label}</span>
                <span className="pill-arrow">&rarr;</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sample-group">
        <span className="sample-group-label">
          <span className="dot dot-amber" /> Test AI Safety Guardrail (Refusal):
        </span>
        <div className="sample-pills-row">
          {guardrailQueries.map((item) => {
            const isSelected = currentQuestion?.trim() === item.question.trim();
            return (
              <button
                key={item.id}
                type="button"
                className={`med-pill med-pill-caution ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectQuery(item)}
                disabled={disabled}
                title={`Click to test AI safety refusal: "${item.question}"`}
              >
                <span>{item.label}</span>
                <span className="pill-arrow">&rarr;</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeItem && (
        <div className="active-sample-callout">
          <div className="callout-tag-group">
            <span className={`callout-badge ${activeItem.expectedDecision === 'ANSWER' ? 'badge-verified' : 'badge-refusal'}`}>
              {activeItem.category}
            </span>
            <span className="callout-topic-title">"{activeItem.question}"</span>
          </div>
          <p className="callout-desc">
            {activeItem.description}
          </p>
        </div>
      )}
    </div>
  );
}
