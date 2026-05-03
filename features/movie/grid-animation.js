'use client';

import { useRef } from 'react';

import { useInView } from 'framer-motion';

import { GridPageAnimationRoot, GridPageLine, GridPageNode } from '@/ui/animations/grid-page-animation';
import { cn } from '@/ui/elements/utils';

const MOVIE_GRID_TIMELINE = Object.freeze({
  durations: Object.freeze({
    line: 3.4,
    node: 1,
  }),
  frame: Object.freeze({
    left: 0.04,
    right: 0.28,
  }),
  sidebar: Object.freeze({
    mobile: 0.58,
    desktop: 0.5,
  }),
  cast: 0.84,
  divider: Object.freeze({
    leading: 0.18,
    trailing: 0.42,
    pattern: 0.62,
    node: 0.9,
  }),
});

export function MovieGridFrame({ children, className = '', routeKey = null }) {
  return (
    <GridPageAnimationRoot baseDelay={0.12} routeKey={routeKey}>
      <div className={cn('movie-detail-grid-frame relative', className)}>
        {children}
        <GridPageLine
          axis="y"
          delay={MOVIE_GRID_TIMELINE.frame.left}
          duration={MOVIE_GRID_TIMELINE.durations.line}
          className="movie-detail-grid-frame-line movie-detail-grid-frame-line-left"
        />
        <GridPageLine
          axis="y"
          delay={MOVIE_GRID_TIMELINE.frame.right}
          duration={MOVIE_GRID_TIMELINE.durations.line}
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
        animateOnView
        delay={MOVIE_GRID_TIMELINE.sidebar.mobile}
        duration={MOVIE_GRID_TIMELINE.durations.line}
        className="movie-detail-grid-sidebar-line movie-detail-grid-sidebar-line-mobile"
      />
      <GridPageLine
        axis="y"
        animateOnView
        delay={MOVIE_GRID_TIMELINE.sidebar.desktop}
        duration={MOVIE_GRID_TIMELINE.durations.line}
        className="movie-detail-grid-sidebar-line movie-detail-grid-sidebar-line-desktop"
      />
    </>
  );
}

export function MovieGridCastBoundary() {
  return (
    <GridPageLine
      axis="x"
      animateOnView
      delay={MOVIE_GRID_TIMELINE.cast}
      duration={MOVIE_GRID_TIMELINE.durations.line}
      className="movie-detail-grid-cast-line"
    />
  );
}

export function MovieGridDivider({ className = '', inset = false, style = undefined }) {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, {
    amount: 0.08,
    margin: '0px 0px -8% 0px',
    once: true,
  });

  return (
    <div
      ref={containerRef}
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
        active={isInView}
        axis="x"
        delay={MOVIE_GRID_TIMELINE.divider.leading}
        duration={MOVIE_GRID_TIMELINE.durations.line}
        className="movie-detail-grid-divider-line movie-detail-grid-divider-line-top"
      />
      <GridPageLine
        active={isInView}
        axis="x"
        direction="reverse"
        delay={MOVIE_GRID_TIMELINE.divider.trailing}
        duration={MOVIE_GRID_TIMELINE.durations.line}
        className="movie-detail-grid-divider-line movie-detail-grid-divider-line-bottom"
      />
      <GridPageLine
        active={isInView}
        axis="x"
        delay={MOVIE_GRID_TIMELINE.divider.pattern}
        duration={MOVIE_GRID_TIMELINE.durations.line}
        className="movie-detail-grid-divider-pattern"
      />
    </div>
  );
}
