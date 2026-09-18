import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { X, Sparkles, Cpu, Zap, GitMerge, Code2, Users, ExternalLink } from 'lucide-react';

export const AboutModal = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

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
            <Sparkles size={22} />
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

          {/* Project Engineering & Contributors */}
          <div className="about-team-section">
            <div className="about-team-heading">
              <Users size={18} className="team-heading-icon" />
              <h3 className="about-team-title">{t('about_team_title')}</h3>
            </div>

            <div className="about-team-list">
              {/* Moaaz Card */}
              <div className="team-member-card moaaz-card">
                <div className="team-member-header">
                  <div className="team-avatar-box moaaz-avatar">
                    <Code2 size={20} />
                  </div>
                  <div className="team-header-info">
                    <div className="member-name-row">
                      <h4 className="member-name highlight-amber">{t('about_dev1_name')}</h4>
                    </div>
                    <span className="member-role">{t('about_dev1_role')}</span>
                  </div>
                </div>
                <p className="member-desc">{t('about_dev1_desc')}</p>
              </div>

              {/* Abdallah Card */}
              <div className="team-member-card abdallah-card">
                <div className="team-member-header">
                  <div className="team-avatar-box abdallah-avatar">
                    <Cpu size={20} />
                  </div>
                  <div className="team-header-info">
                    <div className="member-name-row">
                      <h4 className="member-name highlight-cyan">{t('about_dev2_name')}</h4>
                      <a
                        href="https://www.linkedin.com/in/abdallahabukhalil/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="member-social-link"
                        aria-label={t('about_view_linkedin')}
                        title={t('about_view_linkedin')}
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                    <span className="member-role ml-badge">{t('about_dev2_role')}</span>
                  </div>
                </div>
                <p className="member-desc">{t('about_dev2_desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .about-modal-surface {
          max-width: 580px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          box-sizing: border-box;
        }

        .about-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
          padding-bottom: 1.15rem;
          border-bottom: 1px solid var(--border-subtle);
          width: 100%;
          box-sizing: border-box;
        }

        .about-icon-box {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #f43f5e, #be123c);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(244, 63, 94, 0.35);
        }

        .about-title {
          font-size: 1.3rem;
          color: var(--text-primary);
          line-height: 1.3;
          margin: 0;
        }

        .about-subtitle {
          font-size: 0.8rem;
          color: var(--accent-amber);
          font-family: var(--font-mono);
          margin-top: 0.2rem;
          font-weight: 600;
        }

        .about-body {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .about-paragraph {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.65;
          word-break: break-word;
          overflow-wrap: break-word;
          margin: 0;
        }

        .about-features-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          box-sizing: border-box;
        }

        .about-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 0.9rem;
          padding: 0.85rem 1.1rem;
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(8px);
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
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
          flex: 1;
          min-width: 0;
        }

        .about-feature-title {
          font-size: 0.92rem;
          font-weight: 700;
          margin: 0;
          word-break: break-word;
        }

        .about-feature-desc {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
          word-break: break-word;
        }

        /* Team Section */
        .about-team-section {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin-top: 0.25rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-subtle);
          width: 100%;
          box-sizing: border-box;
        }

        .about-team-heading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .team-heading-icon {
          color: var(--accent-amber);
        }

        .about-team-title {
          font-size: 0.98rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .about-team-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          width: 100%;
          box-sizing: border-box;
        }

        .team-member-card {
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1rem 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }

        .team-member-card:hover {
          transform: translateY(-2px);
        }

        .moaaz-card {
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.08), rgba(15, 20, 31, 0.85));
          border-color: rgba(244, 63, 94, 0.25);
        }

        .moaaz-card:hover {
          border-color: rgba(244, 63, 94, 0.5);
          box-shadow: 0 4px 20px rgba(244, 63, 94, 0.15);
        }

        .abdallah-card {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(15, 20, 31, 0.85));
          border-color: rgba(6, 182, 212, 0.25);
        }

        .abdallah-card:hover {
          border-color: rgba(6, 182, 212, 0.5);
          box-shadow: 0 4px 20px rgba(6, 182, 212, 0.15);
        }

        .team-member-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          width: 100%;
          min-width: 0;
        }

        .team-avatar-box {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .moaaz-avatar {
          background: rgba(244, 63, 94, 0.18);
          color: var(--accent-amber);
          border: 1px solid rgba(244, 63, 94, 0.35);
        }

        .abdallah-avatar {
          background: rgba(6, 182, 212, 0.18);
          color: #06b6d4;
          border: 1px solid rgba(6, 182, 212, 0.35);
        }

        .team-header-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
          flex: 1;
        }

        .member-name-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: space-between;
          width: 100%;
          min-width: 0;
        }

        .member-name {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.01em;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        .highlight-cyan {
          color: #38bdf8;
        }

        .member-social-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          background: rgba(6, 182, 212, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(6, 182, 212, 0.35);
          transition: all 0.2s ease;
          flex-shrink: 0;
          text-decoration: none;
        }

        .member-social-link:hover {
          background: #06b6d4;
          color: #0b1120;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
          transform: scale(1.08);
        }

        .member-role {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--accent-amber);
          line-height: 1.35;
          word-break: break-word;
        }

        .member-role.ml-badge {
          color: #38bdf8;
        }

        .member-desc {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.55;
          margin: 0;
          word-break: break-word;
          overflow-wrap: break-word;
        }

        @media (max-width: 640px) {
          .about-modal-surface {
            max-width: 100%;
            padding: 1.25rem 1rem;
            max-height: 88vh;
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
