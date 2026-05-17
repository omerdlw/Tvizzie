'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { useNavigationActions } from '@/core/modules/nav/context';
import { cn } from '@/core/utils';
import Icon from '@/ui/icon';
import { FEATURE_NAV_ACTION_BUTTON_MOTION, FEATURE_NAV_ACTION_ROW_MOTION } from '@/features/motion';
import { getMovieFeatureItemMotion, MOVIE_FEATURE_ACTION_MOTION } from '@/features/movie/motion';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function getLineClamp(containerHeight, reservedHeight, textNode) {
  if (!textNode || containerHeight <= 0) {
    return null;
  }

  const computedStyle = window.getComputedStyle(textNode);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight);

  if (!Number.isFinite(lineHeight) || lineHeight <= 0) {
    return null;
  }

  const availableTextHeight = Math.max(0, containerHeight - reservedHeight);
  const nextLines = Math.floor(availableTextHeight / lineHeight);

  return Math.max(1, nextLines);
}

function getReadMoreReserveHeight({ buttonNode = null, lineHeight = 0, rowGap = 0 }) {
  const buttonHeight = buttonNode?.offsetHeight || Math.ceil(lineHeight);

  return buttonHeight > 0 ? buttonHeight + rowGap : 0;
}

function MovieOverviewSurface({ close = null, overview = '', title = 'Overview' }) {
  const normalizedOverview = String(overview || '').trim();

  return (
    <motion.section className="flex max-h-screen w-full flex-col overflow-hidden" {...FEATURE_NAV_ACTION_ROW_MOTION}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
        <p className="min-w-0 truncate text-sm font-bold tracking-wide uppercase">{title}</p>
        <motion.button
          type="button"
          onClick={() => close?.()}
          className="inline-flex size-8 shrink-0 items-center justify-center border border-white/10 bg-primary text-white/50 hover:text-white"
          aria-label="Close overview"
          {...FEATURE_NAV_ACTION_BUTTON_MOTION}
        >
          <Icon icon="material-symbols:close-rounded" size={16} />
        </motion.button>
      </div>
      <div className="min-h-0 w-full overflow-y-auto p-3">
        <p className="text-sm leading-relaxed text-white/70 break-words whitespace-pre-wrap">{normalizedOverview}</p>
      </div>
    </motion.section>
  );
}

export default function MovieOverview({ overview, className = '', surfaceTitle = 'Overview' }) {
  const { openSurface } = useNavigationActions();
  const rootRef = useRef(null);
  const textRef = useRef(null);
  const buttonRef = useRef(null);
  const [layoutState, setLayoutState] = useState({
    canExpand: false,
    maxLines: null,
  });

  const measureOverflow = useCallback(() => {
    const rootNode = rootRef.current;
    const textNode = textRef.current;

    if (!rootNode || !textNode || typeof window === 'undefined') {
      return;
    }

    const rootHeight = rootNode.clientHeight;

    if (rootHeight <= 0) {
      return;
    }

    const rootStyle = window.getComputedStyle(rootNode);
    const rowGap = Number.parseFloat(rootStyle.rowGap) || 0;
    const maxLinesWithoutButton = getLineClamp(rootHeight, 0, textNode);

    if (!maxLinesWithoutButton) {
      setLayoutState((current) =>
        current.canExpand || current.maxLines !== null ? { canExpand: false, maxLines: null } : current
      );
      return;
    }

    const previousWebkitLineClamp = textNode.style.WebkitLineClamp;
    const previousWebkitBoxOrient = textNode.style.WebkitBoxOrient;
    const previousDisplay = textNode.style.display;
    const previousOverflow = textNode.style.overflow;

    textNode.style.WebkitLineClamp = '';
    textNode.style.WebkitBoxOrient = '';
    textNode.style.display = 'block';
    textNode.style.overflow = 'visible';

    const fullHeight = textNode.scrollHeight;
    const computedStyle = window.getComputedStyle(textNode);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight);

    // Check if it really overflows the container
    const nextCanExpand = Number.isFinite(lineHeight) && fullHeight > rootHeight + 2;

    const reservedHeight = nextCanExpand
      ? getReadMoreReserveHeight({
          buttonNode: buttonRef.current,
          lineHeight,
          rowGap,
        })
      : 0;

    const maxLines = getLineClamp(rootHeight, reservedHeight, textNode);

    textNode.style.WebkitLineClamp = previousWebkitLineClamp;
    textNode.style.WebkitBoxOrient = previousWebkitBoxOrient;
    textNode.style.display = previousDisplay;
    textNode.style.overflow = previousOverflow;

    setLayoutState((current) => {
      const nextMaxLines = nextCanExpand ? maxLines || maxLinesWithoutButton : null;

      if (current.canExpand === nextCanExpand && current.maxLines === nextMaxLines) {
        return current;
      }

      return {
        canExpand: nextCanExpand,
        maxLines: nextMaxLines,
      };
    });
  }, []);

  useIsomorphicLayoutEffect(() => {
    measureOverflow();
  }, [measureOverflow, overview]);

  useEffect(() => {
    const rootNode = rootRef.current;
    const textNode = textRef.current;

    if (!rootNode || !textNode || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => measureOverflow());
    resizeObserver.observe(rootNode);
    resizeObserver.observe(textNode);

    return () => {
      resizeObserver.disconnect();
    };
  }, [measureOverflow]);

  useEffect(() => {
    if (!layoutState.canExpand) {
      return undefined;
    }

    const buttonNode = buttonRef.current;

    if (!buttonNode || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => measureOverflow());
    resizeObserver.observe(buttonNode);
    measureObserver();

    function measureObserver() {
      measureOverflow();
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [layoutState.canExpand, measureOverflow]);

  if (!overview) {
    return null;
  }

  const handleReadMore = () => {
    void openSurface(MovieOverviewSurface, {
      overview,
      title: surfaceTitle,
    });
  };

  return (
    <motion.div
      ref={rootRef}
      className={cn('flex min-h-0 w-full flex-col items-start gap-3 overflow-hidden', className)}
      {...getMovieFeatureItemMotion(0)}
    >
      <motion.div className="relative min-h-0 w-full flex-1 overflow-hidden" {...getMovieFeatureItemMotion(1)}>
        <p
          ref={textRef}
          className="w-full text-sm leading-6 text-pretty text-white/70 sm:text-base sm:leading-7"
          style={
            layoutState.canExpand && layoutState.maxLines
              ? {
                  WebkitLineClamp: layoutState.maxLines,
                  WebkitBoxOrient: 'vertical',
                  display: '-webkit-box',
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          {overview}
        </p>
      </motion.div>

      {layoutState.canExpand ? (
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={handleReadMore}
          className="shrink-0 text-xs font-semibold tracking-widest text-white/50 uppercase hover:text-white"
          {...getMovieFeatureItemMotion(2)}
          {...MOVIE_FEATURE_ACTION_MOTION}
        >
          Read More
        </motion.button>
      ) : null}
    </motion.div>
  );
}
