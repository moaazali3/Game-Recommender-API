import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { fetchSeriesTimeline, fetchSeriesAutocomplete } from '../services/api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { GitMerge, Search, Sparkles, Filter, Calendar, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export const Series = () => {
  const { t, isRTL } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const seriesIdFromUrl = searchParams.get('id');

  const [seriesQuery, setSeriesQuery] = useState('');
  const [seriesSuggestions, setSeriesSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [onlyMainline, setOnlyMainline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timelineData, setTimelineData] = useState(null);

  const debounceTimer = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (seriesIdFromUrl) {
      loadTimeline(seriesIdFromUrl, onlyMainline);
    } else {
      setTimelineData(null);
      setError(null);
    }
  }, [seriesIdFromUrl, onlyMainline]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSeriesQuery(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (val.trim().length >= 2) {
      debounceTimer.current = setTimeout(async () => {
        try {
          const results = await fetchSeriesAutocomplete(val);
          setSeriesSuggestions(results);
          setShowSuggestions(true);
        } catch {
          setSeriesSuggestions([]);
        }
      }, 250);
    } else {
      setSeriesSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const loadTimeline = async (id, mainlineFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSeriesTimeline(id, mainlineFilter);
      setTimelineData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load timeline');
      setLoading(false);
    }
  };

  const handleSelectSeries = (s) => {
    const id = s.id || s.Id;
    const name = s.name || s.Name;
    setSeriesQuery(name);
    setShowSuggestions(false);
    setSearchParams({ id });
  };

  const timelineList = timelineData?.Timeline || timelineData?.timeline || [];
  const seriesName = timelineData?.SeriesName || timelineData?.seriesName || '';

  return (
    <div className="series-page-root">
      {/* Series Hero Section */}
      <section className="series-hero">
        <div className="hero-badge">
          <GitMerge size={14} />
          <span>{t('series_hero_badge')}</span>
        </div>

        <h1 className="hero-title heading-display">
          {t('series_title_prefix')}{' '}
          <span className="highlight-amber">{t('series_title_highlight')}</span>
        </h1>

        <p className="hero-subtitle">
          {t('series_subtitle')}
        </p>

        {/* Series Search Autocomplete */}
        <div className="series-search-container" ref={containerRef}>
          <div className="series-search-box">
            <Search size={19} className="search-icon-inside" />
            <input
              type="text"
              className="series-search-input"
              value={seriesQuery}
              onChange={handleInputChange}
              placeholder={t('series_search_placeholder')}
              autoComplete="off"
            />
          </div>

          {showSuggestions && seriesSuggestions.length > 0 && (
            <div className="series-autocomplete-list">
              {seriesSuggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="series-autocomplete-item"
                  onMouseDown={() => handleSelectSeries(item)}
                >
                  <GitMerge size={15} color="var(--accent-amber)" />
                  <span>{item.name || item.Name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <div className="series-content-area">
        {/* Loading State */}
        {loading && (
          <div className="timeline-loading-wrap">
            <SkeletonLoader variant="timeline-item" count={5} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="error-state-card">
            <div className="error-icon-box">
              <AlertCircle size={32} />
            </div>
            <h3 className="error-title heading-display">{t('error_generic')}</h3>
            <p className="error-desc">{error}</p>
          </div>
        )}

        {/* Empty State (No Series Selected) */}
        {!seriesIdFromUrl && !loading && !error && (
          <div className="series-empty-state">
            <div className="empty-icon-circle">
              <GitMerge size={36} />
            </div>
            <h3 className="empty-title heading-display">{t('series_empty_title')}</h3>
            <p className="empty-desc">{t('series_empty_desc')}</p>
            <div className="popular-series-pills">
              {['Resident Evil', 'Dark Souls', "Assassin's Creed", 'God of War', 'Final Fantasy', 'Yakuza'].map((franchise) => (
                <button
                  key={franchise}
                  type="button"
                  className="series-quick-pill"
                  onClick={async () => {
                    setSeriesQuery(franchise);
                    const res = await fetchSeriesAutocomplete(franchise);
                    if (res && res.length > 0) {
                      handleSelectSeries(res[0]);
                    }
                  }}
                >
                  <span>{franchise}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {timelineData && !loading && !error && (
          <div className="timeline-section">
            {/* Timeline Toolbar Header */}
            <div className="timeline-toolbar">
              <div className="timeline-series-title-wrap">
                <span className="timeline-franchise-label">{t('nav_series')}</span>
                <h2 className="timeline-series-title heading-display">
                  {seriesName} <span className="highlight-amber">Timeline</span>
                </h2>
              </div>

              {/* Mainline Toggle Switch */}
              <label className="mainline-toggle-box">
                <input
                  type="checkbox"
                  checked={onlyMainline}
                  onChange={(e) => setOnlyMainline(e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider" />
                <span className="toggle-text">{t('mainline_toggle_label')}</span>
              </label>
            </div>

            {/* Vertical Timeline Tree */}
            <div className="timeline-tree">
              <div className="timeline-spine-line" />

              {timelineList.map((item, index) => {
                const isMainline = item.IsMainline ?? item.isMainline;
                const releaseDate = item.ReleaseDate || item.releaseDate;
                const cover = item.CoverImageUrl || item.coverImageUrl;
                const title = item.Title || item.title;
                const storyOrder = item.ChronologicalOrder ?? item.chronologicalOrder ?? (index + 1);

                return (
                  <div
                    key={item.Id || item.id || index}
                    className="timeline-entry"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    {/* Node Marker */}
                    <div className="timeline-node-marker">
                      <span>{storyOrder}</span>
                    </div>

                    {/* Timeline Card */}
                    <div className="timeline-entry-card">
                      <div className="timeline-card-image-wrap">
                        {cover ? (
                          <img
                            src={cover}
                            alt={title}
                            className="timeline-card-image"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = `https://placehold.co/140x90/151c2b/94a3b8?text=${encodeURIComponent(title.slice(0, 10))}`;
                            }}
                          />
                        ) : (
                          <div className="timeline-card-image-fallback">
                            <span>{title.slice(0, 2)}</span>
                          </div>
                        )}
                      </div>

                      <div className="timeline-card-details">
                        <div className="timeline-badges-row">
                          <span className={`timeline-badge ${isMainline ? 'timeline-badge--mainline' : 'timeline-badge--spinoff'}`}>
                            {isMainline ? t('mainline_badge') : t('spinoff_badge')}
                          </span>
                          {releaseDate && (
                            <span className="timeline-date-tag">
                              <Calendar size={12} />
                              <span>{releaseDate}</span>
                            </span>
                          )}
                        </div>

                        <h4 className="timeline-game-title heading-display">{title}</h4>

                        <div className="timeline-actions">
                          <Link
                            to={`/?search=${encodeURIComponent(title)}`}
                            className="btn btn-ghost timeline-similar-link"
                          >
                            <span>{t('find_similar')}</span>
                            {isRTL ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .series-page-root {
          display: flex;
          flex-direction: column;
        }

        .series-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3rem 1rem 2.5rem;
          max-width: 820px;
          margin: 0 auto;
        }

        .series-search-container {
          position: relative;
          width: 100%;
          max-width: 640px;
        }

        .series-search-box {
          display: flex;
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-xl);
          padding: 0.75rem 1.25rem;
          box-shadow: var(--shadow-md);
          transition: all var(--transition-normal);
        }

        .series-search-box:focus-within {
          border-color: var(--accent-amber);
          box-shadow: 0 0 25px var(--accent-amber-glow), var(--shadow-md);
        }

        .series-search-input {
          flex: 1;
          background: transparent;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .series-autocomplete-list {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 0.5rem;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .series-autocomplete-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.65rem 0.85rem;
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: 0.92rem;
          color: var(--text-primary);
          transition: all var(--transition-fast);
        }

        .series-autocomplete-item:hover {
          background: var(--bg-surface-hover);
          color: var(--accent-amber);
        }

        .series-content-area {
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .series-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 4rem 1.5rem;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          gap: 1.25rem;
        }

        .empty-icon-circle {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-full);
          background: rgba(244, 63, 94, 0.12);
          color: var(--accent-amber);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-title {
          font-size: 1.5rem;
          color: var(--text-primary);
        }

        .empty-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          max-width: 480px;
          line-height: 1.6;
        }

        .popular-series-pills {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .series-quick-pill {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-full);
          font-size: 0.85rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .series-quick-pill:hover {
          background: var(--bg-surface-hover);
          color: var(--accent-amber);
          border-color: var(--border-active);
          transform: translateY(-2px);
        }

        .timeline-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .timeline-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          gap: 1rem;
          flex-wrap: wrap;
        }

        .timeline-series-title-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .timeline-franchise-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .timeline-series-title {
          font-size: 1.45rem;
          color: var(--text-primary);
        }

        .mainline-toggle-box {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          user-select: none;
        }

        .toggle-checkbox {
          display: none;
        }

        .toggle-slider {
          position: relative;
          width: 44px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-full);
          transition: all var(--transition-normal);
          border: 1px solid var(--border-medium);
        }

        .toggle-slider::after {
          content: '';
          position: absolute;
          top: 3px;
          left: 3px;
          width: 16px;
          height: 16px;
          border-radius: var(--radius-full);
          background: #ffffff;
          transition: all var(--transition-normal);
        }

        [dir="rtl"] .toggle-slider::after {
          left: auto;
          right: 3px;
        }

        .toggle-checkbox:checked + .toggle-slider {
          background: var(--accent-amber);
        }

        .toggle-checkbox:checked + .toggle-slider::after {
          transform: translateX(20px);
          background: #ffffff;
        }

        [dir="rtl"] .toggle-checkbox:checked + .toggle-slider::after {
          transform: translateX(-20px);
        }

        .toggle-text {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        /* Timeline Tree */
        .timeline-tree {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-left: 2.5rem;
        }

        [dir="rtl"] .timeline-tree {
          padding-left: 0;
          padding-right: 2.5rem;
        }

        .timeline-spine-line {
          position: absolute;
          top: 1rem;
          bottom: 1rem;
          left: 17px;
          width: 2px;
          background: linear-gradient(to bottom, var(--accent-amber), rgba(244, 63, 94, 0.2) 80%, transparent);
        }

        [dir="rtl"] .timeline-spine-line {
          left: auto;
          right: 17px;
        }

        .timeline-entry {
          position: relative;
          display: flex;
          align-items: center;
          animation: timelineFadeIn 350ms var(--ease-expo) backwards;
        }

        @keyframes timelineFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .timeline-node-marker {
          position: absolute;
          left: -2.5rem;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: var(--bg-surface);
          border: 2px solid var(--accent-amber);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--accent-amber);
          box-shadow: 0 0 15px var(--accent-amber-glow);
          z-index: 2;
        }

        [dir="rtl"] .timeline-node-marker {
          left: auto;
          right: -2.5rem;
        }

        .timeline-entry-card {
          width: 100%;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          transition: all var(--transition-normal);
        }

        .timeline-entry-card:hover {
          border-color: var(--border-medium);
          transform: translateX(4px);
          box-shadow: var(--shadow-md);
        }

        [dir="rtl"] .timeline-entry-card:hover {
          transform: translateX(-4px);
        }

        .timeline-card-image-wrap {
          width: 110px;
          aspect-ratio: 16 / 10;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--bg-deep);
          flex-shrink: 0;
        }

        .timeline-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .timeline-card-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .timeline-card-details {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
        }

        .timeline-badges-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .timeline-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-xs);
        }

        .timeline-badge--mainline {
          background: var(--mainline-blue-bg);
          color: var(--mainline-blue);
          border: 1px solid rgba(56, 189, 248, 0.25);
        }

        .timeline-badge--spinoff {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          border: 1px solid var(--border-subtle);
        }

        .timeline-date-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .timeline-game-title {
          font-size: 1.15rem;
          color: var(--text-primary);
          margin-top: 0.1rem;
        }

        .timeline-similar-link {
          align-self: flex-start;
          padding: 0.25rem 0;
          font-size: 0.82rem;
          color: var(--accent-amber);
          gap: 0.35rem;
        }

        .timeline-similar-link:hover {
          background: transparent;
          text-decoration: underline;
        }

        @media (max-width: 640px) {
          .series-hero {
            padding: 2rem 0.5rem 1.25rem;
          }
          .hero-title {
            font-size: 1.85rem;
          }
          .series-search-box {
            padding: 0.6rem 1rem;
          }
          .timeline-toolbar {
            padding: 1rem;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          .timeline-tree {
            padding-left: 2rem;
          }
          [dir="rtl"] .timeline-tree {
            padding-left: 0;
            padding-right: 2rem;
          }
          .timeline-node-marker {
            left: -2rem;
            width: 30px;
            height: 30px;
            font-size: 0.75rem;
          }
          [dir="rtl"] .timeline-node-marker {
            left: auto;
            right: -2rem;
          }
          .timeline-spine-line {
            left: 14px;
          }
          [dir="rtl"] .timeline-spine-line {
            left: auto;
            right: 14px;
          }
          .timeline-entry-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.85rem 1rem;
          }
          .timeline-card-image-wrap {
            width: 100%;
            aspect-ratio: 460 / 215;
          }
          .popular-series-pills {
            gap: 0.35rem;
          }
          .series-quick-pill {
            font-size: 0.8rem;
            padding: 0.4rem 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};
