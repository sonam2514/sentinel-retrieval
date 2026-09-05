import React from 'react';

/**
 * Patient-friendly Evidence Alignment Meter.
 * Explains how strictly the answer reflects genuine textbook facts.
 */
export default function FaithfulnessMeter({
  faithfulnessProbability = 0,
  threshold = 0.70,
}) {
  const percentage = Math.round(faithfulnessProbability * 100);
  const thresholdPct = Math.round(threshold * 100);
  const isPassed = faithfulnessProbability >= threshold;

  return (
    <div className="med-meter-box">
      <div className="meter-top-row">
        <div>
          <h4 className="meter-label">Medical Evidence Alignment Score</h4>
          <p className="meter-caption">
            Measures how strictly the answer adheres to verified textbook sources without hallucination.
          </p>
        </div>
        <div className={`meter-score-badge ${isPassed ? 'badge-passed' : 'badge-failed'}`}>
          <strong>{percentage}%</strong> {isPassed ? 'Safety Passed' : 'Below Safety Standard'}
        </div>
      </div>

      {/* Progress Track */}
      <div className="meter-track-wrapper">
        <div className="meter-track">
          <div
            className={`meter-fill ${isPassed ? 'fill-green' : 'fill-amber'}`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
          {/* 70% Benchmark Indicator */}
          <div
            className="benchmark-marker"
            style={{ left: `${thresholdPct}%` }}
          >
            <div className="benchmark-line" />
            <span className="benchmark-text">{thresholdPct}% Minimum Safety Bar</span>
          </div>
        </div>
      </div>

      <div className="meter-explanation">
        <span className="info-icon">ℹ️</span>
        <p>
          {isPassed ? (
            <>
              <strong>High Confidence:</strong> At <strong>{percentage}%</strong>, this answer is supported by the consulted textbooks and meets clinical research standards.
            </>
          ) : (
            <>
              <strong>Safety Threshold Failed:</strong> At <strong>{percentage}%</strong>, this answer scored below the required <strong>{thresholdPct}%</strong> benchmark, triggering an automatic safety abstention.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
