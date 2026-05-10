'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import CastSection from '@/features/movie/cast-section';
import { MovieGridCastBoundary } from '@/features/movie/grid-animation';
import MovieOverview from '@/features/movie/overview';
import { cn } from '@/core/utils';
import { getMovieFeatureItemMotion, MOVIE_FEATURE_SECTION_MOTION } from '@/features/movie/motion';

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
    <motion.div
      className={cn('movie-detail-primary-stage flex flex-col overflow-hidden', className)}
      style={stageStyle}
      {...MOVIE_FEATURE_SECTION_MOTION}
    >
      <div className="movie-detail-primary-stage-shell flex min-h-0 flex-1 flex-col justify-between gap-8">
        <div className="movie-detail-shell-inset flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <motion.div className="shrink-0" {...getMovieFeatureItemMotion(0)}>
            {titleBlock}
          </motion.div>

          {tagline || overview ? (
            <motion.div
              className={cn('flex w-full flex-col gap-4', overview ? 'min-h-0 flex-1 overflow-hidden' : '')}
              {...getMovieFeatureItemMotion(1)}
            >
              {tagline ? (
                <motion.div className="w-full shrink-0" {...getMovieFeatureItemMotion(2)}>
                  <p className="w-full shrink-0 text-xs font-semibold tracking-widest text-white/70 uppercase sm:text-sm">
                    {tagline}
                  </p>
                </motion.div>
              ) : null}

              {overview ? (
                <motion.div className="flex min-h-0 flex-1" {...getMovieFeatureItemMotion(3)}>
                  <MovieOverview overview={overview} className="flex-1" />
                </motion.div>
              ) : null}
            </motion.div>
          ) : null}
        </div>

        {hasCast ? (
          <motion.div className="movie-detail-primary-cast-block shrink-0" {...getMovieFeatureItemMotion(4)}>
            <MovieGridCastBoundary />
            <div className="movie-detail-shell-inset">
              <CastSection cast={cast} crew={crew} />
            </div>
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
