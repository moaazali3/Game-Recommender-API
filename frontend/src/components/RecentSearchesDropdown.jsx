import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { History, X, Sparkles } from 'lucide-react';

export const RecentSearchesDropdown = ({
  searches,
  onSelect,
  onRemove,
  onClear,
  isVisible
}) => {
  const { t } = useLanguage();

  if (!isVisible || !searches || searches.length === 0) return null;

  return (
    <div className="recent-searches-root">
      <div className="recent-searches-header">
        <div className="recent-title-group">
          <History size={14} color="var(--accent-amber)" />
          <span>{t('recent_searches_title')}</span>
        </div>
        <button
          type="button"
          className="recent-clear-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          {t('clear_recent')}
        </button>
      </div>

      <div className="recent-searches-list">
        {searches.map((term, index) => (
          <div
            key={index}
            className="recent-search-item"
            onMouseDown={() => onSelect(term)}
          >
            <div className="recent-item-text">
              <Sparkles size={13} className="recent-item-sparkle" />
              <span>{term}</span>
            </div>
            <button
              type="button"
              className="recent-item-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(term);
              }}
              title="Remove"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .recent-searches-root {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 0.75rem 0.5rem;
          z-index: 50;
          animation: recentFadeIn 150ms var(--ease-expo) forwards;
        }

        @keyframes recentFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .recent-searches-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.25rem 0.75rem 0.5rem;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: 0.35rem;
        }

        .recent-title-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .recent-clear-btn {
          font-size: 0.72rem;
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }

        .recent-clear-btn:hover {
          color: var(--mature-red);
        }

        .recent-searches-list {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .recent-search-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .recent-search-item:hover {
          background: var(--bg-surface-hover);
        }

        .recent-item-text {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .recent-item-sparkle {
          color: var(--accent-amber);
          opacity: 0.6;
        }

        .recent-item-remove {
          color: var(--text-muted);
          padding: 0.2rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .recent-item-remove:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};
