import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useRecentSearches } from '../hooks/useRecentSearches';
import { fetchRecommendations, fetchGameAutocomplete, fetchBlendRecommendations } from '../services/api';
import { TargetGameBanner } from '../components/TargetGameBanner';
import { GameCard } from '../components/GameCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { RecentSearchesDropdown } from '../components/RecentSearchesDropdown';
import { AiSummaryModal } from '../components/AiSummaryModal';
import { Search, Sparkles, AlertCircle, RefreshCw, Compass, Layers, X, Plus } from 'lucide-react';

export const Home = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { recentSearches, addSearch, removeSearch, clearSearches } = useRecentSearches();

  // Mode: 'single' | 'blend'
  const [searchMode, setSearchMode] = useState('single');
  const [blendGames, setBlendGames] = useState([]);

  const [query, setQuery] = useState(searchParams.get('search') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultData, setResultData] = useState(null);

  // AI Modal State
  const [aiModalAppId, setAiModalAppId] = useState(null);
  const [aiModalGameTitle, setAiModalGameTitle] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Execute search when URL parameter changes or on load
  useEffect(() => {
    const urlQuery = searchParams.get('search');
    if (urlQuery && urlQuery.trim() && searchMode === 'single') {
      setQuery(urlQuery);
      executeSearch(urlQuery);
    }
  }, [searchParams]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete debouncing
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (val.trim().length >= 1) {
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const results = await fetchGameAutocomplete(val);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        }
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const executeSearch = async (searchTerm) => {
    const clean = searchTerm.trim();
    if (!clean) return;

    setShowSuggestions(false);
    setIsInputFocused(false);
    setLoading(true);
    setError(null);
    setResultData(null);

    // Update URL & Recent Searches
    setSearchParams({ search: clean });
    addSearch(clean);

    try {
      const data = await fetchRecommendations(clean);
      setResultData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Game not found');
      setLoading(false);
    }
  };

  const executeBlendSearch = async () => {
    if (blendGames.length === 0) return;

    setShowSuggestions(false);
    setIsInputFocused(false);
    setLoading(true);
    setError(null);
    setResultData(null);

    try {
      const data = await fetchBlendRecommendations(blendGames);
      setResultData(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to blend games');
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (searchMode === 'blend') {
      if (query.trim() && blendGames.length < 4) {
        setBlendGames([...blendGames, query.trim()]);
        setQuery('');
      } else if (blendGames.length > 0) {
        executeBlendSearch();
      }
    } else {
      executeSearch(query);
    }
  };

  const handleSelectSuggestion = (suggestedName) => {
    if (searchMode === 'blend') {
      if (blendGames.length < 4 && !blendGames.includes(suggestedName)) {
        setBlendGames([...blendGames, suggestedName]);
      }
      setQuery('');
      setShowSuggestions(false);
    } else {
      setQuery(suggestedName);
      executeSearch(suggestedName);
    }
  };

  const removeBlendChip = (indexToRemove) => {
    setBlendGames(blendGames.filter((_, i) => i !== indexToRemove));
  };

  const openAiSummary = (appId, title) => {
    setAiModalAppId(appId);
    setAiModalGameTitle(title);
    setIsAiModalOpen(true);
  };

  const recList = resultData?.Recommendations || resultData?.recommendations || [];
  const targetGamesList = resultData?.TargetGames || resultData?.targetGames || [];

  return (
    <div className="home-root">
      {/* Hero Header */}
      <section className="home-hero">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>{t('hero_badge')}</span>
        </div>

        <h1 className="hero-title heading-display">
          {t('hero_title_prefix')}{' '}
          <span className="highlight-amber">{t('hero_title_highlight')}</span>
        </h1>

        <p className="hero-subtitle">
          {t('hero_subtitle')}
        </p>

        {/* Mode Switcher Pills */}
        <div className="search-mode-tabs">
          <button
            type="button"
            className={`mode-tab-btn ${searchMode === 'single' ? 'mode-tab-btn--active' : ''}`}
            onClick={() => {
              setSearchMode('single');
              setResultData(null);
            }}
          >
            <Compass size={15} />
            <span>Single Game Search</span>
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${searchMode === 'blend' ? 'mode-tab-btn--active' : ''}`}
            onClick={() => {
              setSearchMode('blend');
              setResultData(null);
            }}
          >
            <Layers size={15} />
            <span>{t('blend_mode_label')}</span>
          </button>
        </div>

        {/* Search Bar Container */}
        <div className="search-bar-wrapper" ref={searchContainerRef}>
          {/* Blend Chips Bar (When in Blend Mode) */}
          {searchMode === 'blend' && (
            <div className="blend-chips-container">
              {blendGames.map((gameName, idx) => (
                <span key={idx} className="blend-chip">
                  <span>{gameName}</span>
                  <button
                    type="button"
                    className="blend-chip-remove"
                    onClick={() => removeBlendChip(idx)}
                    title={t('blend_remove')}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
              {blendGames.length < 4 && (
                <span className="blend-chips-hint">
                  {blendGames.length === 0 ? t('blend_mode_hint') : `(${blendGames.length}/4)`}
                </span>
              )}
            </div>
          )}

          <form className="search-form" onSubmit={handleFormSubmit}>
            <Search size={20} className="search-icon-inside" />
            <input
              type="text"
              className="search-input"
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsInputFocused(true)}
              placeholder={searchMode === 'blend' ? t('blend_add_placeholder') : t('search_placeholder')}
              autoComplete="off"
            />
            {searchMode === 'blend' ? (
              <div className="blend-form-actions">
                {query.trim() && blendGames.length < 4 && (
                  <button
                    type="button"
                    className="btn btn-secondary blend-add-btn"
                    onClick={() => {
                      if (query.trim()) {
                        setBlendGames([...blendGames, query.trim()]);
                        setQuery('');
                      }
                    }}
                  >
                    <Plus size={15} />
                    <span>Add</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary search-submit-btn"
                  disabled={blendGames.length === 0 && !query.trim()}
                  onClick={() => {
                    if (query.trim() && blendGames.length < 4 && !blendGames.includes(query.trim())) {
                      const updated = [...blendGames, query.trim()];
                      setBlendGames(updated);
                      setQuery('');
                      fetchBlendRecommendations(updated).then(d => {
                        setResultData(d);
                        setLoading(false);
                      }).catch(err => {
                        setError(err.message);
                        setLoading(false);
                      });
                    } else {
                      executeBlendSearch();
                    }
                  }}
                >
                  <Layers size={15} />
                  <span>{t('blend_btn')}</span>
                </button>
              </div>
            ) : (
              <button type="submit" className="btn btn-primary search-submit-btn">
                <span>{t('search_btn')}</span>
              </button>
            )}
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="autocomplete-item"
                  onMouseDown={() => handleSelectSuggestion(item.name || item.Name)}
                >
                  <Compass size={14} className="autocomplete-icon" />
                  <span className="autocomplete-name">{item.name || item.Name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent Searches Dropdown (when query is short and input is focused in single mode) */}
          {searchMode === 'single' && (
            <RecentSearchesDropdown
              searches={recentSearches}
              isVisible={isInputFocused && query.trim().length < 2 && !showSuggestions}
              onSelect={(term) => {
                setQuery(term);
                executeSearch(term);
              }}
              onRemove={removeSearch}
              onClear={clearSearches}
            />
          )}
        </div>
      </section>

      {/* Loading Skeletons */}
      {loading && (
        <div className="results-loading-section">
          <div className="loading-status-bar">
            <RefreshCw size={18} className="spin-icon" />
            <span>{t('loading_searching')}</span>
          </div>
          <SkeletonLoader variant="target" />
          <SkeletonLoader variant="card" count={8} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="error-state-card">
          <div className="error-icon-box">
            <AlertCircle size={32} />
          </div>
          <h3 className="error-title heading-display">{t('error_not_found_title')}</h3>
          <p className="error-desc">{t('error_not_found_desc')}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => searchMode === 'blend' ? executeBlendSearch() : executeSearch(query)}
          >
            <RefreshCw size={16} />
            <span>{t('try_again')}</span>
          </button>
        </div>
      )}

      {/* Results View */}
      {resultData && !loading && (
        <div className="results-view-section">
          {/* Target Game Spotlight (Single Mode vs Blend Mode) */}
          {searchMode === 'blend' || targetGamesList.length > 0 ? (
            <div className="blended-target-spotlight">
              <div className="blended-spotlight-header">
                <div className="blended-icon-box">
                  <Layers size={22} />
                </div>
                <div>
                  <span className="badge badge-amber">{t('blend_target_title')}</span>
                  <h2 className="blended-title heading-display">{t('blend_selected_games')}</h2>
                </div>
              </div>
              <div className="blended-games-pills">
                {(targetGamesList.length > 0 ? targetGamesList : blendGames.map(n => ({ Name: n }))).map((g, i) => (
                  <span key={i} className="blended-target-pill">
                    <Compass size={14} color="var(--accent-amber)" />
                    <span>{g.Name || g.name || g}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <TargetGameBanner
              targetGameName={resultData.TargetGame || resultData.targetGame || query}
              targetAppId={resultData.TargetAppId || resultData.targetAppId}
              hasSeries={resultData.HasSeries || resultData.hasSeries}
              seriesId={resultData.SeriesId || resultData.seriesId}
              onOpenAiSummary={openAiSummary}
            />
          )}

          {/* Recommendations Header */}
          <div className="recommendations-header">
            <div className="rec-title-group" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
              <h3 className="rec-section-title heading-display">{t('recommendations_title')}</h3>
              <span className="rec-count-badge">
                {recList.length} {t('recommendations_count')}
              </span>
              {(resultData?.Source === 'machine_learning' || resultData?.source === 'machine_learning') && (
                <span className="badge-engine badge-engine--ml" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  letterSpacing: '0.02em'
                }}>
                  <Sparkles size={13} />
                  <span>ML Neural Engine</span>
                </span>
              )}
              {(resultData?.Source === 'heuristic' || resultData?.source === 'heuristic') && (
                <span className="badge-engine badge-engine--heuristic" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <Compass size={13} />
                  <span>Smart Tag Matching</span>
                </span>
              )}
            </div>
          </div>

          {/* Recommendations Grid */}
          <div className="recommendations-grid">
            {recList.map((game, idx) => (
              <GameCard
                key={game.appid || game.Appid || idx}
                game={game}
                onSelectSimilar={(name) => {
                  if (searchMode === 'blend') {
                    if (blendGames.length < 4 && !blendGames.includes(name)) {
                      setBlendGames([...blendGames, name]);
                    }
                  } else {
                    setQuery(name);
                    executeSearch(name);
                  }
                }}
                onOpenAiSummary={openAiSummary}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Review Summary Modal */}
      <AiSummaryModal
        appId={aiModalAppId}
        gameTitle={aiModalGameTitle}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      <style>{`
        .home-root {
          display: flex;
          flex-direction: column;
        }

        .home-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3.5rem 1rem 3rem;
          max-width: 860px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.35);
          color: #fca5a5;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.35rem 0.9rem;
          border-radius: var(--radius-full);
          margin-bottom: 1.5rem;
        }

        .hero-title {
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          line-height: 1.1;
          margin-bottom: 1.25rem;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: var(--text-secondary);
          max-width: 620px;
          line-height: 1.6;
          margin-bottom: 1.75rem;
        }

        .search-mode-tabs {
          display: inline-flex;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          padding: 0.25rem;
          border-radius: var(--radius-full);
          gap: 0.35rem;
          margin-bottom: 1.5rem;
        }

        .mode-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 1rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-muted);
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }

        .mode-tab-btn:hover {
          color: var(--text-primary);
        }

        .mode-tab-btn--active {
          background: var(--bg-surface-elevated);
          color: var(--accent-amber);
          border: 1px solid rgba(244, 63, 94, 0.4);
          box-shadow: 0 0 12px var(--accent-amber-glow);
        }

        .blend-chips-container {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          justify-content: center;
        }

        .blend-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(21, 28, 43, 0.9));
          border: 1px solid var(--accent-amber);
          color: var(--text-primary);
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          font-weight: 600;
          animation: fadeIn 0.2s ease-out;
        }

        .blend-chip-remove {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .blend-chip-remove:hover {
          background: var(--mature-red);
          color: #ffffff;
        }

        .blend-chips-hint {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .blend-form-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .blend-add-btn {
          padding: 0.55rem 0.85rem;
          font-size: 0.82rem;
        }

        .blended-target-spotlight {
          background: linear-gradient(135deg, rgba(244, 63, 94, 0.1), rgba(21, 28, 43, 0.9));
          border: 1px solid rgba(244, 63, 94, 0.35);
          border-radius: var(--radius-xl);
          padding: 1.75rem 2rem;
          margin-bottom: 2.5rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .blended-spotlight-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .blended-icon-box {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #f43f5e, #be123c);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px var(--accent-amber-glow);
        }

        .blended-title {
          font-size: 1.5rem;
          color: var(--text-primary);
          margin-top: 0.25rem;
        }

        .blended-games-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
        }

        .blended-target-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-medium);
          padding: 0.45rem 0.95rem;
          border-radius: var(--radius-full);
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .search-bar-wrapper {
          position: relative;
          width: 100%;
          max-width: 680px;
        }

        .search-form {
          display: flex;
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-xl);
          padding: 0.45rem 0.5rem 0.45rem 1.25rem;
          box-shadow: var(--shadow-md);
          transition: all var(--transition-normal);
        }

        [dir="rtl"] .search-form {
          padding: 0.45rem 1.25rem 0.45rem 0.5rem;
        }

        .search-form:focus-within {
          border-color: var(--accent-amber);
          box-shadow: 0 0 25px var(--accent-amber-glow), var(--shadow-md);
        }

        .search-icon-inside {
          color: var(--text-muted);
          flex-shrink: 0;
          margin-right: 0.75rem;
        }

        [dir="rtl"] .search-icon-inside {
          margin-right: 0;
          margin-left: 0.75rem;
        }

        .search-input {
          flex: 1;
          background: transparent;
          font-size: 1rem;
          color: var(--text-primary);
          padding: 0.5rem 0;
        }

        .search-input::placeholder {
          color: var(--text-muted);
          font-size: 0.95rem;
        }

        .search-submit-btn {
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-lg);
          font-size: 0.95rem;
        }

        .autocomplete-dropdown {
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

        .autocomplete-item {
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

        .autocomplete-item:hover {
          background: var(--bg-surface-hover);
          color: var(--accent-amber);
        }

        .autocomplete-icon {
          color: var(--text-muted);
        }

        .results-loading-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          margin-top: 1rem;
        }

        .loading-status-bar {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: #fca5a5;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0.65rem 1.25rem;
          border-radius: var(--radius-full);
          align-self: center;
          margin-bottom: 0.5rem;
          box-shadow: 0 0 16px var(--accent-amber-glow);
        }

        .spin-icon {
          animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-state-card {
          background: var(--bg-surface);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-xl);
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1rem;
          max-width: 540px;
          margin: 2rem auto;
        }

        .error-icon-box {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-full);
          background: rgba(239, 68, 68, 0.15);
          color: var(--mature-red);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-title {
          font-size: 1.4rem;
          color: var(--text-primary);
        }

        .error-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          max-width: 420px;
          line-height: 1.5;
          margin-bottom: 0.5rem;
        }

        .results-view-section {
          margin-top: 1rem;
        }

        .recommendations-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .rec-title-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .rec-section-title {
          font-size: 1.45rem;
          color: var(--text-primary);
        }

        .rec-count-badge {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 0.8rem;
          padding: 0.2rem 0.65rem;
          border-radius: var(--radius-full);
          font-weight: 600;
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 640px) {
          .home-hero {
            padding: 2rem 0.25rem 1.5rem;
          }
          .hero-title {
            font-size: 2.1rem;
          }
          .hero-subtitle {
            font-size: 0.95rem;
          }
          .search-mode-tabs {
            width: 100%;
            max-width: 330px;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          .mode-tab-btn {
            justify-content: center;
            padding: 0.45rem 0.6rem;
            font-size: 0.78rem;
          }
          .search-form {
            padding: 0.35rem 0.4rem 0.35rem 0.85rem;
          }
          [dir="rtl"] .search-form {
            padding: 0.35rem 0.85rem 0.35rem 0.4rem;
          }
          .search-submit-btn {
            padding: 0.65rem 0.95rem;
            font-size: 0.85rem;
          }
          .recommendations-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.65rem;
          }
          .recommendations-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .blended-target-spotlight {
            padding: 1.25rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};
