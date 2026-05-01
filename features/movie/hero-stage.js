'use client';

import { useEffect, useMemo, useState } from 'react';

import CastSection from '@/features/movie/cast-section';
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

  const stageStyle = useMemo(() => (stageHeight > 0 ? { minHeight: `${stageHeight}px` } : undefined), [stageHeight]);

  return (
    <div className={cn('movie-detail-primary-stage flex flex-col', className)} style={stageStyle}>
      <div className="movie-detail-primary-stage-shell flex flex-1 flex-col justify-between gap-8">
        <div className="movie-detail-shell-inset flex flex-col gap-4">
          {titleBlock}

          {tagline || overview ? (
            <div className="flex w-full flex-col gap-4">
              {tagline ? (
                <p className="text-black-strong text-xs font-semibold tracking-widest uppercase sm:text-sm">
                  {tagline}
                </p>
              ) : null}

              {overview ? <MovieOverview overview={overview} maxLines={4} /> : null}
            </div>
          ) : null}
        </div>

        {hasCast ? (
          <div className="movie-detail-primary-cast-block">
            <div className="movie-detail-shell-inset">
              <CastSection cast={cast} crew={crew} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
