'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { useClickOutside, Z_INDEX } from '@/shared';
import {
  canPreviewStackOnTopHover,
  estimateCompactCardWidth,
  getIsItemActive,
  getItemKey,
} from './utils';
import { NavBreadcrumbsCard, useNavBreadcrumbs } from './breadcrumbs';
import { useNavKeyboard } from './behavior';
import { NavCardItem } from './cards';
import { useNavHeightController, useNavViewport } from './layout';
import {
  NAV_BACKDROP_TRANSITION,
  NAV_STACK_TRANSITION,
  getNavStackAnimateProps,
  navBackdropVariants,
} from './motion';
import { useNavigation, useNavigationActions, useNavigationState } from './runtime';

import { useIsFullscreenStateActive } from '@/ui/feedback/fullscreen-state';

export {
  NAV_TAP_SCALE,
  NAV_BUTTON_TRANSITION,
  NAV_CARD_SPRING,
  NAV_FADE_TRANSITION,
  NAV_MICRO_TRANSITION,
  NAV_RESULTS_TRANSITION,
  NAV_RESULTS_EXIT_TRANSITION,
  NAV_RESULTS_STAGGER_DELAY,
  navActionVariants,
  slideFadeVariants,
  textCrossfadeVariants,
  staggerItemVariants,
  navListItemVariants,
  navFadeVariants,
  navBadgeVariants,
  navBackdropVariants,
  navBreadcrumbsVariants,
  navHudVariants,
  getNavDescriptionVariants,
  getNavActionStaggerTransition,
  getNavStackAnimateProps,
  getNavCardDelay,
  getNavItemAnimateValues,
  getNavItemTransition,
  getNavCardContentAnimateProps,
  getNavScrollProgressStyle,
  navSoundwaveBarVariants,
  navScrubberTooltipVariants,
  NAV_SCRUBBER_TOOLTIP_TRANSITION,
  NAV_SURFACE_HEADER_REVEAL_DELAY_MS,
  NAV_SURFACE_TRANSITION,
  NAV_SURFACE_DRAG_CONSTRAINTS,
  NAV_SURFACE_DRAG_ELASTIC,
} from './motion';

export {
  NAV_ATTENTION_KIND,
  NAV_ATTENTION_PRIORITY,
  NAV_ATTENTION_PRIORITY_OFFSET_MAX,
  NAV_HUD_PRIORITY,
  NAV_HUD_RENDER_MODE,
  NAV_HUD_VARIANT,
  NAV_SURFACE_FLOW_STATUS,
  NAV_SURFACE_RENDER_MODE,
  NAVIGATION_CONTINUITY_EVENTS,
  NAVIGATION_SURFACE_RETURN_MAX_ENTRIES,
  NAVIGATION_OPERATION_EVENTS,
  NAVIGATION_OPERATION_STATUS,
  NAVIGATION_DIAGNOSTIC_EVENTS,
  NAVIGATION_EVENTS,
  NAVIGATION_LIFECYCLE,
  NAVIGATION_TRANSACTION_STATUS,
} from './constants';

export { formatMediaTime, isValidComponentType, validateNavConfig } from './utils';
export { NavMediaControls, NavMediaScrubber, NavSoundwave } from './media';
export { NavDescription, NavIcon, NavTitle } from './cards';
export {
  BreadcrumbProvider,
  NavBreadcrumbsCard,
  resolveRouteBreadcrumbs,
  useBreadcrumbActions,
  useBreadcrumbOverrides,
  useNavBreadcrumbs,
  useRegisterBreadcrumbOverride,
} from './breadcrumbs';
export {
  createHudDefinition,
  createNavigationOperationHud,
  isHudDescriptor,
  resolveActiveHud,
} from './hud';
export {
  createInlineSurfaceEntry,
  createPendingSurfaceScheduler,
  createSurfaceEntryDefinition,
  createSurfaceFlowDefinition,
  createSurfaceFlowSession,
  createSurfaceReturnHandshake,
  isSurfaceDescriptor,
  resolveActiveStepDefinition,
  resolveSurfaceAction,
  updateSurfaceFlowSession,
  useSurfaceFlow,
} from './surface';
export { applyStatusOverlay, getStatusTheme, useNavigationStatus } from './status';
export {
  createNavigationTransaction,
  createNavigationTransactionState,
  createNavigationContinuityEntry,
  createNavigationContinuityState,
  createNavigationReturnHandoff,
  createNavigationTopology,
  navigationContinuityReducer,
  navigationTransactionReducer,
  resolveNavigationContinuityEntry,
  resolveNavigationReturnHandoffs,
  resolveNavigationRoutePolicy,
  resolveNavigationTopologyPath,
  useNavigationContinuity,
  useNavigationTransactions,
  useRoutePrefetch,
} from './routing';
export {
  focusNavigationElement,
  getNavigationFocusableElements,
  shouldRestoreNavigationFocus,
} from './behavior';

