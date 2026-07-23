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
} from './utils';
import {
  getNavBackdropMotion,
  getNavContainerMotion,
  NAV_BACKDROP_INITIAL,
  NAV_BACKDROP_TRANSITION,
  NAV_CONTAINER_SPRING,
} from '@/core/modules/motion';

export { NavigationProvider, useNavigationActions, useNavigationContext, useNavigationState } from './context';
export {
  useActionHeight,
  useElementHeight,
  useNavHeight,
  useNavigation,
} from './hooks';
export { NavSurfaceHeader, default as NavSurfaceShell, useSurfaceHeader } from './surface';
export { NAV_SURFACE_RENDER_MODE } from './surface-model';

// ─── Main Nav component ──────────────────────────────────────────────────────

export default function Nav() {
  const {
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

  useEffect(() => {
    setInitialAnimate(true);
  }, []);

  const navRef = useRef(null);
  const { portalTarget, stackWidth } = useNavViewport(activeItem);
  const activeItemLayoutKey = useMemo(() => getActiveItemLayoutKey(activeItem), [activeItem]);
  const clearHoverState = useCallback(() => {
    setIsStackHovered(false);
    setIsHovered(false);
  }, [setIsHovered]);
  const isOverlayActive = !!activeItem?.isOverlay;
  const isBackdropVisible = !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive = compact && !expanded && isStackHovered;
  const isTopItemCompact = compact && !expanded && !isStackHovered;

  const { containerHeight, handleContentHeightChange } = useNavHeightController({
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

  const stackClassName = useMemo(
    () => getNavStackClassName({ isFullscreenStateActive }),
    [isFullscreenStateActive],
  );
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
        key={getItemKey(link, index)}
        link={link}
        expanded={expanded}
        compact={isCompactCard}
        globalCompact={compact}
        position={position}
        isTop={isTop}
        isActive={isActive}
        isStackHovered={isStackHovered}
        stackWidth={stackWidth}
        totalItems={navigationItems.length}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onContentHeightChange={isTop ? handleContentHeightChange : null}
        containerHeight={isTop ? containerHeight : undefined}
      />
    );
  });

  const navContent = (
    <>
      <motion.div
        className="fixed inset-0 cursor-pointer bg-white/40"
        style={{
          zIndex: Z_INDEX.NAV_BACKDROP,
          pointerEvents: isBackdropVisible ? 'auto' : 'none',
        }}
        initial={NAV_BACKDROP_INITIAL}
        animate={getNavBackdropMotion(isBackdropVisible)}
        transition={NAV_BACKDROP_TRANSITION}
        onClick={handleOutsideDismiss}
      />
      <div
        id="nav-card-stack"
        ref={navRef}
        className={stackClassName}
        style={{ zIndex: Z_INDEX.NAV, width: stackWidth, maxWidth: '100vw' }}
      >
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
