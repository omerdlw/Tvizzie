'use client';

import { useEffect, useMemo, useState } from 'react';

import CastSection from '@/features/movie/cast-section';
import { MovieGridCastBoundary } from '@/features/movie/grid-animation';
import MovieOverview from '@/features/movie/overview';
import { cn } from '@/ui/elements/utils';

const DESKTOP_BREAKPOINT = 1024;

function getDesktopSidebarPrimary() {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.querySelector('[data-movie-sidebar-primary="true"]');
}

export default function MovieHeroStage({
  cast = [],
  crew = [],
  overview = '',
  tagline = '',
  titleBlock,
  className = '',
}) {
  const [stageHeight, setStageHeight] = useState(0);

  const hasCast = cast.length > 0 || crew.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateLayout = () => {
      const sidebarPrimary = getDesktopSidebarPrimary();
      const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;

      if (!isDesktop || !sidebarPrimary) {
        setStageHeight(0);
        return;
      }

      const nextHeight = Math.max(0, sidebarPrimary.getBoundingClientRect().height);

      setStageHeight(nextHeight);
    };

    updateLayout();

    const resizeObserver = new ResizeObserver(() => updateLayout());
    const sidebarPrimary = getDesktopSidebarPrimary();

    if (sidebarPrimary) {
      resizeObserver.observe(sidebarPrimary);
    }

    window.addEventListener('resize', updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  }, []);

  const stageStyle = useMemo(
    () => (hasCast && stageHeight > 0 ? { height: `${stageHeight}px` } : undefined),
    [hasCast, stageHeight]
  );

  return (
    <div className={cn('movie-detail-primary-stage flex flex-col overflow-hidden', className)} style={stageStyle}>
      <div className="movie-detail-primary-stage-shell flex min-h-0 flex-1 flex-col justify-between gap-8">
        <div className={cn("movie-detail-shell-inset flex min-h-0 flex-1 flex-col gap-4 overflow-hidden")}>
          <div className="shrink-0">{titleBlock}</div>

          {tagline || overview ? (
            <div className={cn('flex w-full flex-col gap-4', overview ? 'min-h-0 flex-1 overflow-hidden' : '')}>
              {tagline ? (
                <div className="w-full shrink-0">
                  <p className={cn("text-white-strong w-full shrink-0 text-xs font-semibold tracking-widest uppercase sm:text-sm")}>
                    {tagline}
                  </p>
                </div>
              ) : null}

              {overview ? (
                <div className="min-h-0 flex-1 flex">
                  <MovieOverview overview={overview} className="flex-1" />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {hasCast ? (
          <div className={cn("movie-detail-primary-cast-block shrink-0")}>
            <MovieGridCastBoundary />
            <div className={cn("movie-detail-shell-inset")}>
              <CastSection cast={cast} crew={crew} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