export {
  NavHeightSpacer,
  NavHud,
  NavHudShell,
  NavSurfaceHeader,
  NavSurfaceHeaderButton,
  NavSurfaceShell,
  NavigationProvider,
  checkGuards,
  clearNavigationDiagnostics,
  clearNavigationGuards,
  createNavigationDiagnosticStore,
  createNavigationInspectorSnapshot,
  createNavigationMachineState,
  createNavigationOperation,
  createNavigationOperationState,
  getNavigationDiagnostics,
  getNavigationInspectorSnapshot,
  getNavigationGuardCount,
  navigationStateReducer,
  navigationOperationReducer,
  registerGuard,
  resolveActiveNavigationOperation,
  resolveNavigationAttention,
  useNavContextActions,
  useNavHeight,
  useNavHud,
  useNavigation,
  useNavigationActions,
  useNavigationContext,
  useNavigationContinuityState,
  useNavigationGuard,
  useNavigationOperations,
  useNavigationState,
  useSurfaceReturn,
  useSurfaceHeader,
} from './runtime';

/**
 * @typedef {object} NavItem
 * @property {string} [id] Stable item identifier
 * @property {string} [path] Internal route path
 * @property {string} [name] Fallback item identity and display name
 * @property {string|React.ReactNode} [title] Primary card label
 * @property {string|React.ReactNode} [description] Supporting card content
 * @property {boolean} [isLoading] Whether the item is still loading
 * @property {boolean} [isOverlay] Whether the item overlays its route
 * @property {boolean} [isSurface] Whether the item represents an open surface
 * @property {{clearTransientState?: boolean, dismissSurfaces?: boolean, prefetch?: boolean}} [navigationPolicy] Route-transition overrides
 * @property {Array<NavItem>} [children] Nested navigation items
 */

/**
 * @typedef {object} SurfaceStep
 * @property {React.ComponentType|React.ReactNode} [component] Component or node to render
 * @property {React.ReactNode} [content] Explicit step content
 * @property {object} [props] Component props
 * @property {string|React.ReactNode} [title] Step title
 * @property {string|React.ReactNode} [description] Step description
 */

/**
 * @typedef {object} SurfaceDefinition
 * @property {string} [id] Optional stable surface identity
 * @property {'component'|'node'} renderMode Surface rendering mode
 * @property {React.ComponentType|null} component Component to render in component mode
 * @property {React.ReactNode|null} content Node to render in node mode
 * @property {object} props Component props
 * @property {Array<SurfaceStep>|null} steps Ordered surface steps
 * @property {number} currentStepIndex Active zero-based step index
 * @property {boolean|string} [syncWithUrl] Whether the surface owns a URL state entry
 */

/**
 * @typedef {object} HudDefinition
 * @property {string} id Stable HUD identity
 * @property {'component'|'node'} renderMode HUD rendering mode
 * @property {React.ComponentType|null} component Component to render in component mode
 * @property {React.ReactNode|null} content Node to render in node mode
 * @property {object} props Component props
 * @property {boolean} isActive Whether the HUD can own attention
 * @property {number} priority Attention priority within the HUD tier
 */

/**
 * @typedef {object} NavigationStatus
 * @property {string} type Status category
 * @property {string|React.ReactNode} title Status title
 * @property {string|React.ReactNode} description Status description
 * @property {boolean} isOverlay Whether the status blocks route content
 * @property {number|null} priority Optional priority override
 */

