'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { Z_INDEX } from '@/core/constants';
import { useInitialPageAnimationsEnabled } from '@/features/motion-runtime';
import { useClickOutside } from '@/core/hooks';
import { useModal } from '@/core/modules/modal/context';
import { useNavigation } from '@/core/modules/nav/hooks';
import { useIsFullscreenStateActive } from '@/ui/states/fullscreen-state';

import Item, { NAV_CARD_LAYOUT } from './item';
import {
  NAV_BACKDROP_REDUCED_TRANSITION,
  NAV_BACKDROP_TRANSITION,
  NAV_CONTAINER_SPRING,
  NAV_DEFAULT_TRANSITION,
} from './motion';

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

function getNavStackClassName({ isModalOpen, isFullscreenStateActive }) {
  const baseClassName =
    'fixed right-2 bottom-1 left-2 h-auto touch-manipulation select-none transition-opacity duration-(--motion-duration-fast) sm:right-auto sm:bottom-1 sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2';

  if (isModalOpen || isFullscreenStateActive) {
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

function getBackdropAnimation(isVisible, reduceMotion) {
  if (isVisible) {
    return {
      opacity: 1,
      backdropFilter: reduceMotion ? 'blur(0px)' : 'blur(10px)',
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

  const { isOpen: isModalOpen } = useModal();
  const isFullscreenStateActive = useIsFullscreenStateActive();
  const reduceMotion = useReducedMotion();

  const [isStackHovered, setIsStackHovered] = useState(false);
  const [containerHeight, setContainerHeight] = useState(NAV_CARD_LAYOUT.baseHeight);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [stackWidth, setStackWidth] = useState(() => getNavCardWidth());
  const [portalTarget, setPortalTarget] = useState(null);

  const navRef = useRef(null);
  const previousPathRef = useRef(pathname);
  const activeItemLayoutKey = useMemo(() => getActiveItemLayoutKey(activeItem), [activeItem]);
  const previousActiveItemLayoutKeyRef = useRef(activeItemLayoutKey);

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

  const computeAndSetHeight = useCallback(() => {
    // Cancel any pending frame to coalesce rapid updates
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const { action, content } = heightRef.current;
      const height = getContainerHeight({
        actionHeight: action,
        activeItemHasAction,
        cardContentHeight: content,
        compact,
      });

      setContainerHeight(height);
      setNavHeight(height + 16);
    });
  }, [activeItemHasAction, compact, setNavHeight]);

  const handleActionHeightChange = useCallback(
    (h) => {
      heightRef.current.action = h;
      computeAndSetHeight();
    },
    [computeAndSetHeight]
  );

  const handleContentHeightChange = useCallback(
    (h) => {
      heightRef.current.content = h;
      computeAndSetHeight();
    },
    [computeAndSetHeight]
  );

  const resetHeights = useCallback(() => {
    // Cancel any pending rAF before resetting so stale measurements don't win
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    heightRef.current = { action: 0, content: 0 };
    setContainerHeight(NAV_CARD_LAYOUT.baseHeight);
    setNavHeight(NAV_CARD_LAYOUT.baseHeight + 16);
  }, [setNavHeight]);

  // Cleanup pending rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // ─── Re-run computeAndSetHeight when activeItemHasAction changes ───────────
  // (e.g. a confirmation appears/disappears — the action slot changes but
  // the heights in the ref are still valid, we just need to recompute.)
  useIsomorphicLayoutEffect(() => {
    computeAndSetHeight();
  }, [activeItemHasAction, compact, computeAndSetHeight]);

  // ─── Height reset on path change ──────────────────────────────────────────

  useIsomorphicLayoutEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    resetHeights();
  }, [pathname, resetHeights]);

  // ─── Height reset on active item layout change ────────────────────────────

  useIsomorphicLayoutEffect(() => {
    if (activeItem?.isOverlay) return;
    if (previousActiveItemLayoutKeyRef.current === activeItemLayoutKey) return;
    previousActiveItemLayoutKeyRef.current = activeItemLayoutKey;
    resetHeights();
  }, [activeItem?.isOverlay, activeItemLayoutKey, resetHeights]);

  // ─── Overlay / backdrop state ─────────────────────────────────────────────

  const isOverlayActive = !!activeItem?.isOverlay;
  const isBackdropVisible = !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive = compact && !expanded && isStackHovered;

  const handleOutsideDismiss = useCallback(() => {
    if (isOverlayActive) return;

    if (isCompactPreviewActive) {
      setIsStackHovered(false);
      setIsHovered(false);
      return;
    }

    setExpanded(false);
  }, [isCompactPreviewActive, isOverlayActive, setExpanded, setIsHovered]);

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
    if (expanded) {
      setIsStackHovered(false);
      setIsHovered(false);
      setFocusedIndex(activeIndex);
      return;
    }

    setIsStackHovered(false);
    setIsHovered(false);
    setFocusedIndex(-1);
  }, [expanded, activeIndex, setIsHovered]);

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
    setIsHovered(false);
    setIsStackHovered(false);
  }, [isFullscreenStateActive, setExpanded, setIsHovered]);

  // ─── Stack className ──────────────────────────────────────────────────────

  const stackClassName = useMemo(
    () => getNavStackClassName({ isModalOpen, isFullscreenStateActive }),
    [isFullscreenStateActive, isModalOpen]
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  const navContent = (
    <MotionConfig transition={NAV_DEFAULT_TRANSITION}>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 cursor-pointer"
        style={{
          zIndex: Z_INDEX.NAV_BACKDROP,
          pointerEvents: isBackdropVisible ? 'auto' : 'none',
        }}
        initial={initialPageAnimationsEnabled ? { opacity: 0, backdropFilter: 'blur(0px)' } : false}
        animate={getBackdropAnimation(isBackdropVisible, !!reduceMotion)}
        transition={reduceMotion ? NAV_BACKDROP_REDUCED_TRANSITION : NAV_BACKDROP_TRANSITION}
        onClick={handleOutsideDismiss}
      >
        <div className="fixed inset-0 -z-10 h-screen w-screen bg-linear-to-t from-white via-white/70 to-transparent" />
      </motion.div>

      {/* Card stack */}
      <div id="nav-card-stack" ref={navRef} className={stackClassName} style={{ zIndex: Z_INDEX.NAV }}>
        <motion.div
          style={{ position: 'relative' }}
          animate={{ height: containerHeight }}
          transition={reduceMotion ? { duration: 0.12, ease: 'easeOut' } : NAV_CONTAINER_SPRING}
        >
          <AnimatePresence initial={false} mode="sync">
            {navigationItems.map((link, index) => {
              const position = getItemPosition(index);
              const isTop = position === 0;
              const isActive = getIsItemActive(link, activeItem);

              const handleMouseEnter = () => {
                if (expanded) setFocusedIndex(index);
                if (!isTop) return;

                if (compact && !expanded) {
                  return;
                }

                setIsStackHovered(true);
                if (pathname !== '/' || compact) setIsHovered(true);
              };

              const handleMouseLeave = () => {
                if (expanded) setFocusedIndex(-1);
                if (!isTop) return;

                if (compact && !expanded) return;

                setIsStackHovered(false);
                if (pathname !== '/' || compact) setIsHovered(false);
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

                    setIsHovered(false);
                    setIsStackHovered(false);
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
    </MotionConfig>
  );

  if (!portalTarget) return null;

  return createPortal(navContent, portalTarget);
}
