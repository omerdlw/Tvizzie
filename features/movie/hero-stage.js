'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import CastSection from '@/features/movie/cast-section';
import MovieOverview from '@/features/movie/overview';

const DESKTOP_BREAKPOINT = 1024;
const OVERVIEW_LINE_HEIGHT = 28;

function getDesktopSidebarPrimary() {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.querySelector('[data-movie-sidebar-primary="true"]');
}

export default function MovieHeroStage({ cast = [], crew = [], overview = '', tagline = '', titleBlock, className = '' }) {
  const rootRef = useRef(null);
  const topContentRef = useRef(null);
  const castRef = useRef(null);
  const [stageHeight, setStageHeight] = useState(0);
  const [maxLines, setMaxLines] = useState(4);

  const hasCast = cast.length > 0 || crew.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateLayout = () => {
      const root = rootRef.current;
      const sidebarPrimary = getDesktopSidebarPrimary();
      const topContent = topContentRef.current;
      const castContent = castRef.current;
      const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;

      if (!root || !topContent || !isDesktop || !sidebarPrimary) {
        setStageHeight(0);
        setMaxLines(4);
        return;
      }

      const nextHeight = Math.max(0, Math.round(sidebarPrimary.getBoundingClientRect().height));
      const topHeight = Math.round(topContent.getBoundingClientRect().height);
      const castHeight = castContent ? Math.round(castContent.getBoundingClientRect().height) : 0;
      const gapOffset = hasCast ? 32 : 0;
      const remainingHeight = Math.max(56, nextHeight - topHeight - castHeight - gapOffset);
      const nextLines = Math.max(2, Math.floor(remainingHeight / OVERVIEW_LINE_HEIGHT));

      setStageHeight(nextHeight);
      setMaxLines(nextLines);
    };

    updateLayout();

    const resizeObserver = new ResizeObserver(() => updateLayout());
    const sidebarPrimary = getDesktopSidebarPrimary();

    if (sidebarPrimary) {
      resizeObserver.observe(sidebarPrimary);
    }

    if (topContentRef.current) {
      resizeObserver.observe(topContentRef.current);
    }

    if (castRef.current) {
      resizeObserver.observe(castRef.current);
    }

    window.addEventListener('resize', updateLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  }, [hasCast, overview, tagline]);

  const stageStyle = useMemo(
    () => (stageHeight > 0 ? { minHeight: `${stageHeight}px` } : undefined),
    [stageHeight]
  );

  return (
    <div ref={rootRef} className={className} style={stageStyle}>
      <div className="flex h-full flex-col justify-between gap-8 border-b border-black/10">
        <div ref={topContentRef} className="flex flex-col gap-4">
          {titleBlock}

          {tagline || overview ? (
            <div className="flex w-full flex-col gap-4">
              {tagline ? (
                <p className="text-[11px] font-semibold tracking-widest text-black/80 uppercase sm:text-sm">{tagline}</p>
              ) : null}

              {overview ? <MovieOverview overview={overview} maxLines={maxLines} /> : null}
            </div>
          ) : null}
        </div>

        {hasCast ? (
          <div ref={castRef} className="pb-8">
            <CastSection cast={cast} crew={crew} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
