'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { Z_INDEX } from '@/domains/shell/shared/constants';
import { useClickOutside } from '@/domains/shell/shared/hooks/use-click-outside';
import { useNavigation } from '@/modules/nav/hooks';
import { useNavHeightController } from '@/modules/nav/hooks/use-nav-height-controller';
import { useNavKeyboard } from '@/modules/nav/hooks/use-nav-keyboard';
import { useNavViewport } from '@/modules/nav/hooks/use-nav-viewport';
import { NAV_BACKDROP_TRANSITION, NAV_CARD_SPRING } from '@/modules/nav/motion';
import { cn } from '@/domains/shell/shared/utils';
import { useIsFullscreenStateActive } from '@/domains/shell/shared/components/feedback/fullscreen-state';

import Item from './item';
import { estimateCompactCardWidth } from './layout';
import {
  canPreviewStackOnTopHover,
  getActiveItemLayoutKey,
  getIsItemActive,
  getItemKey,
  getItemPosition,
  shouldSyncStackHover,
} from './utils';

export {
  NavigationProvider,
  useNavigationActions,
  useNavigationContext,
  useNavigationState,
} from './context';
export { useActionHeight, useElementHeight, useNavHeight, useNavigation } from './hooks';
export { NavSurfaceHeader, default as NavSurfaceShell, useSurfaceHeader } from './surface';
export { NAV_SURFACE_RENDER_MODE } from './surface-model';

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

  const navRef = useRef(null);
  const { portalTarget, stackWidth } = useNavViewport(activeItem);
  const activeItemLayoutKey = useMemo(() => getActiveItemLayoutKey(activeItem), [activeItem]);

  const clearHoverState = useCallback(() => {
    setIsStackHovered(false);
    setIsHovered(false);
  }, [setIsHovered]);

  const isOverlayActive = Boolean(activeItem?.isOverlay);
  const isBackdropVisible = !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive = compact && !expanded && isStackHovered;
  const isTopItemCompact = compact && !expanded && !isStackHovered;
  const isCompactStack = !expanded && compact && !isCompactPreviewActive;
  const activeTitle = activeItem?.title || activeItem?.name || '';

  const compactStackWidth = useMemo(
    () => estimateCompactCardWidth(activeTitle, stackWidth),
    [activeTitle, stackWidth],
  );

  const { containerHeight, handleContentHeightChange } = useNavHeightController({
    activeItemIsOverlay: isOverlayActive,
    activeItemLayoutKey,
    compact: isTopItemCompact,
    pathname,
    setNavHeight,
  });

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

  useClickOutside(navRef, handleOutsideDismiss);

  useEffect(() => {
    clearHoverState();

    if (expanded) {
      setFocusedIndex(activeIndex);
      return;
    }

    setFocusedIndex(-1);
  }, [activeIndex, clearHoverState, expanded]);

  useEffect(() => {
    if (!isFullscreenStateActive) return;
    setExpanded(false);
    clearHoverState();
  }, [clearHoverState, isFullscreenStateActive, setExpanded]);

  const isNotFound = Boolean(
    activeItem?.isNotFound || activeItem?.path === 'not-found' || activeItem?.type === 'NOT_FOUND',
  );
  const isStatusActive = Boolean(activeItem?.isStatus || isNotFound);
  const statusStyle = isStatusActive && !isNotFound ? activeItem?.style || null : null;

  const renderedNavItems = navigationItems.map((link, index) => {
    const position = getItemPosition(index);
    const isTop = position === 0;
    const isActive = getIsItemActive(link, activeItem);
    const isCompactCard = isTop && isCompactStack;
    const cardWidth = isCompactStack ? compactStackWidth : stackWidth;
    const shouldSyncHover = shouldSyncStackHover(pathname, compact);
    const canTopCardPreview = canPreviewStackOnTopHover(compact, expanded);

    const handleMouseEnter = () => {
      if (expanded) setFocusedIndex(index);
      if (!isTop || !canTopCardPreview) return;

      setIsStackHovered(true);
      if (shouldSyncHover) setIsHovered(true);
    };

    const handleMouseLeave = () => {
      if (expanded) setFocusedIndex(-1);
      if (!isTop || !canTopCardPreview) return;

      setIsStackHovered(false);
      if (shouldSyncHover) setIsHovered(false);
    };

    const handleClick = () => {
      if (link.isOverlay) return;

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
        cardWidth={isTop ? cardWidth : undefined}
        totalItems={navigationItems.length}
        statusStyle={statusStyle}
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
      <AnimatePresence>
        {isBackdropVisible && (
          <motion.div
            key="nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={NAV_BACKDROP_TRANSITION}
            className="fixed inset-0 cursor-pointer bg-black/50 backdrop-blur-md"
            style={{ zIndex: Z_INDEX.NAV_BACKDROP }}
            onClick={handleOutsideDismiss}
          />
        )}
      </AnimatePresence>

      <motion.div
        id="nav-card-stack"
        ref={navRef}
        className="fixed inset-x-0 bottom-1 mx-auto touch-manipulation select-none"
        style={{
          zIndex: Z_INDEX.NAV,
          maxWidth: '100vw',
        }}
        initial={false}
        animate={{
          width: Math.round(isCompactStack ? compactStackWidth : stackWidth),
          height: Math.round(containerHeight),
          opacity: isFullscreenStateActive ? 0 : 1,
          pointerEvents: isFullscreenStateActive ? 'none' : 'auto',
        }}
        transition={NAV_CARD_SPRING}
      >
        {renderedNavItems}
      </motion.div>
    </>
  );

  if (!portalTarget) return null;

  return createPortal(navContent, portalTarget);
}
