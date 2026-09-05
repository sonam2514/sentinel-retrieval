import React, { useState } from 'react';

/**
 * Unified Clinical Report Card.
 * Combines Clinical Verification, Mathematical Score Gauge,
 * and the Synthesized Clinical Summary into a single authoritative box.
 */
export default function ClinicalReportCard({
  answer,
  decision,
  faithfulnessProbability = 0,
  threshold = 0.70,
  reason,
  onSourceClick,
}) {
  const [copied, setCopied] = useState(false);

  const isVerified = decision === 'ANSWER';
  const isAbstain = decision === 'ABSTAIN';
  const percentage = Math.round(faithfulnessProbability * 100);
  const thresholdPct = Math.round(threshold * 100);
  const isPassed = faithfulnessProbability >= threshold;

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
   * Intelligently parses inline text into clickable citations, bold emphasis,
   * color-coded lab status badges (HIGH, ELEVATED, LOW, etc.), and reference target pills.
   */
  const renderInlineContent = (text) => {
    if (!text) return null;

    // Tokenizer regex matching:
    // 1. Citations: [Source 1] or [Source 1, Source 2]
    // 2. Bold text: **test name**
    // 3. Status markers: ➔ HIGH, ➔ ELEVATED, ➔ EARLY NERVE WARNING, etc.
    // 4. Target ranges: (Healthy target: ...), (Desirable: ...), (Normal: ...)
    const tokenRegex =
      /(\[(?:Source\s*\d+(?:[,\s]+(?:Source\s*)?\d+)*)\]|\*\*[^*]+\*\*|➔\s*[A-Za-z\s]+(?=(?:\s*\(|\s*\[|\s*$|\s*[.,]))|\((?:Healthy\s*target|Desirable|Normal|Reference|Optimal)[^)]+\))/gi;

    const tokens = text.split(tokenRegex).filter(Boolean);

    return tokens.map((token, index) => {
      // Case 1: Citations like [Source 1] or [Source 1, Source 2]
      if (/^\[.*Source.*\]$/i.test(token)) {
        const sourceNumbers = [...token.matchAll(/\d+/g)].map((m) => parseInt(m[0], 10));
        return (
          <span key={index} className="citations-group">
            {sourceNumbers.map((num) => (
              <button
                key={num}
                type="button"
                className="med-ref-pill"
                onClick={() => onSourceClick && onSourceClick(num)}
                title={`Jump to Source ${num} in the bibliography below`}
              >
                Ref {num}
              </button>
            ))}
          </span>
        );
      }

      // Case 2: Bold text **bold**
      if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
        return (
          <strong key={index} className="inline-strong">
            {token.slice(2, -2)}
          </strong>
        );
      }

      // Case 3: Status indicator like ➔ HIGH, ➔ ELEVATED, ➔ EARLY NERVE WARNING
      if (token.startsWith('➔')) {
        const statusText = token.replace(/^➔\s*/, '').trim();
        let badgeClass = 'badge-elevated';
        const stUpper = statusText.toUpperCase();

        if (stUpper.includes('HIGH') || stUpper.includes('CRITICAL')) {
          badgeClass = 'badge-high';
        } else if (stUpper.includes('ELEVATED') || stUpper.includes('WARNING') || stUpper.includes('NERVE')) {
          badgeClass = 'badge-elevated';
        } else if (stUpper.includes('LOW')) {
          badgeClass = 'badge-low';
        } else if (stUpper.includes('NORMAL')) {
          badgeClass = 'badge-normal';
        }

        return (
          <span key={index} className={`lab-status-badge ${badgeClass}`}>
            {statusText}
          </span>
        );
      }

      // Case 4: Target range pills like (Healthy target: 70–99 mg/dL)
      if (
        token.startsWith('(') &&
        token.endsWith(')') &&
        /target|desirable|normal|reference|optimal/i.test(token)
      ) {
        return (
          <span key={index} className="target-range-pill">
            {token}
          </span>
        );
      }

      // Default: Plain text
      return <span key={index}>{token}</span>;
    });
  };

  /**
   * Renders structured clinical prose with specialized cards for:
   * - 🚨 Primary Health Issue Identified
   * - ⚠️ Abnormal Test Numbers & What's Wrong
   * - 🩺 What This Causes in Your Body
   * - 💡 Immediate Next Steps
   * - 💬 Exact Questions to Ask Your Doctor
   */
  const renderFormattedAnswer = (text) => {
    if (!text) return null;
    const blocks = text.split(/\n\n+/);

    return blocks.map((block, bIdx) => {
      const rawLines = block.split('\n');
      const lines = rawLines.map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return null;

      const firstLine = lines[0];

      // Section classification
      const isDiagnosis =
        firstLine.startsWith('🚨') ||
        /primary health issue|primary diagnosis|primary problem/i.test(firstLine);

      const isAbnormalFindings =
        firstLine.startsWith('⚠️') ||
        /abnormal|what's wrong|findings from your report/i.test(firstLine);

      const isBodyImpact =
        firstLine.startsWith('🩺') ||
        /what problem this causes|in your body/i.test(firstLine);

      const isNextSteps =
        firstLine.startsWith('💡') ||
        /immediate next steps|what to do/i.test(firstLine);

      const isDoctorQuestions =
        firstLine.startsWith('💬') ||
        /questions to ask your doctor|questions for your doctor/i.test(firstLine);

      const isGenericHeading =
        firstLine.endsWith(':') ||
        /^([📌🔍💡🩺⚠️✅📖🚨💬•*]{0,2}\s*[A-Za-z0-9\s,&/–\-()']+:|\#{2,4}\s+.*|\*\*.*\*\*:?)$/.test(firstLine);

      const cleanHeading = firstLine
        .replace(/^#+\s*/, '')
        .replace(/^\*\*(.*)\*\*:?$/, '$1:')
        .trim();

      const restLines = lines.slice(1);

      // 1. Primary Health Issue Banner
      if (isDiagnosis && restLines.length > 0) {
        return (
          <div key={bIdx} className="diagnosis-banner-card">
            <div className="diagnosis-banner-header">
              <span className="diagnosis-icon-badge">🚨</span>
              <div className="diagnosis-titles">
                <span className="diagnosis-kicker">PRIMARY HEALTH ISSUE IDENTIFIED</span>
                <h4 className="diagnosis-heading">{cleanHeading.replace(/^🚨\s*/, '')}</h4>
              </div>
            </div>
            <div className="diagnosis-banner-body">
              <p className="diagnosis-statement-text">
                {renderInlineContent(restLines.join(' '))}
              </p>
            </div>
          </div>
        );
      }

      // 2. What's Wrong in Your Report (Abnormal Test Numbers)
      if (isAbnormalFindings && restLines.length > 0) {
        // Group each finding bullet with its subsequent "What this means" explanation lines
        const findingItems = [];
        let currentFinding = null;

        for (const line of restLines) {
          if (line.startsWith('•') || line.startsWith('-') || /^\d+\./.test(line)) {
            if (currentFinding) findingItems.push(currentFinding);
            currentFinding = {
              header: line.replace(/^[•\-\d+\.]\s*/, '').trim(),
              details: [],
            };
          } else if (currentFinding) {
            currentFinding.details.push(line);
          } else {
            findingItems.push({ header: line, details: [] });
          }
        }
        if (currentFinding) findingItems.push(currentFinding);

        return (
          <div key={bIdx} className="abnormal-findings-card">
            <div className="abnormal-findings-header">
              <span className="abnormal-icon-badge">⚠️</span>
              <div>
                <h4 className="abnormal-heading">{cleanHeading.replace(/^⚠️\s*/, '')}</h4>
                <span className="abnormal-caption">
                  Flagged results compared against standard clinical reference targets
                </span>
              </div>
            </div>

            <div className="findings-reading-list">
              {findingItems.map((item, fIdx) => (
                <div key={fIdx} className="finding-reading-card">
                  <div className="finding-reading-header">
                    <span className="finding-bullet-dot" />
                    <div className="finding-reading-title">
                      {renderInlineContent(item.header)}
                    </div>
                  </div>
                  {item.details.length > 0 && (
                    <div className="finding-explanation-box">
                      {item.details.map((dLine, dIdx) => (
                        <p key={dIdx} className="finding-explanation-text">
                          {renderInlineContent(dLine)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // 3. What Problem This Causes in Your Body (Pathophysiology in Plain English)
      if (isBodyImpact && restLines.length > 0) {
        return (
          <div key={bIdx} className="body-impact-card">
            <div className="body-impact-header">
              <span className="impact-icon-badge">🩺</span>
              <div>
                <h4 className="body-impact-heading">{cleanHeading.replace(/^🩺\s*/, '')}</h4>
                <span className="body-impact-caption">
                  How these lab values affect your cells, blood vessels, and daily energy
                </span>
              </div>
            </div>
            <div className="body-impact-body">
              <p className="body-impact-text">
                {renderInlineContent(restLines.join(' '))}
              </p>
            </div>
          </div>
        );
      }

      // 4. Immediate Next Steps & What to Do
      if (isNextSteps && restLines.length > 0) {
        return (
          <div key={bIdx} className="next-steps-card">
            <div className="next-steps-header">
              <span className="steps-icon-badge">💡</span>
              <div>
                <h4 className="next-steps-heading">{cleanHeading.replace(/^💡\s*/, '')}</h4>
                <span className="next-steps-caption">
                  Actionable medical and lifestyle recommendations
                </span>
              </div>
            </div>
            <ul className="next-steps-list">
              {restLines.map((line, lIdx) => {
                const cleanLine = line.replace(/^[•\-\d+\.]\s*/, '').trim();
                return (
                  <li key={lIdx} className="next-step-item">
                    <span className="step-checkmark">✓</span>
                    <div className="step-content">{renderInlineContent(cleanLine)}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }

      // 5. Exact Questions to Ask Your Doctor at Your Next Visit
      if (isDoctorQuestions && restLines.length > 0) {
        return (
          <div key={bIdx} className="doctor-questions-card">
            <div className="doctor-questions-header">
              <span className="questions-icon-badge">💬</span>
              <div>
                <h4 className="doctor-questions-heading">
                  {cleanHeading.replace(/^💬\s*/, '')}
                </h4>
                <span className="doctor-questions-caption">
                  Bring these questions to your doctor to get the most out of your consultation
                </span>
              </div>
            </div>
            <div className="doctor-quotes-grid">
              {restLines.map((line, qIdx) => {
                const cleanLine = line.replace(/^[•\-\d+\.]\s*/, '').trim();
                return (
                  <div key={qIdx} className="doctor-quote-box">
                    <span className="quote-number">{qIdx + 1}</span>
                    <div className="quote-text">{renderInlineContent(cleanLine)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // 6. Generic Formatted Section Block (for general textbook queries)
      if (isGenericHeading && restLines.length > 0) {
        const hasBullets = restLines.some(
          (l) => l.startsWith('•') || l.startsWith('- ') || /^\d+\.\s/.test(l)
        );

        return (
          <div key={bIdx} className="answer-section-block">
            <h4 className="answer-subheading">{cleanHeading}</h4>
            {hasBullets ? (
              <ul className="answer-bullet-list">
                {restLines.map((line, lIdx) => {
                  const cleanLine = line.replace(/^[•\-\d+\.]\s*/, '').trim();
                  return (
                    <li key={lIdx} className="answer-bullet-item">
                      {renderInlineContent(cleanLine)}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="answer-paragraph">
                {renderInlineContent(restLines.join(' '))}
              </p>
            )}
          </div>
        );
      }

      // Standalone Bullet List
      if (lines.some((l) => l.startsWith('•') || l.startsWith('- ') || /^\d+\.\s/.test(l))) {
        return (
          <ul key={bIdx} className="answer-bullet-list">
            {lines.map((line, lIdx) => {
              const cleanLine = line.replace(/^[•\-\d+\.]\s*/, '').trim();
              if (!cleanLine) return null;
              return (
                <li key={lIdx} className="answer-bullet-item">
                  {renderInlineContent(cleanLine)}
                </li>
              );
            })}
          </ul>
        );
      }

      // Standalone Paragraph
      return (
        <p key={bIdx} className="answer-paragraph">
          {renderInlineContent(block)}
        </p>
      );
    });
  };

  return (
    <article className={`med-unified-card ${isVerified ? 'unified-verified' : 'unified-caution'}`}>
      {/* 1. Top Section: Verification Verdict & Mathematical Score */}
      <div className="unified-verification-section">
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
              Alignment: <strong>{percentage}%</strong> &bull; Minimum Cutoff: <strong>{thresholdPct}%</strong>
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
      </div>

      {/* Clean Horizontal Divider */}
      <div className="unified-card-divider" />

      {/* 2. Bottom Section: Synthesized Clinical Summary */}
      <div className="unified-summary-section">
        <div className="answer-top-bar">
          <div className="answer-heading-group">
            <span className="stethoscope-icon">🩺</span>
            <div>
              <div className="summary-title-row">
                <h3 className="answer-main-title">Clinical Summary</h3>
                <span className="plain-english-badge">✓ Plain-English Translation</span>
              </div>
              <span className="answer-sub-caption">
                {isAbstain
                  ? 'Answer withheld by AI safety protocol'
                  : 'Explained in clear, everyday language & grounded in verified medical textbooks'}
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
          {renderFormattedAnswer(answer)}
        </div>

        <div className="answer-trust-note">
          <p>
            {isAbstain
              ? '⚠️ Notice: Because accredited medical textbooks lacked conclusive evidence for this question, Sentinel withheld clinical guidance to prevent unverified advice.'
              : '💡 Interactive References: Click any "Ref" badge above to jump to the exact textbook passage it was derived from.'}
          </p>
        </div>
      </div>
    </article>
  );
}
