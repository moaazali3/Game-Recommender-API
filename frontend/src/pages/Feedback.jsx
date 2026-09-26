import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { submitFeedback, fetchFeedbacks } from '../services/api';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { MessageSquareQuote, Star, Send, CheckCircle2, AlertCircle, Sparkles, User, Calendar, MessageCircle } from 'lucide-react';

export const Feedback = () => {
  const { t, isRTL } = useLanguage();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  // Feedbacks List State
  const [feedbacksList, setFeedbacksList] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);

  const loadFeedbacks = async () => {
    try {
      const data = await fetchFeedbacks();
      setFeedbacksList(Array.isArray(data) ? data : []);
    } catch {
      setFeedbacksList([]);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback(message, rating);
      setIsSubmitting(false);
      setSubmitted(true);
      // Reload feedbacks list to show the newly submitted review immediately
      loadFeedbacks();
    } catch (err) {
      setError(err.message || 'Failed to submit feedback');
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setMessage('');
    setRating(5);
    setSubmitted(false);
    setError(null);
  };

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="feedback-page-root">
      {/* Hero Section */}
      <section className="feedback-hero">
        <div className="hero-badge">
          <MessageSquareQuote size={14} />
          <span>{t('feedback_hero_badge')}</span>
        </div>

        <h1 className="hero-title heading-display">
          {t('feedback_title_prefix')}{' '}
          <span className="highlight-amber">{t('feedback_title_highlight')}</span>
        </h1>

        <p className="hero-subtitle">
          {t('feedback_subtitle')}
        </p>
      </section>

      {/* Submission Card Container */}
      <div className="feedback-card-container">
        {submitted ? (
          <div className="feedback-success-state">
            <div className="success-icon-circle">
              <CheckCircle2 size={42} />
            </div>
            <h2 className="success-title heading-display">{t('feedback_success_title')}</h2>
            <p className="success-desc">{t('feedback_success_desc')}</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
            >
              <Sparkles size={16} />
              <span>{t('feedback_send_another')}</span>
            </button>
          </div>
        ) : (
          <form className="feedback-form-surface" onSubmit={handleSubmit}>
            {/* Star Rating Section */}
            <div className="form-group-box">
              <label className="form-label">{t('feedback_rating_label')}</label>
              <div className="star-rating-row">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = starValue <= (hoverRating || rating);
                  return (
                    <button
                      key={starValue}
                      type="button"
                      className={`star-btn ${isFilled ? 'star-btn--active' : ''}`}
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                    >
                      <Star
                        size={32}
                        className={isFilled ? 'star-filled' : 'star-outline'}
                        fill={isFilled ? 'var(--accent-amber)' : 'none'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Area */}
            <div className="form-group-box">
              <label className="form-label" htmlFor="feedbackText">
                {t('feedback_text_label')}
              </label>
              <textarea
                id="feedbackText"
                className="feedback-textarea"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('feedback_placeholder')}
                required
              />
            </div>

            {error && (
              <div className="feedback-error-banner">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn btn-primary feedback-submit-btn"
              disabled={isSubmitting || !message.trim()}
            >
              <Send size={16} />
              <span>{isSubmitting ? t('feedback_submitting') : t('feedback_submit_btn')}</span>
            </button>
          </form>
        )}
      </div>

      {/* Community Feedbacks Wall */}
      {(loadingFeedbacks || feedbacksList.length > 0) && (
        <section className="community-feedbacks-section">
          <div className="community-header">
            <div className="community-badge-icon">
              <MessageCircle size={20} />
            </div>
            <div>
              <h2 className="community-title heading-display">{t('feedback_wall_title')}</h2>
              <p className="community-subtitle">{t('feedback_wall_subtitle')}</p>
            </div>
          </div>

          {loadingFeedbacks ? (
            <SkeletonLoader variant="feedback" count={3} />
          ) : (
            <div className="feedbacks-grid">
              {feedbacksList.slice(0, 3).map((item, idx) => {
                const text = item.Description || item.description || item.Message || item.message || '';
                const starsCount = item.Rating || item.rating || 5;
                const dateVal = item.dateTime || item.DateTime || item.createdAt;

                return (
                  <div key={item.Id || item.id || idx} className="feedback-item-card">
                    <div className="feedback-card-top">
                      {/* Stars */}
                      <div className="feedback-card-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={14}
                            fill={s <= starsCount ? 'var(--accent-amber)' : 'none'}
                            color={s <= starsCount ? 'var(--accent-amber)' : 'var(--text-muted)'}
                          />
                        ))}
                      </div>

                      {/* Date */}
                      {dateVal && (
                        <span className="feedback-card-date">
                          <Calendar size={11} />
                          <span>{formatDate(dateVal)}</span>
                        </span>
                      )}
                    </div>

                    {/* Message Quote */}
                    <p className="feedback-card-text">
                      "{text}"
                    </p>

                    <div className="feedback-card-author">
                      <User size={13} />
                      <span>Gamer #{item.Id || item.id || (idx + 1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <style>{`
        .feedback-page-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .feedback-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3rem 1rem 2rem;
          max-width: 780px;
        }

        .feedback-card-container {
          width: 100%;
          max-width: 640px;
          margin-top: 0.5rem;
        }

        .feedback-form-surface {
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-xl);
          padding: 2.25rem;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group-box {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .star-rating-row {
          display: flex;
          gap: 0.5rem;
        }

        .star-btn {
          color: var(--text-muted);
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .star-btn:hover {
          transform: scale(1.15);
        }

        .star-btn--active {
          color: var(--accent-amber);
        }

        .feedback-textarea {
          background: var(--bg-deep);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1rem 1.25rem;
          color: var(--text-primary);
          font-size: 0.95rem;
          line-height: 1.5;
          resize: vertical;
          min-height: 120px;
          transition: all var(--transition-fast);
        }

        .feedback-textarea:focus {
          border-color: var(--accent-amber);
          box-shadow: 0 0 15px var(--accent-amber-glow);
        }

        .feedback-textarea::placeholder {
          color: var(--text-muted);
        }

        .feedback-error-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.88rem;
        }

        .feedback-submit-btn {
          padding: 0.85rem 1.5rem;
          font-size: 1rem;
          border-radius: var(--radius-lg);
          margin-top: 0.25rem;
        }

        .feedback-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .feedback-success-state {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: 3.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.25rem;
        }

        .success-icon-circle {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-full);
          background: rgba(16, 185, 129, 0.15);
          color: var(--score-emerald);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-title {
          font-size: 1.6rem;
          color: var(--text-primary);
        }

        .success-desc {
          font-size: 0.95rem;
          color: var(--text-secondary);
          max-width: 440px;
          line-height: 1.6;
        }

        /* Community Feedbacks Wall */
        .community-feedbacks-section {
          width: 100%;
          max-width: 900px;
          margin-top: 4.5rem;
          padding-top: 2.5rem;
          border-top: 1px solid var(--border-subtle);
        }

        .community-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .community-badge-icon {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          background: rgba(244, 63, 94, 0.12);
          color: var(--accent-amber);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .community-title {
          font-size: 1.4rem;
          color: var(--text-primary);
        }

        .community-subtitle {
          font-size: 0.88rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }

        .feedbacks-grid, .feedbacks-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
          gap: 1.25rem;
        }

        .feedback-item-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          transition: all var(--transition-normal);
        }

        .feedback-item-card:hover {
          border-color: var(--border-medium);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .feedback-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .feedback-card-stars {
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }

        .feedback-card-date {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .feedback-card-text {
          font-size: 0.92rem;
          color: var(--text-secondary);
          line-height: 1.55;
          flex: 1;
        }

        .feedback-card-author {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border-subtle);
        }

        .no-feedbacks-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
          background: var(--bg-surface);
          border: 1px dashed var(--border-subtle);
          border-radius: var(--radius-xl);
          color: var(--text-muted);
          gap: 0.75rem;
          font-size: 0.95rem;
        }

        @media (max-width: 640px) {
          .feedback-hero {
            padding: 2rem 0.5rem 1.25rem;
          }
          .hero-title {
            font-size: 1.85rem;
          }
          .feedback-form-surface {
            padding: 1.5rem 1.15rem;
            border-radius: var(--radius-lg);
          }
          .star-btn {
            padding: 0.4rem;
          }
          .feedback-submit-btn {
            width: 100%;
            padding: 0.75rem 1rem;
          }
          .community-feedbacks-section {
            margin-top: 2.5rem;
            padding-top: 1.75rem;
          }
          .feedbacks-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};
