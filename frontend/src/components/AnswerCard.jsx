import React, { useState } from 'react';

export default function AnswerCard({ answer, decision, onSourceClick }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!answer) return;
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  /**
   * Turns [Source 1], [Source 2] into clean, friendly clinical reference pills.
   */
  const renderCitations = (text) => {
    if (!text) return null;
    const parts = text.split(/(\[Source\s+\d+\])/gi);

    return parts.map((part, index) => {
      const match = part.match(/\[Source\s+(\d+)\]/i);
      if (match) {
        const sourceNum = parseInt(match[1], 10);
        return (
          <button
            key={index}
            type="button"
            className="med-ref-pill"
            onClick={() => onSourceClick && onSourceClick(sourceNum)}
            title={`Click to view Source ${sourceNum} in the bibliography below`}
          >
            Ref {sourceNum}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const isAbstain = decision === 'ABSTAIN';

  return (
    <article className={`med-answer-card ${isAbstain ? 'med-answer-abstain' : ''}`}>
      <div className="answer-top-bar">
        <div className="answer-heading-group">
          <span className="stethoscope-icon">🩺</span>
          <div>
            <h3 className="answer-main-title">Clinical Summary</h3>
            <span className="answer-sub-caption">
              {isAbstain
                ? 'Answer withheld by AI safety protocol'
                : 'Synthesized directly from verified medical textbooks'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="copy-summary-btn"
          onClick={handleCopy}
          title="Copy this clinical summary"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied to Clipboard</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy Summary</span>
            </>
          )}
        </button>
      </div>

      <div className="answer-prose">
        <p>{renderCitations(answer)}</p>
      </div>

      <div className="answer-trust-note">
        <p>
          {isAbstain
            ? '⚠️ Notice: Because accredited medical textbooks lacked conclusive evidence for this question, Sentinel withheld clinical guidance to prevent unverified advice.'
            : '💡 Interactive References: Click any "Ref" badge above to jump to the exact textbook passage it was derived from.'}
        </p>
      </div>
    </article>
  );
}
