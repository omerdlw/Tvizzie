'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { Z_INDEX } from '@/core/constants';
import { useInitialPageAnimationsEnabled } from '@/features/motion-runtime';
import { useClickOutside } from '@/core/hooks/use-click-outside';
import { useNavigation } from '@/core/modules/nav/hooks';
import { useIsFullscreenStateActive } from '@/ui/states/fullscreen-state';

import Item, { NAV_CARD_LAYOUT } from './item';
import { NAV_HEIGHT_BUFFER } from './layout';
import { NAV_BACKDROP_TRANSITION, NAV_CONTAINER_SPRING } from './motion';

// ─── Viewport-safe height calculation ───────────────────────────────────────

const VIEWPORT_MARGIN = 24; // px from top of viewport
function getViewportMaxHeight() {
  if (typeof window === 'undefined') return Infinity;
  return window.innerHeight - VIEWPORT_MARGIN;
}

function getContainerHeight({ actionHeight, activeItemHasAction, cardContentHeight, compact }) {
  const minCardHeight = compact ? NAV_CARD_LAYOUT.compactHeight : NAV_CARD_LAYOUT.baseHeight;
  const nextCardHeight = Math.max(minCardHeight, cardContentHeight + NAV_CARD_LAYOUT.chromeHeight);
  const rawHeight = nextCardHeight + (activeItemHasAction && actionHeight > 0 ? actionHeight : 0);

  // Clamp to viewport so nav never goes off-screen
  return Math.min(rawHeight, getViewportMaxHeight());
}

// ─── Nav stack classname ─────────────────────────────────────────────────────

function getNavStackClassName({ isFullscreenStateActive }) {
  const baseClassName =
    'fixed right-2 bottom-0 left-2 h-auto touch-manipulation select-none transition-opacity duration-[200ms] sm:right-auto sm:bottom-1 sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2';

  if (isFullscreenStateActive) {
    return `${baseClassName} pointer-events-none opacity-0`;
  }

  return `${baseClassName} opacity-100`;
}

// ─── Item key helpers ────────────────────────────────────────────────────────

function getItemKey(link, index) {
  const pathPart = String(link?.path || '').trim() || 'no-path';
  const namePart = String(link?.name || '').trim() || 'no-name';
  const typePart = String(link?.type || '').trim() || 'no-type';

  return `${pathPart}::${namePart}::${typePart}::${index}`;
}

function getIsItemActive(link, activeItem) {
  return (link.path || link.name) === (activeItem?.path || activeItem?.name);
}

function getNavCardWidth() {
  if (typeof window === 'undefined') {
    return 460;
  }

  return window.innerWidth >= 640 ? 460 : Math.max(window.innerWidth - 16, 0);
}

function getItemPosition(index) {
  return index;
}

function shouldSyncStackHover(pathname, compact) {
  return pathname !== '/' || compact;
}

function canPreviewStackOnTopHover(compact, expanded) {
  return !(compact && !expanded);
}

function getActiveItemLayoutKey(activeItem) {
  if (!activeItem) return 'none';

  const pathPart = String(activeItem.path || '').trim() || 'no-path';
  const namePart = String(activeItem.name || '').trim() || 'no-name';
  const typePart = String(activeItem.type || '').trim() || 'no-type';

  return [
    pathPart,
    namePart,
    typePart,
    activeItem.isLoading ? 'loading' : 'ready',
    activeItem.isOverlay ? 'overlay' : 'base',
    activeItem.isSurface ? 'surface' : 'content',
    activeItem.isConfirmation ? 'confirmation' : 'standard',
    activeItem.action ? 'action' : 'no-action',
  ].join('::');
}

// ─── Backdrop animation ──────────────────────────────────────────────────────

function getBackdropAnimation(isVisible) {
  if (isVisible) {
    return {
      opacity: 1,
      backdropFilter: 'blur(10px)',
      display: 'block',
    };
  }

  return {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transitionEnd: { display: 'none' },
  };
}

// ─── Layout effect isomorphic shim ──────────────────────────────────────────

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// ─── Main Nav component ──────────────────────────────────────────────────────

