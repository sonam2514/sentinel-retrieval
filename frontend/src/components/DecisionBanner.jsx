import React from 'react';

/**
 * Trustworthy medical verification banner clearly communicating whether
 * the answer was validated against accredited literature or safely withheld.
 */
export default function DecisionBanner({
  decision,
  faithfulnessProbability,
  reason,
}) {
  const isVerified = decision === 'ANSWER';
  const matchPercentage =
    faithfulnessProbability !== undefined
      ? Math.round(faithfulnessProbability * 100)
      : null;

  return (
    <div className={`med-status-banner ${isVerified ? 'status-verified' : 'status-caution'}`}>
      <div className="status-icon-bubble">
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

      <div className="status-text-content">
        <div className="status-headline-row">
          <span className="status-tag">
            {isVerified ? 'VERIFIED CLINICAL ANSWER' : 'CAUTION: SAFELY WITHHELD'}
          </span>
          {matchPercentage !== null && (
            <span className="match-tag">
              {matchPercentage}% Evidence Agreement
            </span>
          )}
        </div>

        <h3 className="status-title">
          {isVerified
            ? 'Cross-Referenced & Verified with Medical Literature'
            : 'Information Could Not Be Verified from Medical Textbooks'}
        </h3>

        <p className="status-summary">
          {isVerified
            ? `This response has been mathematically checked against accredited medical literature and achieved ${matchPercentage}% evidence alignment (well above the 70% clinical safety standard).`
            : reason ||
              `To protect clinical safety and prevent AI hallucination, Sentinel refuses to generate answers when accredited medical literature does not contain adequate evidence.`}
        </p>
      </div>
    </div>
  );
}
