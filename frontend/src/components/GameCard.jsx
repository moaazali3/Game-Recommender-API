import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getSteamImage } from '../services/api';
import { ExternalLink, Sparkles, RefreshCw, GitMerge, ShieldAlert } from 'lucide-react';

export const GameCard = ({ game, onSelectSimilar, onOpenAiSummary, isLibrary = false }) => {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const appId = game.appid || game.appId || game.Appid || game.TargetAppId;
  const name = game.name || game.Name || 'Unknown Title';
  const score = game.matchscore || game.matchScore || game.MatchScore || 0;
  const isMature = game.isMature || game.IsMature || false;
  const hasSeries = game.hasseries || game.hasSeries || false;
  const seriesId = game.seriesid || game.seriesId;

  const similarityScore = game.similarityScore ?? game.SimilarityScore ?? game.similarity_score;

  // Process Tags
  let tagsList = [];
  const rawTags = game.tags || game.Tags || [];
  if (typeof rawTags === 'string') {
    tagsList = rawTags.split(',').map(t => t.trim()).filter(Boolean);
  } else if (Array.isArray(rawTags)) {
    tagsList = rawTags;
  }

  // Determine Match Score Badge Color Class (Calibrated for ML 56% ceiling)
  let scoreClass = 'score-badge--low';
  let scoreTooltip = '';

  if (similarityScore != null) {
    if (similarityScore >= 50) {
      // 50% - 56%+ : Top Tier Match (The practical peak of this model)
      scoreClass = 'score-badge--elite';
      scoreTooltip = `Top Match (${similarityScore}%)`;
    } else if (similarityScore >= 45) {
      // 45% - 49.9% : High Match
      scoreClass = 'score-badge--high';
      scoreTooltip = `High Match (${similarityScore}%)`;
    } else if (similarityScore >= 40) {
      // 40% - 44.9% : Good Match
      scoreClass = 'score-badge--mid';
      scoreTooltip = `Good Match (${similarityScore}%)`;
    } else {
      // < 40% : Moderate Match
      scoreClass = 'score-badge--low';
      scoreTooltip = `Similar (${similarityScore}%)`;
    }
  } else {
    if (score >= 15) {
      scoreClass = 'score-badge--elite';
    } else if (score >= 8) {
      scoreClass = 'score-badge--high';
    } else if (score >= 4) {
      scoreClass = 'score-badge--mid';
    }
    scoreTooltip = `${t('match_score')}: ${score}`;
  }

  const coverUrl = imgError || !appId
    ? `https://placehold.co/460x215/151c2b/94a3b8?text=${encodeURIComponent(name.slice(0, 16))}`
    : getSteamImage(appId);

  return (
    <article className="game-card-tactile">
      {/* Cover Image Container */}
      <div className="game-card-cover-wrap">
        <img
          src={coverUrl}
          alt={name}
          className="game-card-cover-img"
          loading="lazy"
          onError={() => setImgError(true)}
        />

        {/* Top-Right: Match Score Badge (Only for recommendations) */}
        {!isLibrary && (similarityScore != null || score > 0) && (
          <div
            className={`game-card-score-badge ${scoreClass}`}
            title={scoreTooltip}
          >
            <span>{similarityScore != null ? `${similarityScore}%` : score}</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>{similarityScore != null ? 'match' : 'pts'}</span>
          </div>
        )}

        {/* Top-Left: Badges (Mature & Series) */}
        <div className="game-card-badges-left">
          {isMature && (
            <span className="badge-mature">
              <ShieldAlert size={12} style={{ display: 'inline', verticalAlign: 'text-top', marginInlineEnd: '3px' }} />
              {t('mature_warning')}
            </span>
          )}
          {hasSeries && seriesId && (
            <Link
              to={`/series?id=${seriesId}`}
              className="badge-series"
              title={t('view_series')}
              onClick={(e) => e.stopPropagation()}
            >
              <GitMerge size={12} />
              <span>{t('view_series')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="game-card-body">
        <h3 className="game-card-title" title={name}>
          {name}
        </h3>

        {/* Tags */}
        {tagsList.length > 0 && (
          <div className="game-card-tags">
            {tagsList.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="game-tag-pill">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Controls - Structured 2-Row Layout to prevent button squishing */}
        <div className="game-card-actions-layout">
          {appId && (
            <button
              type="button"
              className="btn btn-ai card-ai-action-btn"
              onClick={() => onOpenAiSummary(appId, name)}
              title={t('ai_summary_btn')}
            >
              <Sparkles size={14} />
              <span>{t('ai_summary_btn')}</span>
            </button>
          )}

          <div className="card-secondary-actions-row">
            {appId && (
              <a
                href={`https://store.steampowered.com/app/${appId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-steam-prominent"
                title={t('view_steam')}
              >
                <ExternalLink size={14} />
                <span>{t('view_steam')}</span>
              </a>
            )}

            <button
              type="button"
              className="btn btn-secondary card-similar-btn"
              onClick={() => onSelectSimilar(name)}
              title={t('find_similar')}
            >
              <RefreshCw size={14} />
              <span>{t('find_similar')}</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .game-card-actions-layout {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: auto;
          width: 100%;
        }

        .card-ai-action-btn {
          width: 100%;
          padding: 0.55rem 0.75rem;
          font-size: 0.82rem;
          justify-content: center;
        }

        .card-secondary-actions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          width: 100%;
        }

        .btn-steam-prominent {
          background: #171d25;
          color: #66c0f4;
          border: 1px solid rgba(102, 192, 244, 0.3);
          padding: 0.5rem 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
          min-width: 0;
          text-align: center;
        }

        .btn-steam-prominent:hover {
          background: #1b2838;
          border-color: #66c0f4;
          color: #ffffff;
          box-shadow: 0 0 12px rgba(102, 192, 244, 0.25);
          transform: translateY(-2px);
        }

        .card-similar-btn {
          padding: 0.5rem 0.5rem;
          font-size: 0.8rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          min-width: 0;
          text-align: center;
        }
      `}</style>
    </article>
  );
};
