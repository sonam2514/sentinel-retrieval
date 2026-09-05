import React, { useState, useRef } from 'react';

/**
 * Helper to display human-readable file sizes.
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Clean, trustworthy search and clinical report ingestion interface.
 */
export default function QueryForm({
  question,
  onQuestionChange,
  topK = 3,
  onTopKChange,
  onSubmit,
  isLoading,
  onClear,
  uploadedFile = null,
  onFileUpload,
  onFileRemove,
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!question.trim() && !uploadedFile) || isLoading) return;
    onSubmit();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((question.trim() || uploadedFile) && !isLoading) {
        onSubmit();
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset file input value so re-uploading the same file triggers onChange
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  const isImage =
    uploadedFile &&
    (uploadedFile.type?.startsWith('image/') ||
      /\.(png|jpe?g|webp|bmp|gif)$/i.test(uploadedFile.name || ''));

  return (
    <div
      className={`med-search-card ${isDragging ? 'drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="med-search-header">
        <div className="search-header-titles">
          <h2>Clinical Question & Evidence Search</h2>
          <p>
            Search medical textbooks or attach a patient report (PDF / image) for grounded semantic analysis.
          </p>
        </div>
        <button
          type="button"
          className={`upload-header-btn ${uploadedFile ? 'has-file' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          title="Upload a patient lab report, blood test PDF, or medical scan image"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          <span>{uploadedFile ? 'Replace Document' : 'Attach Report (PDF / Image)'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Drag & Drop Visual Indicator Overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <span className="drag-icon">📄</span>
          <strong>Drop your clinical document or image here</strong>
          <span>Supports PDF lab reports, biopsy documents, and medical scan photos</span>
        </div>
      )}

      {/* Attached Document Card */}
      {uploadedFile && (
        <div className="attached-file-banner">
          <div className="attached-file-left">
            <div className="file-type-icon-box">
              {isImage ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              )}
            </div>

            <div className="attached-file-meta">
              <div className="file-name-row">
                <strong className="file-name">{uploadedFile.name}</strong>
                <span className="file-size-badge">{formatFileSize(uploadedFile.size)}</span>
                <span className="file-rag-badge">
                  <span className="pulse-rag-dot" /> Semantic RAG Ingestion Active
                </span>
              </div>
              <p className="file-hint">
                Sentinel will extract findings from this {isImage ? 'image' : 'PDF'} and cross-reference them with 18 accredited medical textbooks.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="remove-file-btn"
            onClick={onFileRemove}
            title="Remove attached document"
            disabled={isLoading}
          >
            &times;
          </button>
        </div>
      )}

      {/* Suggested Inquiries when a document is attached */}
      {uploadedFile && (
        <div className="report-prompts-container">
          <span className="prompts-intro">Quick Document Inquiries:</span>
          <div className="prompts-chips-list">
            <button
              type="button"
              className="report-chip"
              onClick={() => onQuestionChange("Analyze any abnormal biomarkers or flagged lab results in this report")}
              disabled={isLoading}
            >
              🔍 Flag Abnormal Values
            </button>
            <button
              type="button"
              className="report-chip"
              onClick={() => onQuestionChange("Explain the clinical diagnosis and medical terminology in plain English")}
              disabled={isLoading}
            >
              📖 Plain-English Translation
            </button>
            <button
              type="button"
              className="report-chip"
              onClick={() => onQuestionChange("What questions should I ask my physician regarding these results?")}
              disabled={isLoading}
            >
              🩺 Physician Questions
            </button>
          </div>
        </div>
      )}

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
            placeholder={
              uploadedFile
                ? `Ask anything about ${uploadedFile.name} (e.g., Analyze abnormal values or explain diagnosis)`
                : "Type your clinical query here (e.g., What are the symptoms of asthma?)"
            }
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            required={!uploadedFile}
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
            disabled={isLoading || (!question.trim() && !uploadedFile)}
          >
            {isLoading ? (
              <>
                <span className="search-spinner" />
                <span>{uploadedFile ? 'Reading Report & Textbooks...' : 'Checking Medical Textbooks...'}</span>
              </>
            ) : (
              <>
                <span>{uploadedFile ? 'Analyze Report & Literature' : 'Search Medical Reference'}</span>
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
                Sentinel will retrieve the top {topK} most relevant medical textbook passages and cross-reference them with your query.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
