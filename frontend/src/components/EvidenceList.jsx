import React from 'react';
import EvidenceCard from './EvidenceCard';

export default function EvidenceList({ chunks = [], highlightedIndex = null }) {
  if (!chunks || chunks.length === 0) {
    return null;
  }

  return (
    <section className="med-references-section">
      <div className="references-section-header">
        <div className="section-title-wrapper">
          <span className="books-icon">📚</span>
          <div>
            <h3 className="section-title">Consulted Medical References</h3>
            <p className="section-subtitle">
              Peer-reviewed medical textbooks retrieved and cross-referenced to support this response.
            </p>
          </div>
        </div>

        <span className="sources-count-pill">
          {chunks.length} {chunks.length === 1 ? 'Textbook Consulted' : 'Textbooks Consulted'}
        </span>
      </div>

      <div className="references-grid">
        {chunks.map((chunk, idx) => {
          const sourceNum = idx + 1;
          return (
            <EvidenceCard
              key={chunk.id || idx}
              chunk={chunk}
              index={sourceNum}
              isHighlighted={highlightedIndex === sourceNum}
            />
          );
        })}
      </div>
    </section>
  );
}
