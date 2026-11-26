import React, { useState } from 'react';

/**
 * Clean, trustworthy search interface for querying verified medical textbooks.
 */
export default function QueryForm({
  question,
  onQuestionChange,
  topK = 3,
  onTopKChange,
  onSubmit,
  isLoading,
  onClear,
}) {
  const [showSettings, setShowSettings] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;
    onSubmit();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (question.trim() && !isLoading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="med-search-card">
      <div className="med-search-header">
        <div className="search-header-titles">
          <h2>Clinical Question & Evidence Search</h2>
          <p>
            Ask clinical queries to retrieve verified evidence from 18 accredited medical textbooks and generate a grounded, hallucination-checked answer.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="med-search-form">
        <div className="search-input-wrapper">
          <div className="search-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <textarea
            id="medical-query"
            className="search-textarea"
            rows={2}
            placeholder="Type your clinical query here (e.g., What are the symptoms of asthma?)"
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            required
          />

          {question && !isLoading && (
            <button
              type="button"
              className="clear-query-btn"
              onClick={onClear}
              title="Clear search"
            >
              &times;
            </button>
          )}
        </div>

        <div className="search-hint-row">
          <span className="search-keyboard-hint">
            Tip: Press <kbd>Enter</kbd> to search &bull; <kbd>Shift</kbd> + <kbd>Enter</kbd> for new line
          </span>
        </div>

        <div className="search-footer-row">
          <div className="footer-left-controls">
            <button
              type="button"
              className="settings-toggle-btn"
              onClick={() => setShowSettings(!showSettings)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>{showSettings ? 'Hide Search Options' : 'Search Options'} ({topK} textbook sources)</span>
            </button>
          </div>

          <button
            type="submit"
            className="search-submit-btn"
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? (
              <>
                <span className="search-spinner" />
                <span>Checking Medical Textbooks & Synthesizing...</span>
              </>
            ) : (
              <>
                <span>Search Medical Reference</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Options Drawer */}
        {showSettings && (
          <div className="search-options-drawer">
            <div className="options-item">
              <label htmlFor="sources-count" className="options-label">
                Number of textbook excerpts to analyze:
              </label>
              <div className="slider-group">
                <input
                  id="sources-count"
                  type="range"
                  min="1"
                  max="6"
                  value={topK}
                  onChange={(e) => onTopKChange(Number(e.target.value))}
                  className="sources-slider"
                  disabled={isLoading}
                />
                <span className="slider-value">{topK} Sources</span>
              </div>
              <p className="options-help">
                Sentinel retrieves the top {topK} most relevant medical textbook passages from 18 accredited reference books and cross-references them with Ollama synthesis.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
