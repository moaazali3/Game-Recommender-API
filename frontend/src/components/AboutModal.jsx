import React from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { X, Sparkles, Cpu, Zap, GitMerge, UserCheck } from 'lucide-react';

export const AboutModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const features = [
    {
      icon: <Cpu size={20} />,
      title: t('about_feat_ml_title'),
      desc: t('about_feat_ml_desc'),
      gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(6, 182, 212, 0.05))',
      color: '#06b6d4'
    },
    {
      icon: <Zap size={20} />,
      title: t('about_feat_warmup_title'),
      desc: t('about_feat_warmup_desc'),
      gradient: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(234, 179, 8, 0.05))',
      color: '#eab308'
    },
    {
      icon: <GitMerge size={20} />,
      title: t('about_feat_fusion_title'),
      desc: t('about_feat_fusion_desc'),
      gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(168, 85, 247, 0.05))',
      color: '#a855f7'
    }
  ];

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
            <p className="about-subtitle">{t('about_subtitle')}</p>
          </div>
        </div>

        {/* Narrative & Highlights */}
        <div className="about-body">
          <p className="about-paragraph">{t('about_p1')}</p>
          <p className="about-paragraph">{t('about_p2')}</p>

          {/* Feature Highlights */}
          <div className="about-features-list">
            {features.map((feat, idx) => (
              <div key={idx} className="about-feature-item" style={{ background: feat.gradient }}>
                <div className="about-feature-icon" style={{ color: feat.color, borderColor: `${feat.color}40` }}>
                  {feat.icon}
                </div>
                <div className="about-feature-content">
                  <h4 className="about-feature-title" style={{ color: feat.color }}>{feat.title}</h4>
                  <p className="about-feature-desc">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

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
          max-width: 620px;
          max-height: 88vh;
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .about-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1.15rem;
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
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.4);
        }

        .about-title {
          font-size: 1.35rem;
          color: var(--text-primary);
        }

        .about-subtitle {
          font-size: 0.82rem;
          color: var(--accent-amber);
          font-family: var(--font-mono);
          margin-top: 0.2rem;
          font-weight: 600;
        }

        .about-body {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .about-paragraph {
          font-size: 0.93rem;
          color: var(--text-secondary);
          line-height: 1.65;
        }

        .about-features-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin: 0.35rem 0;
        }

        .about-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.9rem;
          padding: 0.9rem 1.1rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(8px);
        }

        .about-feature-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 0.15rem;
        }

        .about-feature-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .about-feature-title {
          font-size: 0.92rem;
          font-weight: 700;
          margin: 0;
        }

        .about-feature-desc {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
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
          padding: 1.1rem 1.35rem;
          margin-top: 0.25rem;
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
          gap: 0.25rem;
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
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--text-primary);
          letter-spacing: -0.01em;
          margin: 0;
        }

        @media (max-width: 640px) {
          .about-modal-surface {
            max-width: 95vw;
            padding: 1.25rem 1rem;
          }
          .about-feature-item {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};
