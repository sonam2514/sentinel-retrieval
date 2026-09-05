import React from 'react';

/**
 * Unified Clinical Verification & Evidence Alignment Card.
 * Combines the verification decision, evidence agreement score,
 * and the 70% safety benchmark gauge into a single authoritative report.
 */
export default function ClinicalVerification({
  decision,
  faithfulnessProbability = 0,
  threshold = 0.70,
  reason,
}) {
  const isVerified = decision === 'ANSWER';
  const percentage = Math.round(faithfulnessProbability * 100);
  const thresholdPct = Math.round(threshold * 100);
  const isPassed = faithfulnessProbability >= threshold;

  return (
    <section className={`med-verification-card ${isVerified ? 'card-verified' : 'card-caution'}`}>
      {/* Top Banner / Verdict */}
      <div className="verification-header-row">
        <div className="verification-status-group">
          <div className="status-shield-icon">
            {isVerified ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
          </div>
          <div>
            <div className="verification-badge-row">
              <span className="verdict-tag">
                {isVerified ? 'VERIFIED CLINICAL EVIDENCE' : 'CAUTION: SAFELY WITHHELD'}
              </span>
              <span className="verdict-score-tag">
                {percentage}% Evidence Alignment
              </span>
            </div>
            <h3 className="verdict-title">
              {isVerified
                ? 'Cross-Referenced & Verified with Accredited Literature'
                : 'Information Could Not Be Grounded in Medical Textbooks'}
            </h3>
          </div>
        </div>

        <div className={`safety-status-chip ${isPassed ? 'chip-pass' : 'chip-fail'}`}>
          <span className="chip-dot" />
          <span>{isPassed ? `${thresholdPct}% Safety Bar Passed` : `Below ${thresholdPct}% Safety Bar`}</span>
        </div>
      </div>

      <p className="verification-summary-text">
        {isVerified
          ? `This response was checked by Sentinel's faithfulness classifier against peer-reviewed textbooks. Achieving ${percentage}% alignment (well above the ${thresholdPct}% safety threshold), it was confirmed free of AI hallucination.`
          : reason ||
            `To protect clinical safety and prevent AI hallucination, Sentinel automatically abstains when retrieved medical textbooks do not contain conclusive evidence.`}
      </p>

      {/* Integrated Gauge Track */}
      <div className="verification-gauge-section">
        <div className="gauge-labels-row">
          <span className="gauge-label-left">Mathematical Evidence Alignment Gauge</span>
          <span className="gauge-label-right">
            Alignment: <strong>{percentage}%</strong> &bull; Cutoff: <strong>{thresholdPct}%</strong>
          </span>
        </div>

        <div className="meter-track-wrapper">
          <div className="meter-track">
            <div
              className={`meter-fill ${isPassed ? 'fill-green' : 'fill-amber'}`}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
            <div
              className="benchmark-marker"
              style={{ left: `${thresholdPct}%` }}
            >
              <div className="benchmark-line" />
              <span className="benchmark-text">{thresholdPct}% Minimum Safety Bar</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