export default function Nav() {
  const initialPageAnimationsEnabled = useInitialPageAnimationsEnabled();
  const {
    activeItemHasAction,
    activeItem,
    navigationItems,
    setNavHeight,
    setIsHovered,
    setExpanded,
    activeIndex,
    compact,
    expanded,
    pathname,
    navigate,
  } = useNavigation();

  const isFullscreenStateActive = useIsFullscreenStateActive();

  const [isStackHovered, setIsStackHovered] = useState(false);
  const [containerHeight, setContainerHeight] = useState(NAV_CARD_LAYOUT.baseHeight);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [stackWidth, setStackWidth] = useState(() => getNavCardWidth());
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
  const [portalTarget, setPortalTarget] = useState(null);

  const navRef = useRef(null);
  const previousPathRef = useRef(pathname);
  const activeItemLayoutKey = useMemo(() => getActiveItemLayoutKey(activeItem), [activeItem]);
  const previousActiveItemLayoutKeyRef = useRef(activeItemLayoutKey);
  const clearHoverState = useCallback(() => {
    setIsStackHovered(false);
    setIsHovered(false);
  }, [setIsHovered]);

  // ─── Ref-based height batching ─────────────────────────────────────────────
  //
  // Previously, actionHeight and cardContentHeight were separate states.
  // When both updated (e.g. on navigation), getContainerHeight ran twice:
  // once with a stale value, producing a wrong intermediate height that
  // caused the nav to jump off-screen before settling.
  //
  // Now both values live in a ref. computeAndSetHeight always reads
  // the latest of both together, eliminating the race.

  const heightRef = useRef({ action: 0, content: 0 });
  const rafRef = useRef(null);
  const compactRef = useRef(compact);
  const activeItemHasActionRef = useRef(activeItemHasAction);

  useEffect(() => {
    compactRef.current = compact;
  });

  useEffect(() => {
    activeItemHasActionRef.current = activeItemHasAction;
  });

  const applyHeight = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;

      const { action, content } = heightRef.current;
      const height = getContainerHeight({
        actionHeight: action,
        activeItemHasAction: activeItemHasActionRef.current,
        cardContentHeight: content,
        compact: compactRef.current,
      });

      setContainerHeight(height);
      setNavHeight(height + NAV_HEIGHT_BUFFER);
    });
  }, [setNavHeight]);

  const handleActionHeightChange = useCallback(
    (h) => {
      heightRef.current.action = h;
      applyHeight();
    },
    [applyHeight]
  );

  const handleContentHeightChange = useCallback(
    (h) => {
      heightRef.current.content = h;
      applyHeight();
    },
    [applyHeight]
  );

  const resetHeights = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    heightRef.current = { action: 0, content: 0 };
    setContainerHeight(NAV_CARD_LAYOUT.baseHeight);
    setNavHeight(NAV_CARD_LAYOUT.baseHeight + NAV_HEIGHT_BUFFER);
  }, [setNavHeight]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    applyHeight();
  }, [activeItemHasAction, compact, applyHeight]);

  useIsomorphicLayoutEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    resetHeights();
  }, [pathname, resetHeights]);

  useIsomorphicLayoutEffect(() => {
    if (activeItem?.isOverlay) return;
    if (previousActiveItemLayoutKeyRef.current === activeItemLayoutKey) return;
    previousActiveItemLayoutKeyRef.current = activeItemLayoutKey;
    applyHeight();
  }, [activeItem?.isOverlay, activeItemLayoutKey, applyHeight]);

  // ─── Overlay / backdrop state ─────────────────────────────────────────────

  const isOverlayActive = !!activeItem?.isOverlay;
  const isBackdropVisible = !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive = compact && !expanded && isStackHovered;

  const handleOutsideDismiss = useCallback(() => {
    if (isOverlayActive) return;

    if (isCompactPreviewActive) {
      clearHoverState();
      return;
    }

    setExpanded(false);
  }, [clearHoverState, isCompactPreviewActive, isOverlayActive, setExpanded]);

  // ─── Keyboard navigation ──────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (event) => {
      if (isOverlayActive || !expanded) return;

      const { key } = event;

      if (key === 'Escape') {
        event.preventDefault();
        setExpanded(false);
        return;
      }

      if (key === 'Enter' && focusedIndex !== -1) {
        event.preventDefault();
        navigate(navigationItems[focusedIndex]?.path);
        return;
      }

      if (key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : navigationItems.length - 1));
        return;
      }

      if (key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((prev) => (prev < navigationItems.length - 1 ? prev + 1 : 0));
      }
    },
    [expanded, focusedIndex, isOverlayActive, navigate, navigationItems, setExpanded]
  );

  useEffect(() => {
    if (!expanded) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, handleKeyDown]);

  // ─── Focus index sync ─────────────────────────────────────────────────────

  useEffect(() => {
    clearHoverState();

    if (expanded) {
      setFocusedIndex(activeIndex);
      return;
    }

    setFocusedIndex(-1);
  }, [activeIndex, clearHoverState, expanded]);

  // ─── Click outside ────────────────────────────────────────────────────────

  useClickOutside(navRef, handleOutsideDismiss);

  // ─── Portal setup ─────────────────────────────────────────────────────────

  useIsomorphicLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setStackWidth(getNavCardWidth());
      setIsMobile(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ─── Fullscreen guard ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isFullscreenStateActive) return;
    setExpanded(false);
    clearHoverState();
  }, [clearHoverState, isFullscreenStateActive, setExpanded]);

  // ─── Stack className ──────────────────────────────────────────────────────

  const stackClassName = useMemo(() => getNavStackClassName({ isFullscreenStateActive }), [isFullscreenStateActive]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const navContent = (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 cursor-pointer"
        style={{
          zIndex: Z_INDEX.NAV_BACKDROP,
          pointerEvents: isBackdropVisible ? 'auto' : 'none',
        }}
        initial={initialPageAnimationsEnabled ? { opacity: 0, backdropFilter: 'blur(0px)' } : false}
        animate={getBackdropAnimation(isBackdropVisible)}
        transition={NAV_BACKDROP_TRANSITION}
        onClick={handleOutsideDismiss}
      >
        <div className="fixed inset-0 -z-10 h-screen w-screen bg-linear-to-t from-white via-white/70 to-transparent" />
      </motion.div>

      {/* Card stack */}
      <div id="nav-card-stack" ref={navRef} className={stackClassName} style={{ zIndex: Z_INDEX.NAV }}>
        <motion.div
          style={{ position: 'relative' }}
          animate={{ height: containerHeight }}
          transition={NAV_CONTAINER_SPRING}
        >
          <AnimatePresence initial={false} mode="sync">
            {navigationItems.map((link, index) => {
              const position = getItemPosition(index);
              const isTop = position === 0;
              const isActive = getIsItemActive(link, activeItem);
              const shouldSyncHover = shouldSyncStackHover(pathname, compact);
              const canTopCardPreview = canPreviewStackOnTopHover(compact, expanded);

              const handleMouseEnter = () => {
                if (expanded) setFocusedIndex(index);
                if (!isTop) return;

                if (!canTopCardPreview) {
                  return;
                }

                setIsStackHovered(true);
                if (shouldSyncHover) setIsHovered(true);
              };

              const handleMouseLeave = () => {
                if (expanded) setFocusedIndex(-1);
                if (!isTop) return;

                if (!canTopCardPreview) return;

                setIsStackHovered(false);
                if (shouldSyncHover) setIsHovered(false);
              };

              const handleClick = () => {
                if (link.type === 'COUNTDOWN' || link.isOverlay) return;

                if (!expanded) {
                  if (isTop) {
                    if (compact && !isCompactPreviewActive) {
                      setIsStackHovered(true);
                      setIsHovered(true);
                      return;
                    }

                    clearHoverState();
                    setExpanded(true);
                  }
                  return;
                }

                if (link.path) navigate(link.path);
              };

              return (
                <Item
                  key={getItemKey(link, index)}
                  link={link}
                  initialPageAnimationsEnabled={initialPageAnimationsEnabled}
                  expanded={expanded}
                  compact={compact && isTop && !isCompactPreviewActive}
                  position={position}
                  isTop={isTop}
                  isActive={isActive}
                  isStackHovered={isStackHovered}
                  stackWidth={stackWidth}
                  isMobile={isMobile}
                  totalItems={navigationItems.length}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onClick={handleClick}
                  onActionHeightChange={isTop ? handleActionHeightChange : null}
                  onContentHeightChange={isTop ? handleContentHeightChange : null}
                />
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );

  if (!portalTarget) return null;

  return createPortal(navContent, portalTarget);
}
