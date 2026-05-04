'use client';

import { GridPageAnimationRoot, GridPageLine } from '@/ui/animations/grid-page-animation';
import { cn } from '@/ui/elements/utils';

export function MovieGridFrame({ children, className = '', routeKey = null }) {
  return (
    <GridPageAnimationRoot baseDelay={0.12} routeKey={routeKey}>
      <div className={cn('movie-detail-grid-frame relative', className)}>
        {children}
        <GridPageLine
          axis="y"
          className="movie-detail-grid-frame-line movie-detail-grid-frame-line-left"
        />
        <GridPageLine
          axis="y"
          className="movie-detail-grid-frame-line movie-detail-grid-frame-line-right"
        />
      </div>
    </GridPageAnimationRoot>
  );
}

export function MovieGridSidebarBoundary() {
  return (
    <>
      <GridPageLine
        axis="x"
        className="movie-detail-grid-sidebar-line movie-detail-grid-sidebar-line-mobile"
      />
      <GridPageLine
        axis="y"
        className="movie-detail-grid-sidebar-line movie-detail-grid-sidebar-line-desktop"
      />
    </>
  );
}

export function MovieGridCastBoundary() {
  return (
    <GridPageLine
      axis="x"
      className="movie-detail-grid-cast-line"
    />
  );
}

export function MovieGridDivider({ className = '', inset = false, style = undefined }) {
  return (
    <div
      className={cn(
        'movie-detail-grid-divider movie-detail-grid-divider-animated',
        {
          'movie-detail-grid-divider-inset': inset,
        },
        className
      )}
      style={style}
      aria-hidden="true"
    >
      <GridPageLine
        axis="x"
        className="movie-detail-grid-divider-line movie-detail-grid-divider-line-top"
      />
      <GridPageLine
        axis="x"
        className="movie-detail-grid-divider-line movie-detail-grid-divider-line-bottom"
      />
      <GridPageLine
        axis="x"
        className="movie-detail-grid-divider-pattern"
      />
    </div>
  );
}
