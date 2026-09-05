import React, { useState } from 'react';

export default function EvidenceCard({ chunk, index, isHighlighted = false }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const confidence = chunk.confidence?.toLowerCase() || 'unknown';
  const text = chunk.text || '';
  const isLong = text.length > 260;
  const displayText = isLong && !isExpanded ? `${text.slice(0, 260)}...` : text;

  const getMatchLabel = (conf) => {
    switch (conf) {
      case 'high':
        return 'Strong Clinical Match';
      case 'medium':
        return 'Moderate Reference Match';
      case 'low':
        return 'Low Relevance Match';
      default:
        return 'Medical Reference';
    }
  };

  return (
    <div
      id={`source-${index}`}
      className={`med-reference-card ${isHighlighted ? 'reference-highlighted' : ''}`}
    >
      <div className="reference-card-header">
        <div className="reference-identity">
          <span className="ref-number-badge">Reference {index}</span>
          <div className="ref-titles">
            <h4 className="ref-book-title">{chunk.title || 'Peer-Reviewed Medical Textbook'}</h4>
            <span className="ref-source-type">Accredited Clinical Literature</span>
          </div>
        </div>

        <span className={`ref-match-badge match-${confidence}`}>
          {getMatchLabel(confidence)}
        </span>
      </div>

      <div className="reference-card-body">
        <blockquote className="reference-quote">
          "{displayText}"
        </blockquote>

        {isLong && (
          <button
            type="button"
            className="read-more-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show condensed excerpt ▲' : 'Read full textbook passage ▼'}
          </button>
        )}
      </div>
    </div>
  );
}
