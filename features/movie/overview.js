'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import MovieOverviewSurface from '@/features/navigation/surfaces/movie-overview-surface';
import { useNavigationActions } from '@/core/modules/nav/context';
import { cn } from '@/core/utils';

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
    const nextCanExpand = Number.isFinite(lineHeight) && fullHeight > rootHeight + lineHeight / 2;
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
  }, [layoutState.canExpand]);

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
    measureOverflow();

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
    <div ref={rootRef} className={cn('flex min-h-0 w-full flex-col items-start gap-3 overflow-hidden', className)}>
      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
        <p
          ref={textRef}
          className="text-white-soft w-full text-sm leading-6 text-pretty transition-all duration-300 sm:text-base sm:leading-7"
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
      </div>

      {layoutState.canExpand ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleReadMore}
          className="text-white-muted shrink-0 text-xs font-semibold tracking-widest uppercase transition-colors hover:text-white"
        >
          Read More
        </button>
      ) : null}
    </div>
  );
}
