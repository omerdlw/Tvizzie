'use client';

import { GridPageAnimationRoot, GridPageLine } from '@/ui/animations/grid-page-animation';
import { cn } from '@/ui/elements/utils';

export function HomeGridFrame({ children, className = '', routeKey = 'home' }) {
  return (
    <GridPageAnimationRoot baseDelay={0.12} routeKey={routeKey}>
      <div className={cn('home-grid-frame relative', className)}>
        {children}
        <GridPageLine
          axis="y"
          className="movie-detail-grid-frame-line movie-detail-grid-frame-line-left !-top-screen !bottom-0"
        />
        <GridPageLine
          axis="y"
          className="movie-detail-grid-frame-line movie-detail-grid-frame-line-right !-top-screen !bottom-0"
        />
      </div>
    </GridPageAnimationRoot>
  );
}

export function HomeGridDivider({ className = '', inset = false }) {
  return (
    <div
      className={cn(
        'movie-detail-grid-divider movie-detail-grid-divider-animated',
        {
          'movie-detail-grid-divider-inset': inset,
        },
        className
      )}
      aria-hidden="true"
    >
      <GridPageLine axis="x" className="movie-detail-grid-divider-line movie-detail-grid-divider-line-top" />
      <GridPageLine axis="x" className="movie-detail-grid-divider-line movie-detail-grid-divider-line-bottom" />
      <GridPageLine axis="x" className="movie-detail-grid-divider-pattern" />
    </div>
  );
}
