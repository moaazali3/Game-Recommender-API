import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { X, Code2, Layers, Cpu, UserCheck, Sparkles } from 'lucide-react';

export const AboutModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface about-modal-surface" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="about-header">
          <div className="about-icon-box">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="heading-display about-title">{t('about_modal_title')}</h2>
            <p className="about-subtitle">v2.0 • Next-Gen Gaming Engine</p>
          </div>
        </div>

        {/* Narrative */}
        <div className="about-body">
          <p className="about-paragraph">{t('about_p1')}</p>
          <p className="about-paragraph">{t('about_p2')}</p>

          {/* Developer Spotlight Card */}
          <div className="about-card dev-card">
            <div className="dev-card-icon">
              <UserCheck size={22} />
            </div>
            <div className="dev-card-info">
              <span className="dev-label">{t('about_developer_title')}</span>
              <h3 className="dev-name highlight-amber">{t('about_developer_name')}</h3>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .about-modal-surface {
          max-width: 580px;
        }

        .about-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .about-icon-box {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #f43f5e, #be123c);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 20px var(--accent-amber-glow);
        }

        .about-title {
          font-size: 1.35rem;
          color: var(--text-primary);
        }

        .about-subtitle {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          margin-top: 0.15rem;
        }

        .about-body {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .about-paragraph {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.65;
        }

        .about-card {
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
        }

        .dev-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(15, 20, 31, 0.9));
          border-color: rgba(244, 63, 94, 0.35);
          padding: 1.25rem 1.5rem;
        }

        .dev-card-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-full);
          background: rgba(244, 63, 94, 0.18);
          color: var(--accent-amber);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .dev-card-info {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .dev-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent-amber);
        }

        .dev-name {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 900;
          color: var(--text-primary);
          letter-spacing: -0.01em;
        }
      `}</style>
    </div>,
    document.body
  );
};
