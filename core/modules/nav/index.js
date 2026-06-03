'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

import { Z_INDEX } from '@/core/constants';
import { useClickOutside } from '@/core/hooks/use-click-outside';
import { useNavigation } from '@/core/modules/nav/hooks';
import { useNavKeyboard } from '@/core/modules/nav/hooks/use-nav-keyboard';
import { useNavHeightController } from '@/core/modules/nav/hooks/use-nav-height-controller';
import { useNavViewport } from '@/core/modules/nav/hooks/use-nav-viewport';
import { useIsFullscreenStateActive } from '@/ui/states/fullscreen-state';

import Item from './item';
import {
  canPreviewStackOnTopHover,
  getActiveItemLayoutKey,
  getIsItemActive,
  getItemKey,
  getItemPosition,
  getNavStackClassName,
  shouldSyncStackHover,
} from './stack-utils';
import {
  getNavBackdropMotion,
  getNavContainerMotion,
  NAV_BACKDROP_INITIAL,
  NAV_BACKDROP_TRANSITION,
  NAV_CONTAINER_SPRING,
} from '@/core/modules/motion';

// ─── Main Nav component ──────────────────────────────────────────────────────

export default function Nav() {
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
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [initialAnimate, setInitialAnimate] = useState(false);
  const [compactToggleCount, setCompactToggleCount] = useState(0);

  useEffect(() => {
    setInitialAnimate(true);
  }, []);

  useEffect(() => {
    setCompactToggleCount((prev) => prev + 1);
  }, [compact]);

  const navRef = useRef(null);
  const { isMobile, portalTarget, stackWidth } = useNavViewport();
  const activeItemLayoutKey = useMemo(() => getActiveItemLayoutKey(activeItem), [activeItem]);
  const clearHoverState = useCallback(() => {
    setIsStackHovered(false);
    setIsHovered(false);
  }, [setIsHovered]);
  const isOverlayActive = !!activeItem?.isOverlay;
  const isBackdropVisible = !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive = compact && !expanded && isStackHovered;
  const isTopItemCompact = compact && !expanded && !isStackHovered;

  const { containerHeight, handleActionHeightChange, handleContentHeightChange } = useNavHeightController({
    activeItemHasAction,
    activeItemIsOverlay: isOverlayActive,
    activeItemLayoutKey,
    compact: isTopItemCompact,
    pathname,
    setNavHeight,
  });

  // ─── Overlay / backdrop state ─────────────────────────────────────────────

  const handleOutsideDismiss = useCallback(() => {
    if (isOverlayActive) return;

    if (isCompactPreviewActive) {
      clearHoverState();
      return;
    }

    setExpanded(false);
  }, [clearHoverState, isCompactPreviewActive, isOverlayActive, setExpanded]);

  useNavKeyboard({
    expanded,
    focusedIndex,
    isOverlayActive,
    navigate,
    navigationItems,
    setExpanded,
    setFocusedIndex,
  });

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

  // ─── Fullscreen guard ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!isFullscreenStateActive) return;
    setExpanded(false);
    clearHoverState();
  }, [clearHoverState, isFullscreenStateActive, setExpanded]);

  // ─── Stack className ──────────────────────────────────────────────────────

  const stackClassName = useMemo(() => getNavStackClassName({ isFullscreenStateActive }), [isFullscreenStateActive]);
  const renderedNavItems = navigationItems.map((link, index) => {
    const position = getItemPosition(index);
    const isTop = position === 0;
    const isActive = getIsItemActive(link, activeItem);
    const isCompactCard = isTop && !isCompactPreviewActive && compact;
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
        key={isTop ? getItemKey(link, index) : `${getItemKey(link, index)}:${compactToggleCount}`}
        link={link}
        expanded={expanded}
        compact={isCompactCard}
        globalCompact={compact}
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
        containerHeight={isTop ? containerHeight : undefined}
      />
    );
  });

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
        initial={NAV_BACKDROP_INITIAL}
        animate={getNavBackdropMotion(isBackdropVisible)}
        transition={NAV_BACKDROP_TRANSITION}
        onClick={handleOutsideDismiss}
      >
        <div className="fixed inset-0 -z-10 h-screen w-screen bg-linear-to-t from-white via-white/70 to-transparent" />
      </motion.div>

      {/* Card stack */}
      <div id="nav-card-stack" ref={navRef} className={stackClassName} style={{ zIndex: Z_INDEX.NAV }}>
        <motion.div
          style={{ position: 'relative' }}
          animate={getNavContainerMotion(containerHeight)}
          transition={NAV_CONTAINER_SPRING}
        >
          <AnimatePresence initial={initialAnimate} mode="sync">
            {renderedNavItems}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );

  if (!portalTarget) return null;

  return createPortal(navContent, portalTarget);
}
