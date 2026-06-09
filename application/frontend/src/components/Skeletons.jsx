import React from 'react';
import './ApiStatusBanner.css'; // Reuse existing skeleton styles

// Reusable Skeleton Components
export const SkeletonCard = ({ className = '', children, ...props }) => (
  <div className={`skeleton-card ${className}`} {...props}>
    {children || (
      <>
        <div className="skeleton skeleton-text-lg" />
        <div className="skeleton skeleton-text" />
        <div className="skeleton skeleton-text-sm" />
      </>
    )}
  </div>
);

export const SkeletonProjectCard = ({ className = '' }) => (
  <SkeletonCard className={`project-card skeleton-card ${className}`}>
    <div className="skeleton skeleton-text-lg" style={{ width: '70%' }} />
    <div className="skeleton skeleton-text" style={{ width: '90%' }} />
    <div className="skeleton skeleton-btn" />
  </SkeletonCard>
);

export const SkeletonStyleCard = ({ className = '' }) => (
  <div className={`style-preview-card skeleton-card ${className}`}>
    <div className="skeleton skeleton-img" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text-sm" />
  </div>
);

export const SkeletonKanbanColumn = ({ title = 'Column', count = 0, children }) => (
  <div className="k-col todo-col">
    <div className="k-col-head">
      <span>{title}</span>
      <span className="count">{count}</span>
    </div>
    <div className="k-col-body">
      {children || (
        <>
          <SkeletonCard className="k-card">
            <div className="skeleton" style={{ height: '48px', width: '100%' }} />
            <div className="skeleton skeleton-text-sm" style={{ width: '60%' }} />
          </SkeletonCard>
          <SkeletonCard className="k-card">
            <div className="skeleton" style={{ height: '48px', width: '100%' }} />
          </SkeletonCard>
        </>
      )}
    </div>
  </div>
);

export const LoadingSpinner = ({ className = '' }) => (
  <div className={`loading-spinner ${className}`}>
    <div className="spinner-ring" />
    <div className="spinner-inner">Loading...</div>
  </div>
);

export const PageSkeleton = ({ title = 'Loading...', subtitle = '' }) => (
  <div className="page-skeleton">
    <header className="skeleton-header" aria-label={[title, subtitle].filter(Boolean).join(' - ')}>
      <div className="skeleton skeleton-text-lg" />
      <div className="skeleton skeleton-text" />
    </header>
    <main className="skeleton-main">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </main>
  </div>
);
