import React from 'react';

export default function Header({ isDemoMode, onToggleMode }) {
  return (
    <header className="med-header">
      <div className="med-header-inner">
        {/* Brand & Mission */}
        <div className="med-brand">
          <div className="med-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div>
            <div className="med-title-row">
              <span className="med-title">Sentinel</span>
              <span className="med-title-highlight">Medical Reference</span>
            </div>
            <p className="med-tagline">
              Accredited Clinical Evidence with AI Hallucination Guardrails
            </p>
          </div>
        </div>

        {/* Trust Badges & Mode */}
        <div className="med-header-badges">
          <div className="trust-badge" title="Information is cross-referenced against 18 peer-reviewed medical textbooks (125,000+ verified chunks)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>18 Accredited Textbooks (125k+ Passages)</span>
          </div>

          <div className="trust-badge trust-badge-green" title="Answers require at least 70% mathematical evidence alignment to be shown">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>70% Safety Threshold</span>
          </div>

          <button
            type="button"
            className={`mode-pill ${isDemoMode ? 'mode-demo' : 'mode-live'}`}
            onClick={onToggleMode}
            title={
              isDemoMode
                ? 'Demo Mode Active: Using simulated medical evidence. Click to switch to Live Backend.'
                : 'Live Backend Active: Connecting to local Python server.'
            }
          >
            <span className="pulse-dot" />
            <span>{isDemoMode ? 'Demo Simulator' : 'Live Backend'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