/**
 * @typedef {object} NavigationMachineState
 * @property {boolean} expanded Whether the stack is expanded
 * @property {boolean} isCompact Whether compact navigation is active
 * @property {Array<number>} surfaceIds Ordered open surface identifiers
 * @property {'idle'|'opening'|'open'|'closing'} surfaceLifecycle Current surface lifecycle phase
 */

export default function Nav() {
  const {
    activeItem,
    navigationItems,
    setNavHeight,
    setIsHovered,
    setExpanded,
    activeIndex,
    compact,
    isHudActive,
    expanded,
    navigate,
  } = useNavigation();

  const isFullscreenStateActive = useIsFullscreenStateActive();

  const { contextActions, hud } = useNavigationState();
  const { clearHud } = useNavigationActions();

  const [isStackHovered, setIsStackHovered] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const navRef = useRef(null);
  const { portalTarget, stackWidth } = useNavViewport(activeItem);
  const clearHoverState = useCallback(() => {
    setIsStackHovered(false);
    setIsHovered(false);
  }, [setIsHovered]);

  const isOverlayActive = Boolean(activeItem?.isOverlay);
  const isBackdropVisible = !isFullscreenStateActive && (expanded || isOverlayActive);
  const isCompactPreviewActive = compact && !expanded && isStackHovered && !isOverlayActive;
  const isTopItemCompact = compact && !expanded && !isStackHovered && !isOverlayActive;
  const isCompactStack = !expanded && compact && !isCompactPreviewActive && !isOverlayActive;
  const activeTitle = activeItem?.title || activeItem?.name || '';

  const { breadcrumbs } = useNavBreadcrumbs();
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 1);
  const isBreadcrumbsCardVisible = Boolean(expanded && !isOverlayActive && hasBreadcrumbs);

  const compactStackWidth = useMemo(
    () => estimateCompactCardWidth(activeTitle, stackWidth),
    [activeTitle, stackWidth],
  );

  const contentKey = activeItem?.isSurface
    ? `surface:${activeItem.surfaceId ?? activeItem.path ?? 'active'}`
    : isHudActive
      ? `hud:${hud?.id || 'active'}`
      : `route:${activeItem?.path || activeItem?.name || 'default'}`;

  const { containerHeight, handleContentHeightChange } = useNavHeightController({
    compact: isTopItemCompact,
    contentKey,
    isHud: isHudActive,
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

  const visibleNavigationItems = expanded
    ? navigationItems
    : navigationItems.slice(0, compact ? 1 : 3);

  const renderedNavItems = visibleNavigationItems.map((link, index) => {
    const position = index;
    const isTop = position === 0;
    const isActive = getIsItemActive(link, activeItem);
    const isCompactCard = isTop && isCompactStack;
    const shouldSyncHover = compact;
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

      if (link.path) navigate(link.path, { item: link });
    };

    return (
      <NavCardItem
        key={getItemKey(link, index)}
        link={link}
        expanded={expanded}
        compact={isCompactCard}
        globalCompact={compact}
        position={position}
        isTop={isTop}
        isActive={isActive}
        isStackHovered={isStackHovered}
        statusStyle={statusStyle}
        isHudActive={isHudActive}
        hud={hud}
        clearHud={clearHud}
        contextCommands={contextActions}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onContentHeightChange={isTop ? handleContentHeightChange : null}
      />
    );
  });

  const navContent = (
    <>
      <AnimatePresence>
        {isBackdropVisible && (
          <motion.div
            key="nav-backdrop"
            variants={navBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_BACKDROP_TRANSITION}
            className="fixed inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
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
        animate={getNavStackAnimateProps({
          width: isCompactStack ? compactStackWidth : stackWidth,
          height: containerHeight,
          isBreadcrumbsVisible: isBreadcrumbsCardVisible,
          isFullscreen: isFullscreenStateActive,
        })}
        transition={NAV_STACK_TRANSITION}
      >
        <AnimatePresence>{isBreadcrumbsCardVisible && <NavBreadcrumbsCard />}</AnimatePresence>
        {renderedNavItems}
      </motion.div>
    </>
  );

  if (!portalTarget) return null;

  return createPortal(navContent, portalTarget);
}
