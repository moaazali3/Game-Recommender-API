import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { fetchAiSummary } from '../services/api';
import { X, Sparkles, CheckCircle2, AlertTriangle, Database, Cpu } from 'lucide-react';

export const AiSummaryModal = ({ appId, gameTitle, isOpen, onClose }) => {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  useEffect(() => {
    if (!isOpen || !appId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSummaryData(null);

    fetchAiSummary(appId, lang)
      .then((data) => {
        if (isMounted) {
          setSummaryData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load summary');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, appId, lang]);

  if (!isOpen) return null;

  // Parser helper for Groq AI response
  const parseSummaryText = (raw) => {
    if (!raw) return { general: [], pros: [], cons: [] };

    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const general = [];
    const pros = [];
    const cons = [];

    let currentSection = 'general';

    lines.forEach((line) => {
      const lower = line.toLowerCase();
      const clean = line.replace(/^[*\-•\d.]+\s*/, '').trim();

      if (
        lower.includes('pros') ||
        lower.includes('الايجابيات') ||
        lower.includes('المميزات') ||
        lower.includes('highlights') ||
        lower.includes('strengths')
      ) {
        currentSection = 'pros';
        return;
      }

      if (
        lower.includes('cons') ||
        lower.includes('السلبيات') ||
        lower.includes('العيوب') ||
        lower.includes('criticisms') ||
        lower.includes('weaknesses')
      ) {
        currentSection = 'cons';
        return;
      }

      if (!clean) return;

      if (currentSection === 'pros') {
        pros.push(clean);
      } else if (currentSection === 'cons') {
        cons.push(clean);
      } else {
        general.push(clean);
      }
    });

    return { general, pros, cons };
  };

  const parsed = summaryData ? parseSummaryText(summaryData.Summary || summaryData.summary) : null;
  const isCache = (summaryData?.Source || summaryData?.source || '').toLowerCase().includes('cache');

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface ai-modal-container" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="ai-modal-header">
          <div className="ai-modal-icon-badge">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="ai-modal-title heading-display">{t('ai_modal_title')}</h2>
            <p className="ai-modal-subtitle">{gameTitle}</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="ai-modal-body">
          {loading && (
            <div className="ai-loading-wrap">
              <div className="ai-pulsing-loader">
                <Sparkles size={28} className="pulsing-sparkle" />
              </div>
              <p className="ai-loading-text">{t('ai_analyzing')}</p>
              <div className="skeleton-lines-group">
                <div className="skeleton skeleton-line" style={{ width: '90%', height: '14px' }} />
                <div className="skeleton skeleton-line" style={{ width: '80%', height: '14px' }} />
                <div className="skeleton skeleton-line" style={{ width: '60%', height: '14px' }} />
              </div>
            </div>
          )}

          {error && (
            <div className="ai-error-box">
              <AlertTriangle size={24} color="var(--mature-red)" />
              <p>{error}</p>
            </div>
          )}

          {summaryData && parsed && (
            <div className="ai-content-wrap">
              {/* General Overview Paragraphs */}
              {parsed.general.length > 0 && (
                <div className="ai-general-section">
                  {parsed.general.map((p, idx) => (
                    <p key={idx} className="ai-general-text">{p}</p>
                  ))}
                </div>
              )}

              {/* Pros List */}
              {parsed.pros.length > 0 && (
                <div className="ai-bullet-group ai-pros-group">
                  <h3 className="ai-bullet-header pros-header">
                    <CheckCircle2 size={18} />
                    <span>{t('ai_pros')}</span>
                  </h3>
                  <ul className="ai-bullet-list">
                    {parsed.pros.map((item, idx) => (
                      <li key={idx} className="ai-bullet-item pro-item">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cons List */}
              {parsed.cons.length > 0 && (
                <div className="ai-bullet-group ai-cons-group">
                  <h3 className="ai-bullet-header cons-header">
                    <AlertTriangle size={18} />
                    <span>{t('ai_cons')}</span>
                  </h3>
                  <ul className="ai-bullet-list">
                    {parsed.cons.map((item, idx) => (
                      <li key={idx} className="ai-bullet-item con-item">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Source Tag Badge */}
              <div className="ai-source-footer">
                <div className="ai-source-tag">
                  {isCache ? <Database size={13} /> : <Cpu size={13} />}
                  <span>{isCache ? t('ai_source_cache') : t('ai_source_groq')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .ai-modal-container {
          max-width: 640px;
        }

        .ai-modal-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .ai-modal-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(129, 140, 248, 0.15));
          border: 1px solid rgba(244, 63, 94, 0.35);
          color: #fca5a5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .ai-modal-title {
          font-size: 1.25rem;
          color: var(--text-primary);
        }

        .ai-modal-subtitle {
          font-size: 0.9rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .ai-loading-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem 1rem;
          gap: 1.25rem;
        }

        .ai-pulsing-loader {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-full);
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid var(--accent-amber);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-amber);
          animation: pulseGlow 1.5s infinite ease-in-out;
        }

        @keyframes pulseGlow {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 10px rgba(244, 63, 94, 0.2);
          }
          50% {
            transform: scale(1.08);
            box-shadow: 0 0 25px rgba(244, 63, 94, 0.45);
          }
        }

        .ai-loading-text {
          font-size: 0.95rem;
          color: var(--text-secondary);
          max-width: 380px;
        }

        .skeleton-lines-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
          margin-top: 0.5rem;
        }

        .ai-error-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          padding: 1rem;
          border-radius: var(--radius-md);
          color: #fca5a5;
        }

        .ai-content-wrap {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .ai-general-text {
          font-size: 0.95rem;
          color: var(--text-primary);
          line-height: 1.6;
          margin-bottom: 0.75rem;
        }

        .ai-bullet-group {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }

        .ai-bullet-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 0.85rem;
        }

        .pros-header {
          color: var(--score-emerald);
        }

        .cons-header {
          color: var(--mature-red);
        }

        .ai-bullet-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }

        .ai-bullet-item {
          font-size: 0.88rem;
          color: var(--text-secondary);
          position: relative;
          padding-left: 1.25rem;
          line-height: 1.5;
        }

        [dir="rtl"] .ai-bullet-item {
          padding-left: 0;
          padding-right: 1.25rem;
        }

        .pro-item::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--score-emerald);
          font-weight: bold;
          font-size: 1.2rem;
          line-height: 1;
        }

        [dir="rtl"] .pro-item::before {
          left: auto;
          right: 0;
        }

        .con-item::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--mature-red);
          font-weight: bold;
          font-size: 1.2rem;
          line-height: 1;
        }

        [dir="rtl"] .con-item::before {
          left: auto;
          right: 0;
        }

        .ai-source-footer {
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }

        .ai-source-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-size: 0.75rem;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-full);
          font-family: var(--font-mono);
        }
      `}</style>
    </div>,
    document.body
  );
};
