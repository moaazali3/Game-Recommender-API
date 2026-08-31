import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getSteamImage } from '../services/api';
import { useAmbientColor } from '../hooks/useAmbientColor';
import { Sparkles, GitMerge, ExternalLink, Share2, Check } from 'lucide-react';

export const TargetGameBanner = ({
  targetGameName,
  targetAppId,
  hasSeries,
  seriesId,
  onOpenAiSummary
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const coverUrl = targetAppId && !imgError
    ? getSteamImage(targetAppId)
    : null;

  const ambientGlow = useAmbientColor(coverUrl);

  const handleShare = () => {
    const url = `${window.location.origin}/?search=${encodeURIComponent(targetGameName)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <section
      className="target-banner-root"
      style={{
        boxShadow: `0 20px 50px -15px ${ambientGlow}, var(--shadow-md)`,
        borderColor: ambientGlow.replace('0.25', '0.4').replace('0.15', '0.3'),
      }}
    >
      {/* Background Ambient Aura */}
      <div
        className="target-banner-aura"
        style={{
          background: `radial-gradient(circle at 20% 50%, ${ambientGlow}, transparent 70%)`
        }}
      />

      <div className="target-banner-layout">
        {/* Cover Art */}
        <div className="target-banner-cover-wrap">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={targetGameName}
              className="target-banner-cover-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="target-banner-cover-placeholder">
              <span>{targetGameName.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Content & Actions */}
        <div className="target-banner-info">
          <div className="target-badge-row">
            <span className="target-pill">{t('target_badge')}</span>
            {targetAppId && (
              <span className="target-appid-pill">Steam ID: {targetAppId}</span>
            )}
          </div>

          <h2 className="target-game-title heading-display">
            {targetGameName}
          </h2>

          <div className="target-actions-row">
            {targetAppId && (
              <button
                type="button"
                className="btn btn-ai"
                onClick={() => onOpenAiSummary(targetAppId, targetGameName)}
              >
                <Sparkles size={16} />
                <span>{t('ai_summary_btn')}</span>
              </button>
            )}

            {hasSeries && seriesId && (
              <Link to={`/series?id=${seriesId}`} className="btn btn-secondary">
                <GitMerge size={16} />
                <span>{t('view_series')}</span>
              </Link>
            )}

            {targetAppId && (
              <a
                href={`https://store.steampowered.com/app/${targetAppId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-steam-prominent"
                style={{ padding: '0.65rem 1.15rem' }}
              >
                <ExternalLink size={16} />
                <span>{t('view_steam')}</span>
              </a>
            )}

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleShare}
              title={t('share_results')}
            >
              {copied ? <Check size={16} color="var(--score-emerald)" /> : <Share2 size={16} />}
              <span>{copied ? t('link_copied') : t('share_results')}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .target-banner-root {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-xl);
          overflow: hidden;
          margin-bottom: 2.5rem;
          transition: all var(--transition-normal);
        }

        .target-banner-aura {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.6;
        }

        .target-banner-layout {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 1.75rem 2rem;
        }

        .target-banner-cover-wrap {
          width: 320px;
          aspect-ratio: 460 / 215;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--bg-deep);
          border: 1px solid var(--border-medium);
          flex-shrink: 0;
          box-shadow: var(--shadow-md);
        }

        .target-banner-cover-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .target-banner-cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #151c2b, #202b42);
          font-family: var(--font-display);
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--text-muted);
        }

        .target-banner-info {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }

        .target-badge-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .target-pill {
          background: var(--accent-amber);
          color: #090c12;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.2rem 0.65rem;
          border-radius: var(--radius-full);
        }

        .target-appid-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          padding: 0.15rem 0.55rem;
          border-radius: var(--radius-full);
        }

        .target-game-title {
          font-size: 2rem;
          line-height: 1.2;
          color: var(--text-primary);
        }

        .target-actions-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        @media (max-width: 860px) {
          .target-banner-layout {
            flex-direction: column;
            align-items: flex-start;
            padding: 1.5rem;
          }
          .target-banner-cover-wrap {
            width: 100%;
          }
          .target-game-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </section>
  );
};
