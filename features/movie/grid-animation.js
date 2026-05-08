'use client';

import { GridPageLine } from '@/ui/animations/grid-page-animation';
import { RouteGridDivider, RouteGridFrame } from '@/ui/elements/route-grid-frame';

export function MovieGridFrame({ children, className = '', routeKey = null }) {
  return (
    <RouteGridFrame
      baseDelay={0.12}
      className={className}
      frameClassName="movie-detail-grid-frame"
      lineClassName="movie-detail-grid-frame-line"
      routeKey={routeKey}
    >
      {children}
    </RouteGridFrame>
  );
}

export function MovieGridSidebarBoundary() {
  return (
    <>
      <GridPageLine axis="x" className="movie-detail-grid-sidebar-line movie-detail-grid-sidebar-line-mobile" />
      <GridPageLine axis="y" className="movie-detail-grid-sidebar-line movie-detail-grid-sidebar-line-desktop" />
    </>
  );
}

export function MovieGridCastBoundary() {
  return <GridPageLine axis="x" className="movie-detail-grid-cast-line" />;
}

export function MovieGridDivider({ className = '', inset = false, style = undefined }) {
  return (
    <RouteGridDivider
      className={className}
      dividerClassName="movie-detail-grid-divider"
      inset={inset}
      insetClassName="movie-detail-grid-divider-inset"
      lineClassName="movie-detail-grid-divider-line"
      patternClassName="movie-detail-grid-divider-pattern"
      style={style}
    />
  );
}
