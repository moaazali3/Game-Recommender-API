import React from 'react';

export const SkeletonLoader = ({ variant = 'card', count = 1 }) => {
  const items = Array.from({ length: count });

  if (variant === 'target') {
    return (
      <div className="skeleton-target-card">
        <div className="skeleton skeleton-target-image" />
        <div className="skeleton-target-content">
          <div className="skeleton skeleton-pill" style={{ width: '120px', height: '24px' }} />
          <div className="skeleton skeleton-title" style={{ width: '65%', height: '36px' }} />
          <div className="skeleton-target-actions">
            <div className="skeleton skeleton-btn" style={{ width: '180px', height: '42px' }} />
            <div className="skeleton skeleton-btn" style={{ width: '140px', height: '42px' }} />
          </div>
        </div>

        <style>{`
          .skeleton-target-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-xl);
            display: flex;
            gap: 2rem;
            padding: 1.5rem;
            margin-bottom: 2.5rem;
          }
          .skeleton-target-image {
            width: 320px;
            aspect-ratio: 460 / 215;
            border-radius: var(--radius-lg);
            flex-shrink: 0;
          }
          .skeleton-target-content {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 1rem;
            flex: 1;
          }
          .skeleton-target-actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 0.5rem;
          }
          @media (max-width: 768px) {
            .skeleton-target-card {
              flex-direction: column;
            }
            .skeleton-target-image {
              width: 100%;
            }
          }
        `}</style>
      </div>
    );
  }

  if (variant === 'timeline-item') {
    return (
      <div className="skeleton-timeline-container">
        {items.map((_, i) => (
          <div key={i} className="skeleton-timeline-row">
            <div className="skeleton skeleton-timeline-node" />
            <div className="skeleton-timeline-card">
              <div className="skeleton skeleton-timeline-img" />
              <div className="skeleton-timeline-meta">
                <div className="skeleton skeleton-title" style={{ width: '50%', height: '20px' }} />
                <div className="skeleton skeleton-text" style={{ width: '30%', height: '14px' }} />
              </div>
            </div>
          </div>
        ))}

        <style>{`
          .skeleton-timeline-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            position: relative;
            padding-left: 2rem;
          }
          [dir="rtl"] .skeleton-timeline-container {
            padding-left: 0;
            padding-right: 2rem;
          }
          .skeleton-timeline-row {
            display: flex;
            align-items: center;
            gap: 1.5rem;
          }
          .skeleton-timeline-node {
            width: 32px;
            height: 32px;
            border-radius: var(--radius-full);
            flex-shrink: 0;
          }
          .skeleton-timeline-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-lg);
            padding: 0.75rem;
            flex: 1;
          }
          .skeleton-timeline-img {
            width: 70px;
            height: 90px;
            border-radius: var(--radius-sm);
            flex-shrink: 0;
          }
          .skeleton-timeline-meta {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            flex: 1;
          }
        `}</style>
      </div>
    );
  }

  if (variant === 'feedback') {
    return (
      <div className="skeleton-feedback-grid">
        {items.map((_, i) => (
          <div key={i} className="skeleton-feedback-card">
            <div className="skeleton-feedback-top">
              <div className="skeleton skeleton-stars" style={{ width: '90px', height: '16px' }} />
              <div className="skeleton skeleton-date" style={{ width: '70px', height: '14px' }} />
            </div>
            <div className="skeleton skeleton-text" style={{ width: '95%', height: '16px', marginTop: '0.75rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '75%', height: '16px', marginTop: '0.4rem' }} />
            <div className="skeleton skeleton-author" style={{ width: '80px', height: '14px', marginTop: '1rem' }} />
          </div>
        ))}

        <style>{`
          .skeleton-feedback-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.25rem;
            width: 100%;
          }
          .skeleton-feedback-card {
            background: var(--bg-surface);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
          }
          .skeleton-feedback-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          @media (max-width: 640px) {
            .skeleton-feedback-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  // Default Game Card Skeleton
  return (
    <div className="skeleton-cards-grid">
      {items.map((_, i) => (
        <div key={i} className="skeleton-game-card">
          <div className="skeleton skeleton-card-cover" />
          <div className="skeleton-card-body">
            <div className="skeleton skeleton-title" style={{ width: '70%', height: '22px' }} />
            <div className="skeleton-tags-row">
              <div className="skeleton skeleton-tag" style={{ width: '45px', height: '18px' }} />
              <div className="skeleton-tag" style={{ width: '60px', height: '18px' }} />
              <div className="skeleton-tag" style={{ width: '50px', height: '18px' }} />
            </div>
            <div className="skeleton-card-actions">
              <div className="skeleton skeleton-btn" style={{ flex: 1, height: '34px' }} />
              <div className="skeleton skeleton-btn" style={{ flex: 1, height: '34px' }} />
            </div>
          </div>
        </div>
      ))}

      <style>{`
        .skeleton-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          width: 100%;
        }
        .skeleton-game-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .skeleton-card-cover {
          width: 100%;
          aspect-ratio: 460 / 215;
          border-radius: 0;
        }
        .skeleton-card-body {
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .skeleton-tags-row {
          display: flex;
          gap: 0.35rem;
        }
        .skeleton-card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        @media (max-width: 640px) {
          .skeleton-cards-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
};
