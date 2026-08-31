import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Compass, Sparkles } from 'lucide-react';

export const NotFound = () => {
  const { t } = useLanguage();

  return (
    <div className="not-found-container">
      <div className="not-found-code heading-display">404</div>
      <h1 className="not-found-title heading-display">{t('not_found_title')}</h1>
      <p className="not-found-desc">{t('not_found_desc')}</p>
      <Link to="/" className="btn btn-primary not-found-btn">
        <Compass size={18} />
        <span>{t('back_home')}</span>
      </Link>

      <style>{`
        .not-found-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 60vh;
          padding: 2rem 1.5rem;
        }

        .not-found-code {
          font-size: clamp(5rem, 15vw, 9rem);
          font-weight: 900;
          line-height: 1;
          color: transparent;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.4), rgba(255, 255, 255, 0.05));
          -webkit-background-clip: text;
          margin-bottom: 0.5rem;
          user-select: none;
        }

        .not-found-title {
          font-size: 1.8rem;
          margin-bottom: 0.75rem;
          color: var(--text-primary);
        }

        .not-found-desc {
          font-size: 1rem;
          color: var(--text-secondary);
          max-width: 420px;
          margin-bottom: 2rem;
        }

        .not-found-btn {
          padding: 0.85rem 1.75rem;
          border-radius: var(--radius-lg);
        }
      `}</style>
    </div>
  );
};
