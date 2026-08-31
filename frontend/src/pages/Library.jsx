import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { fetchAllGames } from '../services/api';
import { GameCard } from '../components/GameCard';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { AiSummaryModal } from '../components/AiSummaryModal';
import { Database, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal, AlertCircle } from 'lucide-react';

export const Library = () => {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [allGames, setAllGames] = useState([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // AI Modal State
  const [aiModalAppId, setAiModalAppId] = useState(null);
  const [aiModalTitle, setAiModalTitle] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const gridTopRef = useRef(null);

  useEffect(() => {
    fetchAllGames()
      .then((data) => {
        const games = data.Games || data.games || [];
        setAllGames(games);
        setTotalSaved(data.TotalSavedGames || data.totalSavedGames || games.length);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load game library');
        setLoading(false);
      });
  }, []);

  // Filter games based on search term
  const filteredGames = useMemo(() => {
    if (!searchTerm.trim()) return allGames;
    const term = searchTerm.toLowerCase().trim();
    return allGames.filter(g => (g.name || g.Name || '').toLowerCase().includes(term));
  }, [allGames, searchTerm]);

  // Reset to page 1 whenever search query or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  // Calculate pagination slices
  const totalPages = Math.ceil(filteredGames.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredGames.length);
  const currentGamesSlice = filteredGames.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      if (gridTopRef.current) {
        gridTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Generate page numbers for pagination bar
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const openAiSummary = (appId, title) => {
    setAiModalAppId(appId);
    setAiModalTitle(title);
    setIsAiModalOpen(true);
  };

  return (
    <div className="library-page-root">
      {/* Hero Header */}
      <section className="library-hero">
        <div className="hero-badge">
          <Database size={14} />
          <span>{t('library_hero_badge')}</span>
        </div>

        <h1 className="hero-title heading-display">
          {t('library_title_prefix')}{' '}
          <span className="highlight-amber">{t('library_title_highlight')}</span>
        </h1>

        <p className="hero-subtitle">
          {t('library_subtitle')}
        </p>

        {/* Database Search Filter & Controls */}
        <div className="library-toolbar">
          <div className="library-search-box">
            <Search size={19} className="search-icon-inside" />
            <input
              type="text"
              className="library-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('library_search_placeholder')}
            />
          </div>

          {/* Total & Page Size Options */}
          <div className="library-controls-group">
            <div className="library-counter-badge">
              <span className="counter-label">{t('total_games_label')}:</span>
              <span className="counter-value">{totalSaved}</span>
            </div>

            <div className="page-size-selector">
              <SlidersHorizontal size={14} color="var(--text-muted)" />
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="page-size-dropdown"
              >
                <option value={24}>24 / page</option>
                <option value={48}>48 / page</option>
                <option value={96}>96 / page</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Content Container */}
      <div className="library-content-container" ref={gridTopRef}>
        {loading && (
          <SkeletonLoader variant="card" count={12} />
        )}

        {error && !loading && (
          <div className="error-state-card">
            <div className="error-icon-box">
              <AlertCircle size={32} />
            </div>
            <h3 className="error-title heading-display">{t('error_generic')}</h3>
            <p className="error-desc">{error}</p>
          </div>
        )}

        {!loading && !error && filteredGames.length === 0 && (
          <div className="library-empty-box">
            <Search size={36} color="var(--text-muted)" />
            <p className="empty-desc">{t('library_no_match')}</p>
          </div>
        )}

        {!loading && !error && filteredGames.length > 0 && (
          <>
            {/* Range info status */}
            <div className="library-pagination-summary">
              <span>
                {isRTL
                  ? `عرض ${startIndex + 1} - ${endIndex} من أصل ${filteredGames.length} لعبة`
                  : `Showing ${startIndex + 1} - ${endIndex} of ${filteredGames.length} games`}
              </span>
            </div>

            {/* Games Grid */}
            <div className="library-grid">
              {currentGamesSlice.map((game, idx) => (
                <GameCard
                  key={game.appid || game.appId || game.Appid || idx}
                  game={game}
                  isLibrary={true}
                  onSelectSimilar={(name) => {
                    navigate(`/?search=${encodeURIComponent(name)}`);
                  }}
                  onOpenAiSummary={openAiSummary}
                />
              ))}
            </div>

            {/* Pagination Controls Bar */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                {/* First Page */}
                <button
                  type="button"
                  className="pagination-btn pagination-nav-btn"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  title="First Page"
                >
                  {isRTL ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
                </button>

                {/* Prev Page */}
                <button
                  type="button"
                  className="pagination-btn pagination-nav-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Previous Page"
                >
                  {isRTL ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                </button>

                {/* Page Number Buttons */}
                <div className="pagination-pages-list">
                  {getPageNumbers().map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`pagination-btn pagination-num-btn ${num === currentPage ? 'pagination-btn--active' : ''}`}
                      onClick={() => handlePageChange(num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                {/* Next Page */}
                <button
                  type="button"
                  className="pagination-btn pagination-nav-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  title="Next Page"
                >
                  {isRTL ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  className="pagination-btn pagination-nav-btn"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  title="Last Page"
                >
                  {isRTL ? <ChevronsLeft size={17} /> : <ChevronsRight size={17} />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Review Summary Modal */}
      <AiSummaryModal
        appId={aiModalAppId}
        gameTitle={aiModalTitle}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      <style>{`
        .library-page-root {
          display: flex;
          flex-direction: column;
        }

        .library-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3rem 1rem 2.5rem;
          max-width: 860px;
          margin: 0 auto;
        }

        .library-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
          width: 100%;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }

        .library-search-box {
          display: flex;
          align-items: center;
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-xl);
          padding: 0.7rem 1.25rem;
          box-shadow: var(--shadow-md);
          flex: 1;
          min-width: 260px;
          transition: all var(--transition-normal);
        }

        .library-search-box:focus-within {
          border-color: var(--accent-amber);
          box-shadow: 0 0 25px var(--accent-amber-glow), var(--shadow-md);
        }

        .library-search-input {
          flex: 1;
          background: transparent;
          font-size: 0.95rem;
          color: var(--text-primary);
        }

        .library-controls-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .library-counter-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          padding: 0.7rem 1.15rem;
          border-radius: var(--radius-xl);
        }

        .counter-label {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .counter-value {
          font-family: var(--font-mono);
          font-size: 1rem;
          font-weight: 800;
          color: var(--accent-amber);
        }

        .page-size-selector {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          padding: 0.55rem 0.85rem;
          border-radius: var(--radius-xl);
        }

        .page-size-dropdown {
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }

        .page-size-dropdown option {
          background: var(--bg-surface);
          color: var(--text-primary);
        }

        .library-content-container {
          margin-top: 1.5rem;
          width: 100%;
        }

        .library-pagination-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          font-size: 0.85rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .library-empty-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 1.5rem;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          gap: 1rem;
        }

        .library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          margin-top: 3.5rem;
          padding: 1.5rem 0;
          flex-wrap: wrap;
        }

        .pagination-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          height: 40px;
          padding: 0 0.5rem;
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .pagination-btn:hover:not(:disabled) {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
          border-color: var(--border-medium);
          transform: translateY(-2px);
        }

        .pagination-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .pagination-btn--active {
          background: var(--accent-amber) !important;
          color: #090c12 !important;
          font-weight: 800;
          border-color: var(--accent-amber) !important;
          box-shadow: 0 2px 10px var(--accent-amber-glow);
        }

        .pagination-pages-list {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
      `}</style>
    </div>
  );
};
