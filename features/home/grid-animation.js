'use client';

import { RouteGridDivider, RouteGridFrame } from '@/ui/elements/route-grid-frame';

export function HomeGridFrame({ children, className = '', routeKey = 'home' }) {
  return (
    <RouteGridFrame
      baseDelay={0.12}
      className={className}
      frameClassName="route-grid-frame"
      lineClassName="route-grid-frame-line"
      routeKey={routeKey}
      style={{
        '--movie-detail-divider-cap-offset': 'var(--route-grid-divider-cap-offset)',
        '--movie-detail-divider-height': 'var(--route-grid-divider-height)',
        '--movie-detail-divider-line-width': 'var(--route-grid-divider-line-width)',
        '--route-grid-divider-fill': 'var(--white)',
      }}
    >
      {children}
    </RouteGridFrame>
  );
}

export function HomeGridDivider({ className = '', inset = false }) {
  return (
    <RouteGridDivider
      className={className}
      dividerClassName="movie-detail-grid-divider"
      inset={inset}
      insetClassName="movie-detail-grid-divider-inset"
      lineClassName="movie-detail-grid-divider-line"
      patternClassName="movie-detail-grid-divider-pattern"
    />
  );
}
