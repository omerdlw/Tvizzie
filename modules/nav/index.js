'use client';

import React, {
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  memo,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Wifi, WifiOff } from 'lucide-react';

import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  EVENT_TYPES,
  globalEvents,
  isReservedAccountSegment,
  SEMANTIC_SURFACE_CLASSES,
  useClickOutside,
  Z_INDEX,
} from '@/shared';
import { getNavActionClass } from '@/domains/shell/navigation/actions/constants';
import {
  API_ERROR_BATCH_DELAY,
  AUTH_STATUS_CLEAR_DURATION,
  AUTH_STATUS_STORAGE_KEY,
  AUTH_STATUS_TYPES,
  BEHAVIOR_CHECK_INTERVAL_MS,
  BEHAVIOR_FOCUS_IDLE_MS,
  BOTTOM_LOCK_ACTIVATION_DISTANCE,
  BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT,
  BOTTOM_LOCK_RELEASE_DISTANCE,
  COMPACT_ACTIVATION_BUFFER,
  COMPACT_MIN_ACTIVATION_DELTA,
  COMPACT_RELEASE_THRESHOLD,
  COMPACT_SCROLL_THRESHOLD,
  COMPACT_TOGGLE_COOLDOWN_MS,
  EMPTY_SNAPSHOT,
  ERROR_STATUS_TYPES,
  HEIGHT_EPSILON,
  HORIZONTAL_GESTURE_DELTA_THRESHOLD,
  HORIZONTAL_GESTURE_DOMINANCE_RATIO,
  HORIZONTAL_GESTURE_SUPPRESSION_MS,
  MAX_VISIBLE_STACKED_CARDS,
  NAV_ACTION_KEYS,
  NAV_ACTION_ORDER,
  NAV_ATTENTION_KIND,
  NAV_ATTENTION_PRIORITY,
  NAV_CARD_DIMENSIONS,
  NAV_CARD_LAYOUT,
  NAV_COMPACT_BEHAVIOR,
  NAV_EVENTS,
  NAV_HEIGHT_BUFFER,
  NAV_HUD_PRIORITY,
  NAV_HUD_RENDER_MODE,
  NAV_HUD_VARIANT,
  NAV_SPACER_BOTTOM_LOCK_DISTANCE,
  NAV_SURFACE_RENDER_MODE,
  NAV_VIEWPORT_GAP,
  NAVIGATION_EVENTS,
  NAVIGATION_LIFECYCLE,
  OVERSCROLL_THRESHOLD,
  PLAYBACK_RATES,
  SCROLL_DIRECTION_EPSILON,
  SECTION_ICONS,
  SECTION_TITLES,
  STATUS_CLEAR_DURATION,
  STATUS_PRIORITY,
  STATUS_TONES,
  VIEWPORT_MARGIN,
} from './constants';
import {
  areShallowCollectionsEqual,
  blurActiveElement,
  canPreviewStackOnTopHover,
  clamp,
  estimateCompactCardWidth,
  filterContextToolbarActions,
  formatMediaTime,
  formatSlugTitle,
  getCurrentTimestamp,
  getDistanceToBottom,
  getImageIconStyle,
  getIsItemActive,
  getItemKey,
  getItemMeasurementKey,
  getLineClampStyle,
  getRouteMeasurementKey,
  getScrollableHeight,
  getVisibleToolbarActions,
  isEditableNavigationTarget,
  isActionlessNavItem,
  isImageIconSource,
  isInteractiveTarget,
  isPathPrefix,
  isSafeInternalHref,
  isSamePath,
  isSameItem,
  isStatusToolbarActionAllowed,
  isValidComponentType,
  normalizeLower,
  normalizeToolbarActions,
  normalizeUpper,
  normalizePath,
  resolveNavVisualStyle,
  resolveComponentType,
  resolveRenderableContent,
  sortToolbarActionsByOrder,
  splitStyle,
  shouldRenderInlineAction,
  toArray,
  toSearchableText,
} from './utils';
import {
  createInlineSurfaceEntry,
  createNavigationMachineState,
  createSurfaceEntryDefinition,
  isSurfaceDescriptor,
  NavSurfaceHeader,
  NavSurfaceHeaderButton,
  NavSurfaceShell,
  resolveActiveStepDefinition,
  resolveSurfaceAction,
  navigationStateReducer,
  useSurfaceHeader,
  useSurfaceStack,
} from './surface';
import {
  areHudDefinitionsEqual,
  areSelectionModeStatesEqual,
  createHudDefinition,
  createSelectionModeState,
  getActiveNavigationHud,
  isHudDescriptor,
  removeHudEntries,
  resolveActiveHud,
  resolveNavigationAttention,
  upsertHudEntry,
  NavHudView,
  useNavHudLifecycle,
} from './hud';
import { applyStatusOverlay, getStatusTheme, useNavigationStatus } from './status';
import {
  canUseBottomLock,
  canUseCompactNav,
  resolveCompactBehavior,
  resolveCompactState,
  useNavigationBehavior,
} from './behavior';
import {
  NAV_EASINGS,
  NAV_TIERS,
  NAV_SPRINGS,
  NAV_STAGGER_TIMINGS,
  NAV_STAGGER_DELAY,
  NAV_TAP_SCALE,
  NAV_BUTTON_TRANSITION,
  NAV_CARD_SPRING,
  NAV_CARD_EXPAND_TRANSITION,
  NAV_STACK_TRANSITION,
  NAV_CARD_TRANSITION,
  NAV_CARD_COLLAPSE_TRANSITION,
  NAV_PEEK_SPRING,
  NAV_SURFACE_TRANSITION,
  NAV_BACKDROP_TRANSITION,
  NAV_FADE_TRANSITION,
  NAV_TEXT_ENTER_TRANSITION,
  NAV_TEXT_EXIT_TRANSITION,
  NAV_ICON_TRANSITION,
  NAV_STAGGER_TRANSITION,
  NAV_MICRO_TRANSITION,
  NAV_BADGE_TRANSITION,
  NAV_ACTIVE_INDICATOR_TRANSITION,
  NAV_RESULTS_TRANSITION,
  NAV_RESULTS_EXIT_TRANSITION,
  NAV_RESULTS_STAGGER_DELAY,
  NAV_PEEK_TRANSITION,
  NAV_SURFACE_DRAG_CONSTRAINTS,
  NAV_SURFACE_DRAG_ELASTIC,
  NAV_BREADCRUMBS_TRANSITION,
  NAV_HUD_TRANSITION,
  toGpuTransform,
  navActionVariants,
  getNavActionMotionProps,
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
} from './motion';

import { useAccount } from '@/modules/account';
import { useAuth, useAuthSessionReady } from '@/modules/auth';
import { useBackgroundActions, useBackgroundState } from '@/modules/background';
import { useLoadingActions, useLoadingState } from '@/modules/loading';
import { useModal } from '@/modules/modal';
import { useToast } from '@/modules/notification';
import { useNavRegistry, useNavRuntimeRegistry } from '@/modules/registry';

import { cn } from '@/ui/class-names';
import { useIsFullscreenStateActive } from '@/ui/feedback/fullscreen-state';
import { Spinner } from '@/ui/feedback/spinner';
import { Button, Tooltip } from '@/ui/primitives';
import Iconify from '@/ui/primitives/icon';

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
  navListItemVariants,
  navFadeVariants,
} from './motion';

export {
  NAV_ATTENTION_KIND,
  NAV_ATTENTION_PRIORITY,
  NAV_HUD_PRIORITY,
  NAV_HUD_RENDER_MODE,
  NAV_HUD_VARIANT,
  NAV_SURFACE_RENDER_MODE,
  NAVIGATION_EVENTS,
  NAVIGATION_LIFECYCLE,
} from './constants';

export { formatMediaTime, isValidComponentType, validateNavConfig } from './utils';
export {
  createHudDefinition,
  isHudDescriptor,
  resolveActiveHud,
  resolveNavigationAttention,
} from './hud';
export {
  createInlineSurfaceEntry,
  createNavigationMachineState,
  createPendingSurfaceScheduler,
  createSurfaceEntryDefinition,
  isSurfaceDescriptor,
  resolveActiveStepDefinition,
  resolveSurfaceAction,
  navigationStateReducer,
} from './surface';
export { applyStatusOverlay, getStatusTheme, useNavigationStatus } from './status';

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

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function useRequiredContext(context, hookName, providerName) {
  const value = useContext(context);
  if (value === null) {
    throw new Error(`${hookName} must be used within ${providerName}`);
  }
  return value;
}

function stopPropagation(event) {
  event.stopPropagation();
}

// ── Events and navigation guards ──────────────────────────────────────────────

function emitNavigationEvent(eventType, data = {}) {
  return globalEvents.emit(eventType, {
    timestamp: Date.now(),
    type: eventType,
    ...data,
  });
}

function subscribeToNavigationEvent(eventType, callback) {
  return globalEvents.subscribe(eventType, callback);
}

const guardRegistry = new Map();
let guardIdCounter = 0;

/**
 * Removes every registered navigation guard and resets guard identifiers.
 * @returns {void}
 */
export function clearNavigationGuards() {
  guardRegistry.clear();
  guardIdCounter = 0;
}

/**
 * Returns the number of currently registered navigation guards.
 * @returns {number} Registered guard count
 */
export function getNavigationGuardCount() {
  return guardRegistry.size;
}

/**
 * Registers a navigation guard and returns its cleanup callback.
 * @param {object} guard - Guard predicate and optional block metadata
 * @returns {() => boolean} Guard cleanup callback
 */
export function registerGuard(guard) {
  const id = ++guardIdCounter;
  guardRegistry.set(id, guard);
  return () => guardRegistry.delete(id);
}

/**
 * Evaluates navigation guards in registration order and returns the first block.
 * @param {string} to - Destination path
 * @param {string} from - Current path
 * @returns {Promise<{blocked: boolean, message?: string, guardId?: number}>} Guard result
 */
export async function checkGuards(to, from) {
  for (const [id, guard] of guardRegistry) {
    let shouldBlock = false;
    try {
      const guardResult = typeof guard.when === 'function' ? guard.when(to, from) : guard.when;
      shouldBlock = await Promise.resolve(guardResult);
    } catch (error) {
      console.error('[Navigation Guard] Guard evaluation failed:', error);
    }

    if (shouldBlock) {
      const message = guard.message || 'Are you sure you want to leave this page?';
      guard.onBlock?.({ to, from, guardId: id, message });
      return { message, blocked: true, guardId: id };
    }
  }
  return { blocked: false };
}

/**
 * Registers a component-scoped navigation guard and before-unload protection.
 * @param {object} [options] - Guard predicate, message, and callback
 * @returns {{isActive: *, setGuard: Function, clearGuard: Function}} Guard controls
 */
export function useNavigationGuard(options = {}) {
  const {
    message = 'You have unsaved changes. Are you sure you want to leave?',
    when = false,
    onBlock,
  } = options;

  const whenRef = useRef(when);

  useEffect(() => {
    whenRef.current = when;
  }, [when]);

  useEffect(() => {
    const unregister = registerGuard({
      when: () => whenRef.current,
      message,
      onBlock,
    });

    return () => {
      unregister();
    };
  }, [message, onBlock]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (whenRef.current) {
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [message]);

  const setGuard = useCallback((active) => {
    whenRef.current = active;
  }, []);

  const clearGuard = useCallback(() => {
    whenRef.current = false;
  }, []);

  return {
    isActive: when,
    clearGuard,
    setGuard,
  };
}

// ── Shared scroll store ────────────────────────────────────────────────────────

let navigationScrollSnapshot = EMPTY_SNAPSHOT;
let navigationScrollFrameId = null;
const navigationScrollListeners = new Set();

function readSnapshot() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return EMPTY_SNAPSHOT;
  }

  const root = document.documentElement;
  const viewportHeight = window.innerHeight || 0;
  const scrollableHeight = Math.max((root?.scrollHeight || 0) - viewportHeight, 0);
  const scrollY = window.scrollY || root?.scrollTop || 0;

  return {
    scrollY,
    scrollableHeight,
    viewportHeight,
    progress: scrollableHeight > 20 ? Math.max(0, Math.min(1, scrollY / scrollableHeight)) : 0,
  };
}

function publishNavigationScrollSnapshot() {
  navigationScrollFrameId = null;
  const nextSnapshot = readSnapshot();
  if (
    nextSnapshot.scrollY === navigationScrollSnapshot.scrollY &&
    nextSnapshot.scrollableHeight === navigationScrollSnapshot.scrollableHeight &&
    nextSnapshot.viewportHeight === navigationScrollSnapshot.viewportHeight
  ) {
    return;
  }

  navigationScrollSnapshot = Object.freeze(nextSnapshot);
  navigationScrollListeners.forEach((listener) => listener());
}

function queueNavigationScrollPublish() {
  if (navigationScrollFrameId !== null || typeof window === 'undefined') return;
  navigationScrollFrameId = window.requestAnimationFrame(publishNavigationScrollSnapshot);
}

function subscribeToNavigationScroll(listener) {
  navigationScrollListeners.add(listener);
  if (navigationScrollListeners.size === 1 && typeof window !== 'undefined') {
    navigationScrollSnapshot = Object.freeze(readSnapshot());
    window.addEventListener('scroll', queueNavigationScrollPublish, { passive: true });
    window.addEventListener('resize', queueNavigationScrollPublish, { passive: true });
  }

  return () => {
    navigationScrollListeners.delete(listener);
    if (navigationScrollListeners.size > 0 || typeof window === 'undefined') return;
    window.removeEventListener('scroll', queueNavigationScrollPublish);
    window.removeEventListener('resize', queueNavigationScrollPublish);
    if (navigationScrollFrameId !== null) {
      window.cancelAnimationFrame(navigationScrollFrameId);
    }
    navigationScrollFrameId = null;
  };
}

function useNavigationScrollSnapshot() {
  return useSyncExternalStore(
    subscribeToNavigationScroll,
    () => navigationScrollSnapshot,
    () => EMPTY_SNAPSHOT,
  );
}

// ── HUD and attention model ───────────────────────────────────────────────────

// ── Surface descriptors and step resolution ──────────────────────────────────

/**
 * Determines whether a value can represent a structured surface descriptor.
 * @param {*} value - Candidate surface descriptor
 * @returns {boolean} Whether the value is a structured descriptor
 */
// ── Visual atoms and card layout ──────────────────────────────────────────────

function getNavItemCardProps({
  cardScale,
  cardStyle,
  expanded,
  isAnchoredToBottom,
  position,
  visibleCount = 3,
}) {
  const { offsetY: collapsedOffsetY, scale: collapsedScale } = NAV_CARD_LAYOUT.collapsed;
  const { offsetY: expandedOffsetY } = NAV_CARD_LAYOUT.expanded;

  const safeCardStyle = cardStyle
    ? Object.fromEntries(
        Object.entries(cardStyle).filter(([key]) => key !== 'scale' && key !== 'className'),
      )
    : {};

  const isTop = position === 0;
  const isHeavyBlur = isTop || expanded;
  const collapsedScaleValue = collapsedScale ** position;
  const y = expanded ? position * expandedOffsetY : position * collapsedOffsetY;
  const scale = expanded ? cardScale || 1 : collapsedScaleValue;
  const opacity = expanded || position < visibleCount ? 1 : 0;

  return {
    className: cn(
      'absolute h-auto w-full ring-1 ring-inset ring-white/10 bg-black/50 rounded-[30px] p-2.5 transition-[background-color,box-shadow] duration-300 ease-out transform-gpu isolate',
      isHeavyBlur ? 'backdrop-blur-xl' : 'backdrop-blur-sm',
      isTop ? 'inset-0 h-full' : isAnchoredToBottom ? 'bottom-0' : 'top-0',
      isAnchoredToBottom ? 'cursor-default' : 'cursor-pointer',
      cardStyle?.className,
    ),
    style: {
      ...safeCardStyle,
      overflow: 'hidden',
      transformOrigin: isTop
        ? 'center center'
        : isAnchoredToBottom
          ? 'bottom center'
          : 'top center',
      zIndex: 10 - position,
      WebkitBackfaceVisibility: 'hidden',
      backfaceVisibility: 'hidden',
      WebkitMaskImage: '-webkit-radial-gradient(white, black)',
      ...(isTop ? { height: '100%' } : {}),
      pointerEvents: expanded || position < visibleCount ? undefined : 'none',
    },
    motionValues: {
      y,
      scale,
      opacity,
    },
  };
}

function shouldShowVideoIcon({ isActive, isVideo }) {
  return Boolean(isActive && isVideo);
}

function getViewportMaxHeight() {
  if (typeof window === 'undefined') return Infinity;
  return window.innerHeight - VIEWPORT_MARGIN;
}

function getContainerHeight({ cardContentHeight, compact, isHud = false }) {
  const chromeHeight = NAV_CARD_LAYOUT.chromeHeight;
  const minCardHeight = compact
    ? NAV_CARD_LAYOUT.compactHeight
    : isHud
      ? NAV_CARD_LAYOUT.hudHeight
      : NAV_CARD_LAYOUT.baseHeight;
  const numericContentHeight = Number(cardContentHeight);
  const nextCardHeight = Math.max(
    minCardHeight,
    (Number.isFinite(numericContentHeight) ? numericContentHeight : 0) + chromeHeight,
  );

  return Math.min(nextCardHeight, getViewportMaxHeight());
}

function getNavCardWidth(activeItem = null) {
  if (typeof window === 'undefined') {
    return 460;
  }

  const isDesktop = window.innerWidth >= 640;
  if (isDesktop && activeItem) {
    if (activeItem.width) {
      const targetWidth = Number(activeItem.width);
      if (Number.isFinite(targetWidth) && targetWidth > 0) {
        return Math.min(targetWidth, Math.max(window.innerWidth - 32, 0));
      }
    }
    if (activeItem.expandHorizontal) {
      return Math.min(640, Math.max(window.innerWidth - 32, 0));
    }
  }

  return Math.min(460, Math.max(window.innerWidth - 16, 0));
}

function renderIconNode(icon, size) {
  return typeof icon === 'string' ? <Iconify icon={icon} size={size} /> : icon;
}

/**
 * Renders animated navigation description text.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavDescription = memo(function NavDescription({ text, style, maxLines = 1 }) {
  const { className, inlineStyle } = splitStyle(style);
  const { opacity = 0.7, ...restStyle } = inlineStyle;
  const isMultiline = Number(maxLines) > 1;
  const targetOpacity = typeof opacity === 'number' ? opacity : 0.7;

  return (
    <div className="relative min-h-[1.25rem] w-full overflow-hidden text-sm">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={typeof text === 'string' || typeof text === 'number' ? text : 'desc'}
          variants={getNavDescriptionVariants(targetOpacity)}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_TEXT_ENTER_TRANSITION}
          className={cn(
            isMultiline ? 'wrap-break-word whitespace-normal' : 'truncate',
            'text-white',
            className,
          )}
          style={{ opacity: targetOpacity, ...getLineClampStyle(maxLines, restStyle) }}
        >
          {text}
        </motion.p>
      </AnimatePresence>
    </div>
  );
});

const NavIconOverlay = memo(function NavIconOverlay({ overlay }) {
  if (!overlay?.icon) return null;

  const { icon, onClick, title = '' } = overlay;
  const isImageSource = isImageIconSource(icon);
  const isInteractive = typeof onClick === 'function';

  const content = isImageSource ? (
    <span
      className="size-full rounded-full bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${icon})` }}
    />
  ) : (
    <span className="text-white">{renderIconNode(icon, 12)}</span>
  );

  const sharedClassName = cn(
    'absolute -right-1 -bottom-1 z-20 flex size-6 items-center justify-center overflow-hidden rounded-full bg-black ring ring-black transition-[background-color,color,box-shadow] duration-150 ease-out',
    isInteractive ? 'cursor-pointer' : 'cursor-default',
  );

  return (
    <AnimatePresence mode="popLayout">
      {isInteractive ? (
        <Button
          key={icon}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            onClick?.(event);
          }}
          title={title || undefined}
          aria-label={title || 'Action'}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
          className={sharedClassName}
        >
          {content}
        </Button>
      ) : (
        <motion.div
          key={icon}
          title={title || undefined}
          aria-label={title || undefined}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
          className={sharedClassName}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/**
 * Renders an animated navigation icon with an optional overlay action.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavIcon = memo(function NavIcon({
  icon,
  iconOverlay = null,
  style,
  onClick = null,
  ariaLabel = undefined,
}) {
  const { className, inlineStyle } = splitStyle(style);
  const { size = 24, ...iconStyle } = inlineStyle;
  const isImageSource = isImageIconSource(icon);
  const iconKey = typeof icon === 'string' ? icon : 'icon-node';

  const iconElement = (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={iconKey}
        variants={navFadeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={NAV_ICON_TRANSITION}
        className="size-full"
      >
        {isImageSource ? (
          <div
            className={cn(
              'size-12 shrink-0 rounded-[20px] bg-cover bg-center bg-no-repeat transition-all duration-300 ease-in-out',
              className,
            )}
            style={{
              ...getImageIconStyle(iconStyle, icon),
            }}
          />
        ) : (
          <div
            className={cn(
              'center size-12 rounded-[20px] bg-white/5 text-white transition-all duration-300 ease-in-out',
              className,
            )}
            style={iconStyle}
          >
            <span>{renderIconNode(icon, size)}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="relative size-12 shrink-0">
      {typeof onClick === 'function' ? (
        <Button
          type="button"
          className="size-full cursor-pointer p-0"
          onClick={onClick}
          aria-label={ariaLabel || 'Open'}
        >
          {iconElement}
        </Button>
      ) : (
        iconElement
      )}
      <NavIconOverlay overlay={iconOverlay} />
    </div>
  );
});

/**
 * Renders animated navigation title text.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavTitle = memo(function NavTitle({ text, style }) {
  const { className, inlineStyle } = splitStyle(style);

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.h3
          key={typeof text === 'string' || typeof text === 'number' ? text : 'title'}
          className={cn('truncate font-bold', className)}
          variants={navFadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_TEXT_ENTER_TRANSITION}
          style={inlineStyle}
        >
          {text}
        </motion.h3>
      </AnimatePresence>
    </div>
  );
});

/**
 * Renders page scroll progress on the active navigation card.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavScrollProgress = memo(function NavScrollProgress({
  className = '',
  enabled = true,
}) {
  const { progress, scrollableHeight } = useNavigationScrollSnapshot();
  const isScrollable = scrollableHeight > 20;

  if (!enabled || !isScrollable || progress <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px] overflow-hidden rounded-t-[30px]',
        className,
      )}
      aria-hidden="true"
    >
      <motion.div
        className="h-full bg-white/40 transition-transform duration-75 ease-out"
        style={getNavScrollProgressStyle(progress)}
      />
    </div>
  );
});

// ── Navigation state machine ──────────────────────────────────────────────────

/**
 * Creates the initial navigation state-machine value.
 * @returns {NavigationMachineState} Initial machine state
 */

// ── Breadcrumbs ────────────────────────────────────────────────────────────────

function createHomeBreadcrumb(isCurrent) {
  return {
    id: 'home',
    title: 'Tvizzie',
    path: '/',
    icon: '/tvizzie.png',
    isCurrent,
    level: 0,
  };
}

function createAccountBreadcrumbs(segments, overrides) {
  const [, usernameOrSection, section, item] = segments;

  if (!usernameOrSection) {
    return [
      {
        id: 'account',
        title: overrides['/account']?.title || 'Account',
        path: '/account',
        icon: overrides['/account']?.icon || 'solar:user-circle-bold',
        isCurrent: true,
        level: 1,
      },
    ];
  }

  if (usernameOrSection === 'edit') {
    return [
      {
        id: 'account',
        title: 'Account',
        path: '/account',
        icon: 'solar:user-circle-bold',
        isCurrent: false,
        level: 1,
      },
      {
        id: 'account-edit',
        title: overrides['/account/edit']?.title || 'Edit Profile',
        path: '/account/edit',
        icon: 'solar:pen-new-square-bold',
        isCurrent: true,
        level: 2,
      },
    ];
  }

  const userPath = `/account/${usernameOrSection}`;
  const breadcrumbs = [
    {
      id: `user-${usernameOrSection}`,
      title: overrides[userPath]?.title || `@${usernameOrSection}`,
      path: userPath,
      icon: overrides[userPath]?.icon || 'solar:user-circle-bold',
      isCurrent: segments.length === 2,
      level: 1,
    },
  ];

  if (!section) return breadcrumbs;

  const sectionPath = `${userPath}/${section}`;
  breadcrumbs.push({
    id: `section-${section}`,
    title: overrides[sectionPath]?.title || SECTION_TITLES[section] || formatSlugTitle(section),
    path: sectionPath,
    icon: overrides[sectionPath]?.icon || SECTION_ICONS[section] || null,
    isCurrent: segments.length === 3,
    level: 2,
  });

  if (!item) return breadcrumbs;

  const itemPath = `${sectionPath}/${item}`;
  breadcrumbs.push({
    id: `item-${item}`,
    title: overrides[itemPath]?.title || formatSlugTitle(item),
    path: itemPath,
    icon: overrides[itemPath]?.icon || null,
    isCurrent: true,
    level: 3,
  });
  return breadcrumbs;
}

function createMediaBreadcrumbs(segments, overrides) {
  const [mediaType, mediaId, section] = segments;
  const mediaPath = `/${mediaType}/${mediaId}`;
  const defaultTitle = mediaType === 'movie' ? 'Movie' : mediaType === 'tv' ? 'TV Show' : 'Person';
  const defaultIcon =
    mediaType === 'person' ? 'solar:user-rounded-bold' : 'solar:clapperboard-play-bold';
  const breadcrumbs = [
    {
      id: `${mediaType}-${mediaId}`,
      title: overrides[mediaPath]?.title || defaultTitle,
      path: mediaPath,
      icon: overrides[mediaPath]?.icon || defaultIcon,
      isCurrent: segments.length === 2,
      level: 1,
    },
  ];

  if (section !== 'reviews') return breadcrumbs;

  const reviewPath = `${mediaPath}/reviews`;
  breadcrumbs.push({
    id: `${mediaType}-${mediaId}-reviews`,
    title: overrides[reviewPath]?.title || 'Reviews',
    path: reviewPath,
    icon: 'solar:chat-round-bold',
    isCurrent: true,
    level: 2,
  });
  return breadcrumbs;
}

function createGenericBreadcrumbs(segments, overrides) {
  let currentPath = '';
  return segments.map((segment, index) => {
    currentPath += `/${segment}`;
    return {
      id: `segment-${segment}-${index}`,
      title: overrides[currentPath]?.title || SECTION_TITLES[segment] || formatSlugTitle(segment),
      path: currentPath,
      icon: overrides[currentPath]?.icon || SECTION_ICONS[segment] || null,
      isCurrent: index === segments.length - 1,
      level: index + 1,
    };
  });
}

/**
 * Builds breadcrumb entries for a pathname and optional route overrides.
 * @param {string} [pathname] - Route pathname
 * @param {object} [overrides] - Path-keyed title and icon overrides
 * @returns {Array<object>} Ordered breadcrumb entries
 */
export function resolveRouteBreadcrumbs(pathname = '', overrides = {}) {
  const normalizedPath = normalizePath(pathname) || '/';
  const homeBreadcrumb = createHomeBreadcrumb(normalizedPath === '/');

  if (normalizedPath === '/') {
    return [homeBreadcrumb];
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.length === 0) return [homeBreadcrumb];

  if (segments[0] === 'account') {
    return [homeBreadcrumb, ...createAccountBreadcrumbs(segments, overrides)];
  }

  if (['movie', 'tv', 'person'].includes(segments[0]) && segments[1]) {
    return [homeBreadcrumb, ...createMediaBreadcrumbs(segments, overrides)];
  }

  return [homeBreadcrumb, ...createGenericBreadcrumbs(segments, overrides)];
}

const BreadcrumbStateContext = createContext(null);
const BreadcrumbActionsContext = createContext(null);

/**
 * Provides breadcrumb override state and actions.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export function BreadcrumbProvider({ children }) {
  const [overrides, setOverrides] = useState({});

  const registerOverride = useCallback((path, config) => {
    if (!path || !config) return;
    const normalizedPath = String(path).trim().replace(/\/+$/, '') || '/';
    setOverrides((currentOverrides) => {
      const existing = currentOverrides[normalizedPath];
      if (existing?.title === config.title && existing?.icon === config.icon) {
        return currentOverrides;
      }
      return {
        ...currentOverrides,
        [normalizedPath]: {
          title: config.title || null,
          icon: config.icon || null,
        },
      };
    });
  }, []);

  const unregisterOverride = useCallback((path) => {
    if (!path) return;
    const normalizedPath = String(path).trim().replace(/\/+$/, '') || '/';
    setOverrides((currentOverrides) => {
      if (!currentOverrides[normalizedPath]) return currentOverrides;
      const nextOverrides = { ...currentOverrides };
      delete nextOverrides[normalizedPath];
      return nextOverrides;
    });
  }, []);

  const actions = useMemo(
    () => ({
      registerOverride,
      unregisterOverride,
    }),
    [registerOverride, unregisterOverride],
  );

  return createElement(
    BreadcrumbActionsContext.Provider,
    { value: actions },
    createElement(BreadcrumbStateContext.Provider, { value: overrides }, children),
  );
}

/**
 * Returns the current breadcrumb override map.
 * @returns {object} Path-keyed breadcrumb overrides
 */
export function useBreadcrumbOverrides() {
  return useRequiredContext(BreadcrumbStateContext, 'useBreadcrumbOverrides', 'BreadcrumbProvider');
}

/**
 * Returns breadcrumb override registration actions.
 * @returns {{registerOverride: Function, unregisterOverride: Function}} Breadcrumb actions
 */
export function useBreadcrumbActions() {
  return useRequiredContext(BreadcrumbActionsContext, 'useBreadcrumbActions', 'BreadcrumbProvider');
}

/**
 * Resolves breadcrumbs and parent navigation for the current route.
 * @returns {object} Current breadcrumb state and navigation helpers
 */
export function useNavBreadcrumbs() {
  const pathname = usePathname();
  const router = useRouter();
  const overrides = useBreadcrumbOverrides();

  const breadcrumbs = useMemo(
    () => resolveRouteBreadcrumbs(pathname, overrides),
    [pathname, overrides],
  );

  const current = breadcrumbs[breadcrumbs.length - 1] || null;
  const parent = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;
  const canGoBack = breadcrumbs.length > 1;

  const goBack = useCallback(() => {
    if (parent?.path) {
      router.push(parent.path);
    } else {
      router.back();
    }
  }, [parent?.path, router]);

  return {
    breadcrumbs,
    canGoBack,
    current,
    goBack,
    parent,
  };
}

/**
 * Registers a breadcrumb override for a component lifetime.
 * @param {object} [options] - Path, title, and icon override
 * @returns {void}
 */
export function useRegisterBreadcrumbOverride({ icon = null, path, title = null } = {}) {
  const { registerOverride, unregisterOverride } = useBreadcrumbActions();

  useEffect(() => {
    if (!path || (!title && !icon)) return undefined;

    registerOverride(path, { title, icon });

    return () => {
      unregisterOverride(path);
    };
  }, [icon, path, registerOverride, title, unregisterOverride]);
}

/**
 * Renders the expanded navigation breadcrumb card.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavBreadcrumbsCard = memo(function NavBreadcrumbsCard({
  className = '',
  maxItems = 4,
}) {
  const { breadcrumbs } = useNavBreadcrumbs();

  if (!breadcrumbs || breadcrumbs.length <= 1) {
    return null;
  }

  const itemsToRender =
    breadcrumbs.length > maxItems
      ? [
          breadcrumbs[0],
          { id: 'ellipsis', title: '...', isEllipsis: true },
          ...breadcrumbs.slice(-2),
        ]
      : breadcrumbs;

  return (
    <motion.div
      variants={navBreadcrumbsVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={NAV_BREADCRUMBS_TRANSITION}
      className={cn(
        'absolute inset-x-0 top-[calc(100%+4px)] z-10 flex h-[38px] w-full items-center justify-center rounded-[22px] bg-black/80 px-4 text-xs ring-1 ring-white/10 select-none ring-inset',
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <nav
        aria-label="Breadcrumbs"
        className="flex scrollbar-none items-center gap-2 overflow-x-auto"
      >
        {itemsToRender.map((crumb, index) => {
          const isLast = index === itemsToRender.length - 1;

          if (crumb.isEllipsis) {
            return (
              <span key="ellipsis" className="px-0.5 text-white/40 select-none">
                ...
              </span>
            );
          }

          return (
            <div key={crumb.id || crumb.path} className="flex items-center gap-2">
              {isLast ? (
                <span className="flex items-center gap-1.5 font-medium text-white">
                  {crumb.icon && (
                    <Iconify icon={crumb.icon} size={14} className="shrink-0 text-white/70" />
                  )}
                  <span className="max-w-[160px] truncate">{crumb.title}</span>
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
                >
                  {crumb.icon && (
                    <Iconify icon={crumb.icon} size={14} className="shrink-0 text-white/40" />
                  )}
                  <span className="max-w-[120px] truncate">{crumb.title}</span>
                </Link>
              )}

              {!isLast && (
                <Iconify
                  icon="solar:alt-arrow-right-linear"
                  size={12}
                  className="shrink-0 text-white/40"
                />
              )}
            </div>
          );
        })}
      </nav>
    </motion.div>
  );
});

// ── Media controls ─────────────────────────────────────────────────────────────

/**
 * Renders an animated soundwave indicator.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavSoundwave = memo(function NavSoundwave({
  isPlaying = false,
  className = '',
  barCount = 4,
}) {
  const safeBarCount = clamp(Math.floor(Number(barCount) || 0), 1, 12);
  return (
    <div
      className={cn('flex h-3.5 items-end justify-center gap-0.5', className)}
      aria-hidden="true"
    >
      {Array.from({ length: safeBarCount }).map((_, index) => (
        <motion.span
          key={index}
          custom={index}
          variants={navSoundwaveBarVariants}
          animate={isPlaying ? 'playing' : 'paused'}
          className="h-full w-0.5 origin-bottom rounded-full bg-white/70"
        />
      ))}
    </div>
  );
});

/**
 * Renders volume slider capsule, playback speed, skip buttons, PiP and loop toggle.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavMediaControls = memo(function NavMediaControls({ className = '' }) {
  const { videoElement, videoOptions } = useBackgroundState();
  const { toggleLoop } = useBackgroundActions();

  const [playbackRate, setPlaybackRate] = useState(videoElement?.playbackRate || 1);
  const [volume, setVolume] = useState(() => Number(videoElement?.volume ?? 1));
  const [isMuted, setIsMuted] = useState(() => Boolean(videoElement?.muted));
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const [isPipActive, setIsPipActive] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);

  const isDraggingRef = useRef(false);
  const volumeTrackRef = useRef(null);
  const volumeFillRef = useRef(null);
  const volumeThumbRef = useRef(null);
  const isLoop = Boolean(videoOptions?.loop);

  useEffect(() => {
    if (typeof document !== 'undefined' && 'pictureInPictureEnabled' in document) {
      setIsPipSupported(Boolean(document.pictureInPictureEnabled));
    }
  }, []);

  useEffect(() => {
    if (!videoElement) {
      setPlaybackRate(1);
      setVolume(1);
      setIsMuted(false);
      setIsPipActive(false);
      return undefined;
    }

    const syncState = () => {
      const nextRate = Number(videoElement.playbackRate);
      setPlaybackRate(Number.isFinite(nextRate) && nextRate > 0 ? nextRate : 1);

      if (isDraggingRef.current) return;

      const currentVol = Number(videoElement.volume) || 0;
      const currentMute = Boolean(videoElement.muted);
      setVolume(currentVol);
      setIsMuted(currentMute);

      const effective = currentMute ? 0 : currentVol;
      if (volumeFillRef.current) {
        volumeFillRef.current.style.width = `${effective * 100}%`;
      }
      if (volumeThumbRef.current) {
        volumeThumbRef.current.style.left = `${effective * 100}%`;
      }
    };

    const handleEnterPip = () => setIsPipActive(true);
    const handleLeavePip = () => setIsPipActive(false);

    syncState();
    videoElement.addEventListener('ratechange', syncState);
    videoElement.addEventListener('volumechange', syncState);
    videoElement.addEventListener('enterpictureinpicture', handleEnterPip);
    videoElement.addEventListener('leavepictureinpicture', handleLeavePip);

    return () => {
      videoElement.removeEventListener('ratechange', syncState);
      videoElement.removeEventListener('volumechange', syncState);
      videoElement.removeEventListener('enterpictureinpicture', handleEnterPip);
      videoElement.removeEventListener('leavepictureinpicture', handleLeavePip);
    };
  }, [videoElement]);

  const handleCycleSpeed = useCallback(() => {
    if (!videoElement) return;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    videoElement.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate, videoElement]);

  const updateVolumeFromPosition = useCallback(
    (clientX) => {
      if (!videoElement || !volumeTrackRef.current) return;
      const rect = volumeTrackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const fraction = offsetX / rect.width;
      const nextVolume = Math.round(fraction * 100) / 100;

      if (volumeFillRef.current) {
        volumeFillRef.current.style.width = `${fraction * 100}%`;
      }
      if (volumeThumbRef.current) {
        volumeThumbRef.current.style.left = `${fraction * 100}%`;
      }

      videoElement.volume = nextVolume;
      videoElement.muted = nextVolume === 0;

      setVolume(nextVolume);
      setIsMuted(nextVolume === 0);
    },
    [videoElement],
  );

  const handleVolumePointerDown = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      isDraggingRef.current = true;
      setIsDraggingVolume(true);

      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Pointer capture fallback
      }

      updateVolumeFromPosition(event.clientX);

      const handlePointerMove = (moveEvent) => {
        if (!isDraggingRef.current) return;
        updateVolumeFromPosition(moveEvent.clientX);
      };

      const handlePointerUp = () => {
        isDraggingRef.current = false;
        setIsDraggingVolume(false);
        if (videoElement) {
          setVolume(Number(videoElement.volume) || 0);
          setIsMuted(Boolean(videoElement.muted));
        }
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [updateVolumeFromPosition, videoElement],
  );

  const handleToggleMute = useCallback(
    (event) => {
      event.stopPropagation();
      if (!videoElement) return;
      if (isMuted || volume === 0) {
        const restoredVolume = volume === 0 ? 0.7 : volume;
        videoElement.volume = restoredVolume;
        videoElement.muted = false;
        setVolume(restoredVolume);
        setIsMuted(false);
        if (volumeFillRef.current) {
          volumeFillRef.current.style.width = `${restoredVolume * 100}%`;
        }
        if (volumeThumbRef.current) {
          volumeThumbRef.current.style.left = `${restoredVolume * 100}%`;
        }
      } else {
        videoElement.muted = true;
        setIsMuted(true);
        if (volumeFillRef.current) {
          volumeFillRef.current.style.width = '0%';
        }
        if (volumeThumbRef.current) {
          volumeThumbRef.current.style.left = '0%';
        }
      }
    },
    [isMuted, videoElement, volume],
  );

  const handleTogglePip = useCallback(async () => {
    if (!videoElement) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture();
      }
    } catch {
      // Ignore unsupported or rejected PiP attempts gracefully
    }
  }, [videoElement]);

  const handleSkipBackward = useCallback(() => {
    if (!videoElement) return;
    const current = Number(videoElement.currentTime) || 0;
    videoElement.currentTime = Math.max(0, current - 10);
  }, [videoElement]);

  const handleSkipForward = useCallback(() => {
    if (!videoElement) return;
    const current = Number(videoElement.currentTime) || 0;
    const duration = Number(videoElement.duration) || 0;
    videoElement.currentTime = duration > 0 ? Math.min(duration, current + 10) : current + 10;
  }, [videoElement]);

  const effectiveVolume = isMuted ? 0 : volume;
  const volumeIcon =
    effectiveVolume === 0
      ? 'solar:volume-cross-bold'
      : effectiveVolume < 0.5
        ? 'solar:volume-low-bold'
        : 'solar:volume-loud-bold';

  return (
    <div className={cn('flex w-full items-center justify-between gap-2 select-none', className)}>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          onClick={handleCycleSpeed}
          className={cn(
            'flex h-8 cursor-pointer items-center justify-center rounded-full px-3 text-xs font-semibold tabular-nums ring-1 ring-inset',
            playbackRate !== 1
              ? 'bg-white/10 text-white ring-white/10 hover:bg-white/15'
              : 'bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10',
          )}
          aria-label={`Playback speed ${playbackRate}x`}
          title={`Playback speed: ${playbackRate}x`}
        >
          <span>{playbackRate}x</span>
        </Button>

        <Button
          type="button"
          onClick={handleSkipBackward}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
          aria-label="Rewind 10 seconds"
          title="Rewind 10 seconds"
        >
          <Iconify icon="solar:rewind-10-seconds-back-bold" size={16} />
        </Button>

        <Button
          type="button"
          onClick={handleSkipForward}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
          aria-label="Forward 10 seconds"
          title="Forward 10 seconds"
        >
          <Iconify icon="solar:rewind-10-seconds-forward-bold" size={16} />
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={!isDraggingVolume ? { scale: 0.98 } : undefined}
          transition={NAV_BUTTON_TRANSITION}
          className={cn(
            'group flex h-8 items-center gap-1.5 rounded-full px-2.5 ring-1 transition-colors duration-150 select-none ring-inset',
            isDraggingVolume
              ? 'bg-white/10 ring-white/10'
              : 'bg-white/5 ring-white/5 hover:bg-white/10 hover:ring-white/10',
          )}
        >
          <Button
            type="button"
            onClick={handleToggleMute}
            whileHover={false}
            whileTap={false}
            className="flex size-5 cursor-pointer items-center justify-center p-0 text-white/70 hover:text-white"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            title={isMuted ? 'Unmute' : `Volume: ${Math.round(effectiveVolume * 100)}%`}
          >
            <Iconify icon={volumeIcon} size={16} />
          </Button>

          <div
            ref={volumeTrackRef}
            role="slider"
            aria-label="Volume slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(effectiveVolume * 100)}
            tabIndex={0}
            onPointerDown={handleVolumePointerDown}
            onKeyDown={(event) => {
              if (!videoElement) return;
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                const next = Math.max(0, volume - 0.05);
                videoElement.volume = next;
                videoElement.muted = next === 0;
              } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                const next = Math.min(1, volume + 0.05);
                videoElement.volume = next;
                videoElement.muted = false;
              }
            }}
            className="group/track relative flex h-6 w-16 cursor-pointer touch-none items-center select-none sm:w-20"
          >
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                ref={volumeFillRef}
                className="h-full origin-left rounded-full bg-white"
                style={{
                  width: `${effectiveVolume * 100}%`,
                  transition: isDraggingVolume
                    ? 'none'
                    : 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>

            <motion.div
              ref={volumeThumbRef}
              className={cn(
                'pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md ring-2 ring-black transition-opacity duration-150 ease-out',
                isDraggingVolume ? 'opacity-100' : 'opacity-0 group-hover/track:opacity-100',
              )}
              animate={{
                scale: isDraggingVolume ? 1.25 : 1,
                boxShadow: isDraggingVolume
                  ? '0 0 8px rgba(255, 255, 255, 0.45)'
                  : '0 1px 3px rgba(0, 0, 0, 0.5)',
              }}
              transition={NAV_BUTTON_TRANSITION}
              style={{
                left: `${effectiveVolume * 100}%`,
                transition: isDraggingVolume ? 'none' : 'left 240ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
        </motion.div>

        {isPipSupported && (
          <Button
            type="button"
            onClick={handleTogglePip}
            className={cn(
              'flex size-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset',
              isPipActive
                ? 'bg-white/10 text-white ring-white/10 hover:bg-white/15'
                : 'bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10',
            )}
            aria-label={isPipActive ? 'Exit Picture-in-Picture' : 'Enter Picture-in-Picture'}
            title={isPipActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
          >
            <Iconify icon="solar:pip-bold" size={16} />
          </Button>
        )}

        <Button
          type="button"
          onClick={toggleLoop}
          className={cn(
            'flex size-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset',
            isLoop
              ? 'bg-white/10 text-white ring-white/10 hover:bg-white/15'
              : 'bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10',
          )}
          aria-label={isLoop ? 'Disable loop' : 'Enable loop'}
          title={isLoop ? 'Loop: On' : 'Loop: Off'}
        >
          <Iconify icon="solar:repeat-bold" size={16} />
        </Button>
      </div>
    </div>
  );
});

/**
 * Renders an interactive progress scrubber for the active video.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export const NavMediaScrubber = memo(function NavMediaScrubber({
  className = '',
  showTimeOnHover = true,
}) {
  const { isVideo, isPlaying, videoElement } = useBackgroundState();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);

  const scrubberRef = useRef(null);
  const progressBarRef = useRef(null);

  useEffect(() => {
    if (!videoElement) {
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = 'scaleX(0)';
      }
      setCurrentTime(0);
      setDuration(0);
      return undefined;
    }

    let animationFrameId = null;

    const publishProgress = () => {
      const rawCurrentTime = Number(videoElement.currentTime);
      const rawDuration = Number(videoElement.duration);
      const current = Number.isFinite(rawCurrentTime) && rawCurrentTime >= 0 ? rawCurrentTime : 0;
      const total = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;
      const ratio = total > 0 ? clamp(current / total, 0, 1) : 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${ratio})`;
      }
      setCurrentTime((publishedTime) =>
        Math.abs(publishedTime - current) >= 0.1 ? current : publishedTime,
      );
      setDuration((publishedDuration) => (publishedDuration === total ? publishedDuration : total));
    };

    const runProgressLoop = () => {
      publishProgress();
      animationFrameId = requestAnimationFrame(runProgressLoop);
    };

    publishProgress();
    if (isPlaying) animationFrameId = requestAnimationFrame(runProgressLoop);

    videoElement.addEventListener('timeupdate', publishProgress);
    videoElement.addEventListener('durationchange', publishProgress);
    videoElement.addEventListener('loadedmetadata', publishProgress);

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      videoElement.removeEventListener('timeupdate', publishProgress);
      videoElement.removeEventListener('durationchange', publishProgress);
      videoElement.removeEventListener('loadedmetadata', publishProgress);
    };
  }, [isPlaying, videoElement]);

  const seekToTime = useCallback(
    (targetTime) => {
      if (!videoElement || duration <= 0) return;
      const nextTime = clamp(targetTime, 0, duration);
      videoElement.currentTime = nextTime;
      setCurrentTime(nextTime);
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${nextTime / duration})`;
      }
    },
    [duration, videoElement],
  );

  const handleSeek = useCallback(
    (event) => {
      if (!videoElement || !scrubberRef.current || !duration) return;

      const rect = scrubberRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = rect.width > 0 ? offsetX / rect.width : 0;
      seekToTime(percentage * duration);
    },
    [duration, seekToTime, videoElement],
  );

  const handleKeyDown = useCallback(
    (event) => {
      const keyTargets = {
        ArrowLeft: currentTime - 5,
        ArrowRight: currentTime + 5,
        Home: 0,
        End: duration,
      };
      if (!(event.key in keyTargets)) return;
      event.preventDefault();
      event.stopPropagation();
      seekToTime(keyTargets[event.key]);
    },
    [currentTime, duration, seekToTime],
  );

  const handleMouseMove = useCallback(
    (event) => {
      if (!scrubberRef.current || !duration) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? 0;
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = rect.width > 0 ? offsetX / rect.width : 0;
      setHoverPosition(offsetX);
      setHoverTime(percentage * duration);
    },
    [duration],
  );

  if (!isVideo || !videoElement) {
    return null;
  }

  return (
    <div
      ref={scrubberRef}
      role="slider"
      aria-label="Media playback scrubber"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(currentTime)}
      aria-valuetext={`${formatMediaTime(currentTime)} of ${formatMediaTime(duration)}`}
      tabIndex={0}
      className={cn(
        'group absolute inset-x-0 top-0 z-30 h-3 cursor-pointer touch-none overflow-hidden rounded-t-[30px] select-none',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        event.stopPropagation();
        handleSeek(event);
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] w-full bg-white/10 transition-all duration-200 group-hover:h-1">
        <div
          ref={progressBarRef}
          className="h-full w-full origin-left bg-white/70 transition-colors duration-150 group-hover:bg-white"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      <AnimatePresence>
        {isHovered && showTimeOnHover && duration > 0 && (
          <motion.div
            variants={navScrubberTooltipVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_SCRUBBER_TOOLTIP_TRANSITION}
            className="pointer-events-none absolute top-3 -translate-x-1/2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs text-white ring-1 ring-white/10 ring-inset"
            style={{ left: hoverPosition }}
          >
            {formatMediaTime(hoverTime)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── Toolbar actions ────────────────────────────────────────────────────────────

function useDefaultNavActions() {
  const router = useRouter();
  const toast = useToast();
  const { openModal, closeModal, isOpen, modalType } = useModal();
  const runtime = useNavRuntimeRegistry();
  const { isAuthenticated, isReady, signOut, user } = useAuth();

  const userId = isAuthenticated ? (user?.id ?? null) : null;
  const isAuthSessionReady = useAuthSessionReady(userId);
  const [unreadCount, setUnreadCount] = useState(0);

  const isSignedIn = Boolean(isAuthenticated);
  const canOpenNotifications = Boolean(isAuthenticated && user?.id);

  const unreadBadge = unreadCount > 0 ? (unreadCount > 99 ? '99+' : `${unreadCount}`) : null;
  const subscribeToUnreadCount = runtime?.integrations?.notifications?.subscribeToUnreadCount;

  useEffect(() => {
    if (
      !isReady ||
      !isAuthSessionReady ||
      !isAuthenticated ||
      !user?.id ||
      typeof subscribeToUnreadCount !== 'function'
    ) {
      setUnreadCount(0);
      return;
    }

    return subscribeToUnreadCount(user.id, setUnreadCount);
  }, [isAuthenticated, isAuthSessionReady, isReady, subscribeToUnreadCount, user?.id]);

  return useMemo(
    () => [
      {
        key: NAV_ACTION_KEYS.NOTIFICATIONS,
        icon: 'solar:bell-bold',
        tooltip: 'Notifications',
        visible: canOpenNotifications,
        order: NAV_ACTION_ORDER.NOTIFICATIONS,
        badge: unreadBadge,
        onClick: (event) => {
          stopPropagation(event);
          if (isOpen && modalType === 'NOTIFICATIONS_MODAL') {
            closeModal();
            return;
          }
          openModal('NOTIFICATIONS_MODAL', 'left', {
            data: { userId: user?.id ?? null },
          });
        },
      },
      {
        key: NAV_ACTION_KEYS.LOGOUT,
        icon: 'solar:logout-2-bold',
        tooltip: 'Logout',
        visible: isSignedIn,
        order: NAV_ACTION_ORDER.LOGOUT,
        onClick: async (event) => {
          stopPropagation(event);

          try {
            await signOut();
            router.replace('/');
          } catch (error) {
            toast.error(error?.message || 'Could not sign out');
          }
        },
      },
    ],
    [
      canOpenNotifications,
      isSignedIn,
      toast,
      openModal,
      closeModal,
      isOpen,
      modalType,
      unreadBadge,
      router,
      signOut,
      user?.id,
    ],
  );
}

function useNavActions({ activeItem } = {}) {
  const defaultActions = useDefaultNavActions();
  const { contextActions = [] } = useNavigationState();

  return useMemo(() => {
    if (isActionlessNavItem(activeItem)) {
      return [];
    }

    const extendedActions = normalizeToolbarActions(activeItem?.actions);
    const dynamicContextActions = normalizeToolbarActions(contextActions);

    if (activeItem?.isStatus) {
      if (!isStatusToolbarActionAllowed(activeItem)) {
        return [];
      }

      return sortToolbarActionsByOrder(
        getVisibleToolbarActions([...extendedActions, ...dynamicContextActions]),
      );
    }

    return sortToolbarActionsByOrder(
      filterContextToolbarActions(
        getVisibleToolbarActions([...defaultActions, ...extendedActions, ...dynamicContextActions]),
        activeItem,
      ),
    );
  }, [activeItem, defaultActions, contextActions]);
}

const NavAction = memo(function NavAction({ action }) {
  return (
    <Tooltip className="px-2" text={action.tooltip}>
      <Button
        className="center relative size-8 cursor-pointer rounded-xl p-1 text-white/70 hover:bg-white/10 hover:text-white"
        onClick={action.onClick}
        type="button"
        disabled={action.disabled}
        aria-label={action.tooltip}
      >
        <Iconify icon={action.icon} size={16} />
        <AnimatePresence mode="popLayout">
          {action.badge && (
            <motion.span
              key={action.badge}
              variants={navBadgeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_BADGE_TRANSITION}
              className="center bg-info absolute -top-1 -right-1 h-4 min-w-4 rounded-full p-1 text-xs leading-none font-semibold text-black"
            >
              {action.badge}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </Tooltip>
  );
});

const NavActionsContainer = memo(function NavActionsContainer({ activeItem }) {
  const actions = useNavActions({ activeItem });

  if (!actions.length) return null;

  return (
    <div className="mr-1 flex shrink-0 items-center">
      <AnimatePresence mode="popLayout">
        {actions.map((action, index) => (
          <motion.div
            key={action.key || action.icon || `nav-action-${index}`}
            variants={staggerItemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={getNavActionStaggerTransition(index)}
          >
            <NavAction action={action} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

// ── Surface, HUD, and status presentation ─────────────────────────────────────

export {
  NavSurfaceHeader,
  NavSurfaceHeaderButton,
  NavSurfaceShell,
  useSurfaceHeader,
} from './surface';

export { NavHudShell } from './hud';

/** Connects the self-contained HUD view to navigation provider state. */
export const NavHud = memo(function NavHud() {
  const { hud } = useNavigationState();
  const { clearHud } = useNavigationActions();
  return <NavHudView clearHud={clearHud} hud={hud} pathname={usePathname()} />;
});

/**
 * Reserves layout space for the fixed navigation stack.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export function NavHeightSpacer({ className = '' }) {
  const { navHeight } = useNavHeight();

  return (
    <div aria-hidden="true" className={className} style={{ flexShrink: 0, height: navHeight }} />
  );
}

// ── Measurement, compact behavior, and viewport hooks ─────────────────────────

function getObservedHeight(entry, element) {
  const borderBoxSize = Array.isArray(entry?.borderBoxSize)
    ? entry.borderBoxSize[0]
    : entry?.borderBoxSize;

  if (borderBoxSize?.blockSize != null) {
    return Math.round(borderBoxSize.blockSize);
  }

  if (entry?.contentRect?.height != null) {
    return Math.round(entry.contentRect.height);
  }

  return Math.round(element?.offsetHeight || 0);
}

function hasMeaningfulHeightChange(previousHeight, nextHeight) {
  return Math.abs(Math.round(nextHeight) - Math.round(previousHeight)) > HEIGHT_EPSILON;
}

function useElementHeight(onHeightChange, elementRef, shouldMeasure, dependencyKey = null) {
  const lastHeightRef = useRef(0);
  const rafRef = useRef(null);
  const callbackRef = useRef(onHeightChange);

  useEffect(() => {
    callbackRef.current = onHeightChange;
  });

  useIsomorphicLayoutEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    lastHeightRef.current = -1;

    if (!callbackRef.current) return;

    if (!shouldMeasure) {
      if (hasMeaningfulHeightChange(lastHeightRef.current, 0)) {
        lastHeightRef.current = 0;
        callbackRef.current(0);
      }
      return;
    }

    const element = elementRef?.current;
    if (!element) return;

    function publishHeight(nextHeight) {
      if (!hasMeaningfulHeightChange(lastHeightRef.current, nextHeight)) return;
      lastHeightRef.current = nextHeight;
      callbackRef.current?.(nextHeight);
    }

    let pendingHeight = null;
    function flushPendingHeight() {
      rafRef.current = null;

      if (pendingHeight == null) {
        return;
      }

      const heightToPublish = pendingHeight;
      pendingHeight = null;

      publishHeight(heightToPublish);
    }

    function scheduleMeasurement(nextHeight) {
      pendingHeight = nextHeight;

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(flushPendingHeight);
    }

    const initialMeasuredHeight = element.offsetHeight || 0;
    if (initialMeasuredHeight > 0) {
      publishHeight(initialMeasuredHeight);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        scheduleMeasurement(getObservedHeight(entry, element));
      }
    });

    observer.observe(element);

    const handlePageShow = () => {
      scheduleMeasurement(element.offsetHeight || 0);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      handlePageShow();
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [dependencyKey, elementRef, shouldMeasure]);
}

function useNavHeightController({ compact, isHud = false, setNavHeight }) {
  const [containerHeight, setContainerHeight] = useState(
    isHud ? NAV_CARD_LAYOUT.hudHeight : NAV_CARD_LAYOUT.baseHeight,
  );

  const heightRef = useRef({ content: 0 });
  const rafRef = useRef(null);
  const compactRef = useRef(compact);
  const isHudRef = useRef(isHud);
  const lastAppliedContainerHeightRef = useRef(
    isHud ? NAV_CARD_LAYOUT.hudHeight : NAV_CARD_LAYOUT.baseHeight,
  );
  const lastAppliedSpacerHeightRef = useRef(
    (isHud ? NAV_CARD_LAYOUT.hudHeight : NAV_CARD_LAYOUT.baseHeight) + NAV_HEIGHT_BUFFER,
  );

  compactRef.current = compact;
  isHudRef.current = isHud;

  const applyHeight = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const { content } = heightRef.current;
    const height = getContainerHeight({
      cardContentHeight: content,
      compact: compactRef.current,
      isHud: isHudRef.current,
    });
    const isBottomLockedForSpacer = getDistanceToBottom() <= NAV_SPACER_BOTTOM_LOCK_DISTANCE;
    const spacerBaseHeight = isBottomLockedForSpacer ? NAV_CARD_LAYOUT.compactHeight : height;
    const totalSpacerHeight = spacerBaseHeight + NAV_HEIGHT_BUFFER;

    if (Math.abs(height - lastAppliedContainerHeightRef.current) > 0.5) {
      lastAppliedContainerHeightRef.current = height;
      setContainerHeight(height);
    }

    if (Math.abs(totalSpacerHeight - lastAppliedSpacerHeightRef.current) > 0.5) {
      lastAppliedSpacerHeightRef.current = totalSpacerHeight;
      setNavHeight(totalSpacerHeight);
    }
  }, [setNavHeight]);

  const handleContentHeightChange = useCallback(
    (height) => {
      if (height > 0) {
        heightRef.current.content = height;
      }
      if (compactRef.current) return;

      applyHeight();
    },
    [applyHeight],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (compact) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const compactHeight = NAV_CARD_LAYOUT.compactHeight;
      const compactSpacerHeight = compactHeight + NAV_HEIGHT_BUFFER;

      lastAppliedContainerHeightRef.current = compactHeight;
      lastAppliedSpacerHeightRef.current = compactSpacerHeight;

      setContainerHeight(compactHeight);
      setNavHeight(compactSpacerHeight);
      return;
    }

    applyHeight();
  }, [compact, isHud, applyHeight, setNavHeight]);

  return {
    containerHeight,
    handleContentHeightChange,
  };
}

function useNavKeyboard({
  expanded,
  focusedIndex,
  isOverlayActive,
  navigate,
  navigationItems,
  setExpanded,
  setFocusedIndex,
}) {
  const handleKeyDown = useCallback(
    (event) => {
      if (isEditableNavigationTarget(event.target) || isInteractiveTarget(event.target)) {
        return;
      }

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

      if (navigationItems.length === 0) return;

      if (key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((currentIndex) =>
          currentIndex < navigationItems.length - 1 ? currentIndex + 1 : 0,
        );
        return;
      }

      if (key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((currentIndex) =>
          currentIndex > 0 ? currentIndex - 1 : navigationItems.length - 1,
        );
      }
    },
    [
      expanded,
      focusedIndex,
      isOverlayActive,
      navigate,
      navigationItems,
      setExpanded,
      setFocusedIndex,
    ],
  );

  useEffect(() => {
    if (!expanded) return undefined;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, handleKeyDown]);
}

function useNavViewport(activeItem = null) {
  const [stackWidth, setStackWidth] = useState(() => getNavCardWidth(activeItem));
  const [portalTarget, setPortalTarget] = useState(null);

  useIsomorphicLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    setStackWidth(getNavCardWidth(activeItem));
  }, [activeItem]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let resizeFrameId = null;
    const handleResize = () => {
      if (resizeFrameId !== null) return;
      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        setStackWidth(getNavCardWidth(activeItem));
      });
    };

    setStackWidth(getNavCardWidth(activeItem));
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeFrameId !== null) window.cancelAnimationFrame(resizeFrameId);
    };
  }, [activeItem]);

  return {
    portalTarget,
    stackWidth,
  };
}

function useNavigationCompact({
  activeItem,
  expanded,
  isHudActive = false,
  pathname,
  searchQuery = '',
  compactLocked = false,
  isVideoPlaying = false,
}) {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const restoreCompactRef = useRef(false);
  const suppressCompactUntilRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const downwardTravelRef = useRef(0);
  const lastToggleTimeRef = useRef(0);
  const bottomLockRef = useRef(false);
  const hasActiveItem = Boolean(activeItem);
  const activeItemPath = activeItem?.path || '';
  const activeItemName = activeItem?.name || '';
  const activeItemTitle = activeItem?.title || activeItem?.name || '';
  const isOverlay = Boolean(activeItem?.isOverlay);
  const isSurface = Boolean(activeItem?.isSurface);
  const isLoading = Boolean(activeItem?.isLoading);
  const isStatus = Boolean(activeItem?.isStatus);
  const isActionEngaged = Boolean(searchQuery?.trim());
  const behavior = useNavigationBehavior({ isVideoPlaying });
  const isBehaviorFocused = behavior === NAV_COMPACT_BEHAVIOR.FOCUSED;

  useEffect(() => {
    const compactAllowed = canUseCompactNav({
      hasActiveItem,
      isActionEngaged,
      isBehaviorFocused,
      isHudActive,
      isLoading,
      isOverlay,
      isStatus,
      isSurface,
      title: activeItemTitle,
    });
    const canPreserveCompactRestore =
      typeof window !== 'undefined' && isSurface && restoreCompactRef.current;

    if (!compactAllowed || compactLocked || typeof window === 'undefined') {
      if (canPreserveCompactRestore) {
        compactRef.current = false;
        lastScrollYRef.current = window.scrollY || 0;
        downwardTravelRef.current = 0;
        setCompact(false);
        return undefined;
      }

      restoreCompactRef.current = false;
      compactRef.current = false;
      bottomLockRef.current = false;
      lastScrollYRef.current = 0;
      downwardTravelRef.current = 0;
      setCompact(false);
      return undefined;
    }

    const currentScrollY = window.scrollY || 0;
    const initialDistanceToBottom = getDistanceToBottom(currentScrollY);
    const initialScrollableHeight = getScrollableHeight();
    const shouldStartBottomLocked =
      canUseBottomLock(initialScrollableHeight) &&
      initialDistanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;

    if (expanded) {
      restoreCompactRef.current = compactRef.current;
      compactRef.current = false;
      bottomLockRef.current = false;
      suppressCompactUntilRef.current = 0;
      lastScrollYRef.current = currentScrollY;
      downwardTravelRef.current = 0;
      setCompact(false);
      return undefined;
    }

    const shouldRestoreCompact =
      restoreCompactRef.current && currentScrollY > COMPACT_RELEASE_THRESHOLD;

    restoreCompactRef.current = false;
    bottomLockRef.current = shouldStartBottomLocked;
    compactRef.current = shouldStartBottomLocked ? true : shouldRestoreCompact;
    lastScrollYRef.current = currentScrollY;
    downwardTravelRef.current = 0;
    setCompact(shouldStartBottomLocked ? true : shouldRestoreCompact);

    const updateCompactState = () => {
      const scrollY = window.scrollY || 0;
      const distanceToBottom = getDistanceToBottom(scrollY);
      const scrollableHeight = getScrollableHeight();
      const canBottomLock = canUseBottomLock(scrollableHeight);
      const shouldActivateBottomLock =
        canBottomLock && distanceToBottom <= BOTTOM_LOCK_ACTIVATION_DISTANCE;
      const shouldKeepBottomLock =
        canBottomLock && distanceToBottom <= BOTTOM_LOCK_RELEASE_DISTANCE;

      if (bottomLockRef.current && !canBottomLock) {
        bottomLockRef.current = false;
        downwardTravelRef.current = 0;

        if (compactRef.current && scrollY < COMPACT_SCROLL_THRESHOLD) {
          compactRef.current = false;
          lastScrollYRef.current = scrollY;
          setCompact(false);
          return;
        }
      }

      if (shouldActivateBottomLock) {
        bottomLockRef.current = true;
      }

      if (bottomLockRef.current && shouldKeepBottomLock) {
        lastScrollYRef.current = scrollY;
        downwardTravelRef.current = 0;
        suppressCompactUntilRef.current = 0;

        if (!compactRef.current) {
          compactRef.current = true;
          lastToggleTimeRef.current = getCurrentTimestamp();
          setCompact(true);
        }

        return;
      }

      if (bottomLockRef.current && !shouldKeepBottomLock) {
        bottomLockRef.current = false;
      }

      if (scrollY < OVERSCROLL_THRESHOLD) {
        lastScrollYRef.current = scrollY;
        return;
      }

      const scrollDelta = scrollY - lastScrollYRef.current;
      const compactActivationSuppressed =
        !compactRef.current && getCurrentTimestamp() < suppressCompactUntilRef.current;

      if (scrollDelta >= COMPACT_MIN_ACTIVATION_DELTA) {
        downwardTravelRef.current += scrollDelta;
      } else if (scrollDelta < -SCROLL_DIRECTION_EPSILON || scrollY <= COMPACT_RELEASE_THRESHOLD) {
        downwardTravelRef.current = 0;
      }

      const nextValue = resolveCompactState(
        scrollY,
        lastScrollYRef.current,
        compactRef.current,
        downwardTravelRef.current,
        compactActivationSuppressed,
      );
      lastScrollYRef.current = scrollY;

      if (nextValue === compactRef.current) {
        return;
      }

      if (getCurrentTimestamp() - lastToggleTimeRef.current < COMPACT_TOGGLE_COOLDOWN_MS) {
        return;
      }

      compactRef.current = nextValue;
      lastToggleTimeRef.current = getCurrentTimestamp();

      if (nextValue) {
        downwardTravelRef.current = 0;
      }

      setCompact(nextValue);
    };

    const handleWheel = (event) => {
      const horizontalDelta = Math.abs(event.deltaX);
      const verticalDelta = Math.abs(event.deltaY);

      if (horizontalDelta < HORIZONTAL_GESTURE_DELTA_THRESHOLD) {
        return;
      }

      if (horizontalDelta <= verticalDelta * HORIZONTAL_GESTURE_DOMINANCE_RATIO) {
        return;
      }

      suppressCompactUntilRef.current = getCurrentTimestamp() + HORIZONTAL_GESTURE_SUPPRESSION_MS;
      downwardTravelRef.current = 0;
    };

    updateCompactState();
    const unsubscribeScroll = subscribeToNavigationScroll(updateCompactState);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      unsubscribeScroll();
      window.removeEventListener('wheel', handleWheel);
    };
  }, [
    pathname,
    expanded,
    compactLocked,
    hasActiveItem,
    isActionEngaged,
    isBehaviorFocused,
    isHudActive,
    activeItemName,
    activeItemPath,
    activeItemTitle,
    isLoading,
    isOverlay,
    isStatus,
    isSurface,
  ]);

  return compact;
}

// ── Route resolution and display model ────────────────────────────────────────

function useNavigationCore() {
  const pathname = usePathname();
  const router = useRouter();
  const { closeSurface, openSurface } = useNavigationActions();
  const { startLoading, stopLoading } = useLoadingActions();
  const { createGuardSurface } = useNavRuntimeRegistry();
  const previousPathRef = useRef(pathname);

  const cancelNavigation = useCallback(() => {
    closeSurface({
      cancelled: true,
      reason: 'guard',
      success: false,
    });
  }, [closeSurface]);

  const openGuardConfirmation = useCallback(
    ({ href, from, message }) => {
      emitNavigationEvent(NAV_EVENTS.NAVIGATE_START, { from, to: href });
      const confirmNavigation = () => {
        blurActiveElement();
        startLoading({ showOverlay: false });
        router.push(href);
        emitNavigationEvent(NAV_EVENTS.NAVIGATE, { from, item: undefined, to: href });
      };
      const cancelNavigation = () =>
        closeSurface({ cancelled: true, reason: 'guard', success: false });

      const surface = createGuardSurface?.({
        to: href,
        from,
        message: message || 'You have unsaved changes. Are you sure you want to leave this page?',
        onCancel: cancelNavigation,
        onConfirm: confirmNavigation,
      });

      if (surface) {
        openSurface(surface);
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          '[Navigation] Missing NAV_RUNTIME createGuardSurface; using browser confirmation.',
        );
      }

      if (
        typeof window !== 'undefined' &&
        window.confirm(message || 'Are you sure you want to leave this page?')
      ) {
        confirmNavigation();
      } else {
        cancelNavigation();
      }
    },
    [closeSurface, createGuardSurface, openSurface, router, startLoading],
  );

  const navigate = useCallback(
    async (href, { force = false } = {}) => {
      const from = pathname;

      if (!isSafeInternalHref(href)) {
        console.error('[Navigation] Refused unsafe or invalid destination:', href);
        return false;
      }

      if (isSamePath(href, from)) {
        return false;
      }

      if (!force) {
        const guardResult = await checkGuards(href, from);

        if (guardResult.blocked) {
          blurActiveElement();
          openGuardConfirmation({ href, from, message: guardResult.message });
          return false;
        }
      }

      blurActiveElement();
      startLoading({ showOverlay: false });
      emitNavigationEvent(NAV_EVENTS.NAVIGATE_START, { from, to: href });
      router.push(href);
      emitNavigationEvent(NAV_EVENTS.NAVIGATE, { from, item: undefined, to: href });

      return true;
    },
    [openGuardConfirmation, pathname, router, startLoading],
  );

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    emitNavigationEvent(NAV_EVENTS.NAVIGATE_END, {
      duration: undefined,
      from: previousPathRef.current,
      to: pathname,
    });
    previousPathRef.current = pathname;
    stopLoading();
  }, [pathname, stopLoading]);

  return {
    navigate,
    pathname,
    cancelNavigation,
  };
}

function isNotFoundItem(item) {
  return item?.isNotFound || item?.path === 'not-found' || item?.type === 'NOT_FOUND';
}

function flattenNavigationItems(items) {
  return items.map((item) => ({
    ...item,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isExpanded: false,
    isParent: false,
  }));
}

function filterNavigationItems(items, searchQuery) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    return (
      toSearchableText(item.name).toLowerCase().includes(normalizedQuery) ||
      toSearchableText(item.title).toLowerCase().includes(normalizedQuery) ||
      toSearchableText(item.description).toLowerCase().includes(normalizedQuery)
    );
  });
}

function buildNavigationItems({ rawItems, expanded, searchQuery, isNotFoundPage }) {
  const baseItems = isNotFoundPage
    ? rawItems.filter((item) => item.path === '/' || isNotFoundItem(item))
    : rawItems;

  const flattenedItems = flattenNavigationItems(baseItems);

  if (expanded && searchQuery) {
    return filterNavigationItems(flattenedItems, searchQuery);
  }

  return flattenedItems;
}

function findNavigationItemIndex(navigationItems, activeItem, pathname) {
  const normalizedPathname = normalizePath(pathname);
  const selectedDataSourceIndex = navigationItems.findIndex(
    (item) => item.isDataSource && item.isSelected,
  );

  if (selectedDataSourceIndex !== -1) {
    return selectedDataSourceIndex;
  }

  if (activeItem) {
    const matchedActiveIndex = navigationItems.findIndex(
      (item) =>
        (item.path && isSamePath(item.path, activeItem.path)) ||
        (item.name && item.name === activeItem.name),
    );

    if (matchedActiveIndex !== -1) {
      return matchedActiveIndex;
    }
  }

  const matchedIndex = navigationItems.findIndex((item) =>
    isSamePath(item.path, normalizedPathname),
  );
  return matchedIndex;
}

function resolveActiveIndex({ navigationItems, activeItem, pathname }) {
  return Math.max(0, findNavigationItemIndex(navigationItems, activeItem, pathname));
}

function resolveBaseActiveItem({ rawItems, navigationItems, pathname, isNotFoundPage }) {
  const normalizedPathname = normalizePath(pathname);
  const selectedDataSource = navigationItems.find((item) => item.isDataSource && item.isSelected);

  if (selectedDataSource) {
    return selectedDataSource;
  }

  if (isNotFoundPage) {
    return rawItems.find((item) => isNotFoundItem(item)) || rawItems[0] || null;
  }

  const matchedNavigationItem = navigationItems.find((item) =>
    isSamePath(item.path, normalizedPathname),
  );

  if (matchedNavigationItem) {
    return matchedNavigationItem;
  }

  const matchedRawItem = rawItems.find((item) => isSamePath(item.path, normalizedPathname));

  if (matchedRawItem) {
    return matchedRawItem;
  }

  let prefixMatchedRawItem = null;
  let longestPrefixLength = -1;
  for (const item of rawItems) {
    const candidatePath = normalizePath(item?.path);
    if (
      candidatePath.length > longestPrefixLength &&
      isPathPrefix(candidatePath, normalizedPathname)
    ) {
      prefixMatchedRawItem = item;
      longestPrefixLength = candidatePath.length;
    }
  }

  if (prefixMatchedRawItem) {
    return (
      navigationItems.find(
        (entry) =>
          isSamePath(entry?.path, prefixMatchedRawItem.path) ||
          (entry?.name && entry.name === prefixMatchedRawItem.name),
      ) || prefixMatchedRawItem
    );
  }

  return rawItems[0] || null;
}

function applySurface(
  item,
  rawSurfaceEntry,
  {
    closeSurface,
    closeAllSurfaces,
    goBackSurface,
    pushStep,
    popStep,
    goToStep,
    handleSurfaceAnimationComplete,
    surfaceStack = [],
  } = {},
) {
  const surfaceEntry = resolveActiveStepDefinition(rawSurfaceEntry);
  const surfaceComponent = surfaceEntry?.component ?? null;
  const surfaceContent = surfaceEntry?.content ?? null;

  if (!item || (!surfaceComponent && surfaceContent == null)) {
    return item;
  }

  const surfaceId = surfaceEntry.id ?? null;
  const canGoBack = Boolean(surfaceEntry.canGoBack) || surfaceStack.length > 1;
  const onBack = canGoBack ? goBackSurface : null;

  return {
    ...item,
    isSurface: true,
    isOverlay: true,
    surfaceId,
    dismissible: surfaceEntry.dismissible !== false,
    allowSwipeDismiss: surfaceEntry.allowSwipeDismiss !== false,
    surfaceComponent,
    surfaceContent,
    surfaceProps: surfaceEntry.props || {},
    closeSurface:
      typeof closeSurface === 'function'
        ? closeSurface
        : (result = null) => {
            surfaceEntry?.onClose?.(result);
          },
    closeAllSurfaces: typeof closeAllSurfaces === 'function' ? closeAllSurfaces : null,
    pushStep: typeof pushStep === 'function' ? (step) => pushStep(step, surfaceId) : null,
    popStep: typeof popStep === 'function' ? () => popStep(surfaceId) : null,
    goToStep: typeof goToStep === 'function' ? (index) => goToStep(index, surfaceId) : null,
    canGoBack,
    onBack,
    onAnimationComplete: handleSurfaceAnimationComplete,
    stepIndex: surfaceEntry.stepIndex ?? 0,
    totalSteps: surfaceEntry.totalSteps ?? 1,
    isFirstStep: surfaceEntry.isFirstStep ?? true,
    isLastStep: surfaceEntry.isLastStep ?? true,
    badge: surfaceEntry.badge ?? null,
    actions: null,
    action: resolveSurfaceAction(item, surfaceEntry),
    surfaceIcon: surfaceEntry.icon ?? null,
    surfaceTitle: surfaceEntry.title ?? null,
    surfaceDescription: surfaceEntry.description ?? null,
    surfaceDescriptionMaxLines: surfaceEntry.descriptionMaxLines ?? 2,
    surfaceTrailing: surfaceEntry.trailing ?? null,
    surfaceHeaderAction: surfaceEntry.headerAction ?? null,
    surfaceCloseLabel: surfaceEntry.closeLabel ?? null,
    expandHorizontal: surfaceEntry.expandHorizontal ?? false,
    width: surfaceEntry.width ?? null,
  };
}

function resolveActionNode(action, mediaAction, showMediaAction) {
  const MediaAction = mediaAction;

  if (React.isValidElement(action)) {
    return (
      <div className="flex flex-col gap-2.5">
        {action}
        {showMediaAction && <MediaAction />}
      </div>
    );
  }

  if (typeof action === 'function') {
    const ActionComponent = action;

    return (
      <div className="flex flex-col gap-2.5">
        <ActionComponent />
        {showMediaAction && <MediaAction />}
      </div>
    );
  }

  return showMediaAction ? <MediaAction /> : null;
}

function applyMediaAction(item, isVideo, toggleBackgroundVideo, mediaAction) {
  if (!item || !isVideo) {
    return item;
  }

  const showMediaAction = Boolean(mediaAction) && item.mediaAction !== false;

  return {
    ...item,
    action: resolveActionNode(item.action, mediaAction, showMediaAction),
    onClick: (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      toggleBackgroundVideo();
    },
  };
}

function resolveActiveItem({
  rawItems,
  navigationItems,
  pathname,
  isNotFoundPage,
  surfaceState,
  statusState,
  isVideo,
  toggleBackgroundVideo,
  mediaAction,
  surfaceActions,
  isPageLoading,
  attention,
}) {
  const baseActiveItem = resolveBaseActiveItem({
    rawItems,
    navigationItems,
    pathname,
    isNotFoundPage,
  });

  if (!baseActiveItem) {
    return null;
  }

  if (attention?.kind === NAV_ATTENTION_KIND.SURFACE) {
    return applySurface(baseActiveItem, surfaceState.activeSurfaceEntry, {
      ...surfaceActions,
      closeSurface: (result) => surfaceActions.closeSurface(result, surfaceState.activeSurfaceId),
    });
  }

  if (attention?.kind === NAV_ATTENTION_KIND.STATUS && statusState?.isOverlay) {
    return applyStatusOverlay(baseActiveItem, statusState);
  }

  if (attention?.kind === NAV_ATTENTION_KIND.HUD) {
    return baseActiveItem;
  }

  if (attention?.kind === NAV_ATTENTION_KIND.LOADING && isPageLoading) {
    return {
      ...baseActiveItem,
      isLoading: true,
    };
  }

  if (attention?.kind === NAV_ATTENTION_KIND.STATUS && statusState) {
    return applyStatusOverlay(baseActiveItem, statusState);
  }

  const itemWithMediaAction = applyMediaAction(
    baseActiveItem,
    isVideo,
    toggleBackgroundVideo,
    mediaAction,
  );

  const inlineSurface = createInlineSurfaceEntry(itemWithMediaAction?.surface);

  if (inlineSurface) {
    return applySurface(itemWithMediaAction, inlineSurface, surfaceActions);
  }

  return itemWithMediaAction;
}

function useNavigationDisplay() {
  const pathname = usePathname();
  const loadingState = useLoadingState();
  const isPageLoading = Boolean(loadingState?.isLoading);

  const { rawItems } = useNavigationItems();
  const {
    closeAllSurfaces,
    goBackSurface,
    closeSurface,
    pushStep,
    popStep,
    goToStep,
    handleSurfaceAnimationComplete,
  } = useNavigationActions();
  const {
    expanded,
    searchQuery,
    activeSurfaceId,
    activeSurfaceEntry,
    hud,
    isSurfaceOpen,
    surfaceStack,
  } = useNavigationState();
  const surfaceState = useMemo(
    () => ({
      activeSurfaceId,
      activeSurfaceEntry,
      isSurfaceOpen,
      surfaceStack,
    }),
    [activeSurfaceId, activeSurfaceEntry, isSurfaceOpen, surfaceStack],
  );
  const statusState = useNavigationStatus();
  const { mediaAction } = useNavRuntimeRegistry();
  const { isVideo } = useBackgroundState();
  const { toggleVideo: toggleBackgroundVideo } = useBackgroundActions();

  const attention = useMemo(
    () =>
      resolveNavigationAttention({
        hud,
        isPageLoading,
        status: statusState,
        surface: surfaceState,
      }),
    [hud, isPageLoading, statusState, surfaceState],
  );

  const isNotFoundPage = useMemo(() => {
    return rawItems.some((item) => isNotFoundItem(item));
  }, [rawItems]);

  const navigationItems = useMemo(() => {
    return buildNavigationItems({
      rawItems,
      expanded,
      searchQuery,
      isNotFoundPage,
    });
  }, [rawItems, expanded, searchQuery, isNotFoundPage]);

  const rawActiveItem = useMemo(() => {
    return resolveActiveItem({
      rawItems,
      navigationItems,
      pathname,
      isNotFoundPage,
      surfaceState,
      statusState,
      isVideo,
      toggleBackgroundVideo,
      mediaAction,
      surfaceActions: {
        closeSurface,
        closeAllSurfaces,
        goBackSurface,
        pushStep,
        popStep,
        goToStep,
        handleSurfaceAnimationComplete,
        surfaceStack,
      },
      isPageLoading,
      attention,
    });
  }, [
    rawItems,
    navigationItems,
    pathname,
    isNotFoundPage,
    surfaceState,
    statusState,
    isVideo,
    toggleBackgroundVideo,
    mediaAction,
    closeSurface,
    closeAllSurfaces,
    goBackSurface,
    pushStep,
    popStep,
    goToStep,
    handleSurfaceAnimationComplete,
    surfaceStack,
    isPageLoading,
    attention,
  ]);

  const activeItem = rawActiveItem;

  const activeIndex = useMemo(() => {
    return resolveActiveIndex({
      navigationItems,
      activeItem,
      pathname,
    });
  }, [navigationItems, activeItem, pathname]);

  return useMemo(
    () => ({ navigationItems, activeItem, activeIndex, statusState, attention }),
    [navigationItems, activeItem, activeIndex, statusState, attention],
  );
}

function stripChildrenSystemFields(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }

  return {
    ...item,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isChild: false,
    isExpanded: false,
    isParent: false,
    parentName: null,
    parentPath: null,
  };
}

function useNavigationItems() {
  const { getAll } = useNavRegistry();

  const rawItems = useMemo(() => {
    return Object.values(getAll()).map(stripChildrenSystemFields);
  }, [getAll]);

  return { rawItems };
}

function isAncestorPath(candidatePath, activePath) {
  if (!candidatePath || candidatePath === '/' || candidatePath === activePath) {
    return false;
  }

  if (candidatePath === '/account') {
    const segments = String(activePath || '')
      .split('/')
      .filter(Boolean);
    const targetSegment = segments[1];
    if (targetSegment && !isReservedAccountSegment(targetSegment)) {
      return false;
    }
  }

  return isPathPrefix(candidatePath, activePath);
}

function removeAncestorDuplicates(items = []) {
  if (!Array.isArray(items) || items.length <= 1) {
    return items;
  }

  const activePath = items[0]?.path;

  if (!activePath) {
    return items;
  }

  return items.filter((item, index) => {
    if (index === 0) {
      return true;
    }

    return !isAncestorPath(item?.path, activePath);
  });
}

function replaceActiveItem(items, activeIndex, activeItem) {
  if (activeIndex === -1 || !activeItem) {
    return items;
  }

  const nextItems = [...items];
  nextItems[activeIndex] = activeItem;
  return nextItems;
}

function removeInactiveLoadingItems(items = [], activeItem = null) {
  if (!Array.isArray(items) || items.length === 0) {
    return items;
  }

  return items.filter((item) => {
    if (!item?.isLoading) {
      return true;
    }

    return isSameItem(item, activeItem);
  });
}

function reorderItemsWithActiveFirst(items, activeIndex) {
  if (activeIndex === -1) {
    return items;
  }

  const active = items[activeIndex];
  const rest = [...items.slice(0, activeIndex), ...items.slice(activeIndex + 1)];

  rest.sort((a, b) => {
    if (a.path === '/') return 1;
    if (b.path === '/') return -1;
    return 0;
  });

  return [active, ...rest];
}

function useNavigationLayout({ navigationItems, activeItem } = {}) {
  const pathname = usePathname();

  const { displayItems, displayActiveIndex } = useMemo(() => {
    const activeIndex = findNavigationItemIndex(navigationItems, activeItem, pathname);

    const itemsWithActiveItem = replaceActiveItem(navigationItems, activeIndex, activeItem);

    if (activeItem?.isLoading) {
      return {
        displayItems: activeItem ? [activeItem] : [],
        displayActiveIndex: activeItem ? 0 : -1,
      };
    }

    const reorderedItems = reorderItemsWithActiveFirst(itemsWithActiveItem, activeIndex);

    const filteredItems = removeInactiveLoadingItems(reorderedItems, activeItem);

    const deduplicatedItems = removeAncestorDuplicates(filteredItems);

    const activeIndexForDisplay = deduplicatedItems.findIndex((item) =>
      isSameItem(item, activeItem),
    );

    return {
      displayItems: deduplicatedItems,
      displayActiveIndex:
        activeIndexForDisplay !== -1 ? activeIndexForDisplay : reorderedItems.length > 0 ? 0 : -1,
    };
  }, [pathname, navigationItems, activeItem]);

  return {
    displayItems,
    activeIndex: displayActiveIndex,
    MAX_VISIBLE_STACKED_CARDS,
  };
}

function useNavigationRouteReset(pathname, onRouteChange) {
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    if (previousPathRef.current === pathname) return;

    previousPathRef.current = pathname;
    onRouteChange?.(pathname);
  }, [onRouteChange, pathname]);
}

// ── Navigation provider and public hooks ──────────────────────────────────────

const NavigationActionsContext = createContext(null);
const NavigationStateContext = createContext(null);

/** Applies one compact-lock ownership change without mutating the current map. */
function updateCompactLocks(compactLocks, lockId, isLocked) {
  if (!lockId) return compactLocks;
  const hasLock = Boolean(compactLocks[lockId]);
  if (isLocked) return hasLock ? compactLocks : { ...compactLocks, [lockId]: true };
  if (!hasLock) return compactLocks;
  const nextLocks = { ...compactLocks };
  delete nextLocks[lockId];
  return nextLocks;
}

/** Returns whether one or more navigation features prevent compact mode. */
function hasCompactLocks(compactLocks) {
  return Object.keys(compactLocks).length > 0;
}

/** Adds or replaces one context action using its stable caller-provided key. */
function upsertContextAction(contextActions, action) {
  if (!action?.key) return contextActions;
  return { ...contextActions, [action.key]: action };
}

/** Removes one context action without allocating when it does not exist. */
function removeContextAction(contextActions, key) {
  if (!key || !contextActions[key]) return contextActions;
  const nextActions = { ...contextActions };
  delete nextActions[key];
  return nextActions;
}

/** Creates a keyed context-action registry from public array or singleton input. */
function createContextActionRegistry(actions) {
  if (!actions) return {};
  return toArray(actions).reduce((registry, action, index) => {
    const key = action?.key || `context-action-${index}`;
    return { ...registry, [key]: { key, ...action } };
  }, {});
}

/** Materializes the ordered context-action collection consumed by navigation UI. */
function getContextActions(contextActions) {
  return Object.values(contextActions);
}

/**
 * Provides navigation state, actions, surfaces, HUDs, and breadcrumbs.
 * @param {object} props - Component properties
 * @returns {React.ReactElement|null} Rendered navigation UI
 */
export function NavigationProvider({ children }) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [compactLocks, setCompactLocks] = useState({});
  const [navigationMachine, dispatchNavigation] = useReducer(
    navigationStateReducer,
    undefined,
    createNavigationMachineState,
  );
  const [navHeight, setNavHeight] = useState(0);
  const [contextActionsMap, setContextActionsMap] = useState({});
  const [selectionModeState, setSelectionModeState] = useState(null);
  const [hudEntries, setHudEntries] = useState({});

  const setExpanded = useCallback((nextValue) => {
    dispatchNavigation({
      type: NAVIGATION_EVENTS.SET_EXPANDED,
      value: nextValue,
    });
  }, []);
  const collapse = useCallback(() => dispatchNavigation({ type: NAVIGATION_EVENTS.COLLAPSE }), []);
  const expand = useCallback(() => dispatchNavigation({ type: NAVIGATION_EVENTS.EXPAND }), []);
  const toggle = useCallback(() => {
    dispatchNavigation({ type: NAVIGATION_EVENTS.TOGGLE });
  }, []);
  const setIsCompact = useCallback((value) => {
    dispatchNavigation({ type: NAVIGATION_EVENTS.SET_COMPACT, value });
  }, []);

  const setCompactLock = useCallback((lockId, isLocked) => {
    if (!lockId) return;

    setCompactLocks((previousLocks) => {
      return updateCompactLocks(previousLocks, lockId, isLocked);
    });
  }, []);

  const registerContextAction = useCallback((action) => {
    if (!action) return;
    const key = action.key || `context-action-${Date.now()}`;
    setContextActionsMap((currentActions) =>
      upsertContextAction(currentActions, { key, ...action }),
    );
  }, []);

  const unregisterContextAction = useCallback((key) => {
    if (!key) return;
    setContextActionsMap((currentActions) => removeContextAction(currentActions, key));
  }, []);

  const setContextActions = useCallback((actions) => {
    if (!actions) {
      setContextActionsMap({});
      return;
    }
    setContextActionsMap(createContextActionRegistry(actions));
  }, []);

  const clearContextActions = useCallback(() => {
    setContextActionsMap({});
  }, []);

  const setHud = useCallback((descriptor) => {
    const definition = createHudDefinition(descriptor);
    setHudEntries((previousEntries) => {
      if (!definition) return previousEntries;
      return upsertHudEntry(previousEntries, definition);
    });
  }, []);

  const clearHud = useCallback((targetId) => {
    setHudEntries((previousEntries) => {
      return removeHudEntries(previousEntries, targetId);
    });
  }, []);

  const setSelectionMode = useCallback((config) => {
    setSelectionModeState((currentSelection) => {
      const nextSelection = createSelectionModeState(config);
      return areSelectionModeStatesEqual(currentSelection, nextSelection)
        ? currentSelection
        : nextSelection;
    });
  }, []);

  const clearSelectionMode = useCallback(() => {
    setSelectionModeState((currentSelection) =>
      currentSelection === null ? currentSelection : null,
    );
  }, []);

  const {
    closeAllSurfaces,
    closeSurface,
    goBackSurface,
    goToStep,
    handleSurfaceAnimationComplete,
    openSurface,
    popStep,
    pushStep,
    surfaceState,
  } = useSurfaceStack({
    setCompactLock,
    setExpanded,
    setSearchQuery,
  });

  const handleRouteChange = useCallback(() => {
    closeAllSurfaces({
      success: false,
      cancelled: true,
      reason: 'navigation',
    });
    setContextActionsMap({});
    setSelectionModeState(null);
    setHudEntries({});
  }, [closeAllSurfaces]);

  useNavigationRouteReset(pathname, handleRouteChange);

  const compactLocked = hasCompactLocks(compactLocks);
  const contextActions = useMemo(() => getContextActions(contextActionsMap), [contextActionsMap]);

  const activeHud = useMemo(
    () => getActiveNavigationHud(hudEntries, selectionModeState),
    [hudEntries, selectionModeState],
  );
  const activeSelectionMode = selectionModeState;
  const isHudActive = Boolean(activeHud?.isActive);

  const stateValue = useMemo(
    () => ({
      ...surfaceState,
      contextActions,
      hud: activeHud,
      hudEntries: Object.values(hudEntries),
      isHudActive,
      selectionMode: activeSelectionMode,
      searchQuery,
      compactLocked,
      navHeight,
      expanded: navigationMachine.expanded,
      isCompact: navigationMachine.isCompact,
    }),
    [
      surfaceState,
      contextActions,
      activeHud,
      hudEntries,
      isHudActive,
      activeSelectionMode,
      searchQuery,
      compactLocked,
      navHeight,
      navigationMachine.expanded,
      navigationMachine.isCompact,
    ],
  );

  const actionsValue = useMemo(
    () => ({
      clearContextActions,
      clearHud,
      clearSelectionMode,
      closeAllSurfaces,
      closeSurface,
      goBackSurface,
      goToStep,
      handleSurfaceAnimationComplete,
      openSurface,
      popStep,
      pushStep,
      registerContextAction,
      setCompactLock,
      setContextActions,
      setExpanded,
      setHud,
      setIsCompact,
      setNavHeight,
      setSearchQuery,
      setSelectionMode,
      unregisterContextAction,
      collapse,
      expand,
      toggle,
    }),
    [
      clearContextActions,
      clearHud,
      clearSelectionMode,
      closeAllSurfaces,
      closeSurface,
      goBackSurface,
      goToStep,
      handleSurfaceAnimationComplete,
      openSurface,
      popStep,
      pushStep,
      registerContextAction,
      setCompactLock,
      setContextActions,
      setExpanded,
      setHud,
      setIsCompact,
      setNavHeight,
      setSearchQuery,
      setSelectionMode,
      unregisterContextAction,
      collapse,
      expand,
      toggle,
    ],
  );

  return createElement(
    NavigationActionsContext.Provider,
    { value: actionsValue },
    createElement(
      NavigationStateContext.Provider,
      { value: stateValue },
      createElement(BreadcrumbProvider, null, children),
    ),
  );
}

/**
 * Returns navigation render state from the nearest provider.
 * @returns {object} Navigation state
 */
export function useNavigationState() {
  return useRequiredContext(NavigationStateContext, 'useNavigationState', 'NavigationProvider');
}

/**
 * Returns navigation mutation actions from the nearest provider.
 * @returns {object} Navigation actions
 */
export function useNavigationActions() {
  return useRequiredContext(NavigationActionsContext, 'useNavigationActions', 'NavigationProvider');
}

/**
 * Returns the combined navigation state and action facade.
 * @returns {object} Combined navigation context
 */
export function useNavigationContext() {
  const actions = useNavigationActions();
  const state = useNavigationState();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}

/**
 * Registers route-scoped toolbar actions for a component lifetime.
 * @param {object|Array<object>|null} actions - Contextual toolbar actions
 * @returns {void}
 */
export function useNavContextActions(actions) {
  const { registerContextAction, unregisterContextAction } = useNavigationActions();
  const registeredKeysRef = useRef(new Set());

  useEffect(() => {
    const currentKeys = new Set();

    toArray(actions).forEach((action, index) => {
      if (!action) return;
      const key = action.key || `ctx-action-${index}`;
      currentKeys.add(key);
      registerContextAction({
        key,
        ...action,
      });
    });

    registeredKeysRef.current.forEach((prevKey) => {
      if (!currentKeys.has(prevKey)) {
        unregisterContextAction(prevKey);
      }
    });

    registeredKeysRef.current = currentKeys;
  }, [actions, registerContextAction, unregisterContextAction]);

  useEffect(() => {
    return () => {
      registeredKeysRef.current.forEach((key) => {
        unregisterContextAction(key);
      });
      registeredKeysRef.current.clear();
    };
  }, [unregisterContextAction]);
}

/**
 * Returns the current navigation height and a matching padding style.
 * @returns {{navHeight: number, padding: object}} Height and padding values
 */
export function useNavHeight() {
  const { navHeight } = useNavigationState();
  return { navHeight, padding: { paddingBottom: `${navHeight}px` } };
}

/**
 * Registers a HUD descriptor for a component lifetime.
 * @param {object|null} descriptor - HUD definition to register
 * @returns {void}
 */
export function useNavHud(descriptor) {
  const { setHud, clearHud } = useNavigationActions();
  return useNavHudLifecycle({ clearHud, descriptor, setHud });
}

/**
 * Returns the composed navigation display, interaction, and routing facade.
 * @returns {object} Navigation facade
 */
export function useNavigation() {
  const {
    closeSurface,
    setCompactLock,
    setExpanded: setExpandedState,
    setIsCompact,
    setNavHeight,
    setSearchQuery,
  } = useNavigationActions();
  const { compactLocked, expanded: isExpanded, searchQuery } = useNavigationState();

  const [isHovered, setIsHovered] = useState(false);

  const core = useNavigationCore();
  const display = useNavigationDisplay();
  const { navigate: navigateWithGuards, pathname, cancelNavigation } = core;

  const { navigationItems, activeItem, statusState, attention } = display;
  const { isPlaying: isVideoPlaying } = useBackgroundState();
  const isHudModeActive = attention?.kind === NAV_ATTENTION_KIND.HUD;
  const isSurfaceActive = Boolean(activeItem?.isSurface);

  const activeItemHasAction = Boolean(activeItem?.action);

  const compact = useNavigationCompact({
    activeItem,
    expanded: isExpanded,
    isHudActive: isHudModeActive,
    pathname,
    searchQuery,
    compactLocked,
    isVideoPlaying,
  });

  useEffect(() => {
    setIsCompact(compact);
  }, [compact, setIsCompact]);

  const clearHoverState = useCallback(() => {
    setIsHovered(false);
  }, []);

  const setExpanded = useCallback(
    (nextValue) => {
      setExpandedState((previousValue) => {
        const resolvedValue =
          typeof nextValue === 'function' ? nextValue(previousValue) : nextValue;

        if (isSurfaceActive && resolvedValue) {
          return previousValue;
        }

        return resolvedValue;
      });
    },
    [isSurfaceActive, setExpandedState],
  );

  const wasSurfaceActiveRef = useRef(false);

  useEffect(() => {
    if (isSurfaceActive) {
      wasSurfaceActiveRef.current = true;
      return;
    }

    if (wasSurfaceActiveRef.current) {
      wasSurfaceActiveRef.current = false;
      clearHoverState();
    }
  }, [clearHoverState, isSurfaceActive]);

  useEffect(() => {
    if (!isSurfaceActive || !isExpanded) {
      return;
    }

    setExpandedState(false);
  }, [isExpanded, isSurfaceActive, setExpandedState]);

  const navigate = useCallback(
    async (href, options) => {
      if (!href) {
        return false;
      }

      const didNavigate = await navigateWithGuards(href, options);

      if (!didNavigate) {
        return didNavigate;
      }

      setExpanded(false);
      setSearchQuery('');
      clearHoverState();

      return didNavigate;
    },
    [clearHoverState, navigateWithGuards, setExpanded, setSearchQuery],
  );

  const { displayItems, activeIndex: layoutActiveIndex } = useNavigationLayout({
    navigationItems,
    activeItem,
  });

  useNavigationRouteReset(pathname, () => {
    setExpanded(false);
    setSearchQuery('');
    setIsHovered(false);
  });

  return {
    navigationItems: displayItems,
    activeItem,
    activeIndex: layoutActiveIndex,
    statusState,
    attention,

    navigate,
    pathname,
    cancelNavigation,
    closeSurface,

    expanded: isExpanded,
    setExpanded,
    setNavHeight,
    setSearchQuery,
    setCompactLock,

    isHovered,
    setIsHovered,
    searchQuery,
    activeItemHasAction,
    compactLocked,
    compact,
    isHudActive: isHudModeActive,
  };
}

// ── Card rendering ─────────────────────────────────────────────────────────────

function useNavBadge(navKey, initialBadge) {
  const [badge, setBadge] = useState({
    visible: Boolean(initialBadge),
    value: initialBadge,
    color: 'bg-white/5',
  });

  useEffect(() => {
    const unsubscribe = subscribeToNavigationEvent(NAV_EVENTS.UPDATE_BADGE, (data) => {
      if (data.key === navKey) {
        setBadge({
          visible: data.value !== undefined && data.value !== null && data.value !== '',
          color: data.color,
          value: data.value,
        });
      }
    });
    return () => unsubscribe();
  }, [navKey]);

  return badge;
}

function resolveInlineActionNode(action) {
  if (React.isValidElement(action)) return action;

  if (typeof action === 'function') {
    const ActionComponent = action;
    return <ActionComponent />;
  }

  return null;
}

function useActionComponent(link, pathname, { isTop = false } = {}) {
  const { action, isLoading, isOverlay, path } = link;
  const { isVideo } = useBackgroundState();

  return useMemo(() => {
    if (isLoading || isOverlay || link.isSurface) {
      return null;
    }

    if (isTop && isVideo) {
      return <NavMediaControls />;
    }

    if (!shouldRenderInlineAction({ action, isLoading, isOverlay, path }, pathname)) {
      return null;
    }

    return resolveInlineActionNode(action);
  }, [action, isLoading, isOverlay, isTop, isVideo, link.isSurface, path, pathname]);
}

function Badge({ badge }) {
  return (
    <AnimatePresence mode="wait">
      {badge?.visible ? (
        <motion.div
          key={badge.value}
          variants={navBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={NAV_BADGE_TRANSITION}
          className="absolute -right-1 -bottom-1 z-20 flex size-6 items-center justify-center overflow-hidden rounded-full bg-black text-xs font-semibold text-white ring ring-black"
        >
          {badge.value}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function LoadingItemContent() {
  return (
    <div className="flex h-auto w-full items-center gap-2.5">
      <div className="skeleton-block size-12 shrink-0 animate-pulse rounded-[20px]" />
      <div className="flex flex-1 flex-col justify-center space-y-2">
        <div className="skeleton-block h-4 w-52 animate-pulse rounded-full" />
        <div className="skeleton-block-soft h-3 w-80 animate-pulse rounded-full" />
      </div>
    </div>
  );
}

function SurfaceItemContent({ link }) {
  const SurfaceComponent = link.surfaceComponent;
  const surfaceContent = link.surfaceContent;
  const icon = link.surfaceIcon ?? link.icon ?? null;
  const title = link.surfaceTitle ?? link.title ?? link.name ?? '';
  const description = link.surfaceDescription ?? link.description ?? '';
  const trailing = link.surfaceTrailing ?? link.trailing ?? null;
  const headerAction = link.surfaceHeaderAction ?? null;
  const closeLabel = link.surfaceCloseLabel ?? link.closeLabel ?? 'Close surface';
  const onClose =
    link.dismissible === false ? null : link.closeAllSurfaces || link.closeSurface || link.onClose;
  const onBack = link.onBack || (link.canGoBack ? link.popStep || link.closeSurface : null);

  return (
    <div className="relative w-full overflow-visible" onClick={(event) => event.stopPropagation()}>
      <div className="w-full">
        <NavSurfaceShell
          icon={icon}
          title={title}
          description={description}
          trailing={trailing}
          headerAction={headerAction}
          onClose={onClose}
          onBack={onBack}
          stepIndex={link.stepIndex ?? 0}
          totalSteps={link.totalSteps ?? 1}
          badge={link.badge ?? null}
          allowSwipeDismiss={link.allowSwipeDismiss !== false}
          closeLabel={closeLabel}
          descriptionMaxLines={link.surfaceDescriptionMaxLines ?? 2}
          onAnimationComplete={link.onAnimationComplete}
          contentClassName="w-full"
        >
          {isValidComponentType(SurfaceComponent) ? (
            <SurfaceComponent
              close={link.closeSurface}
              closeAll={link.closeAllSurfaces}
              pushStep={link.pushStep}
              popStep={link.popStep}
              goToStep={link.goToStep}
              stepIndex={link.stepIndex ?? 0}
              totalSteps={link.totalSteps ?? 1}
              isFirstStep={link.isFirstStep ?? true}
              isLastStep={link.isLastStep ?? true}
              {...link.surfaceProps}
            />
          ) : (
            surfaceContent
          )}
        </NavSurfaceShell>
      </div>
    </div>
  );
}

function StandardItemContent({
  link,
  isTop,
  itemStyle,
  badge,
  isActive,
  footerNode,
  isHudActive = false,
}) {
  const { isVideo, isPlaying } = useBackgroundState();
  const { toggleVideo } = useBackgroundActions();
  const showVideoIcon = shouldShowVideoIcon({ isActive, isVideo });
  const description = link.description;

  const effectiveIconOverlay = showVideoIcon ? null : link.iconOverlay;
  const isIconInteractive = Boolean(link.onClick || showVideoIcon);

  const handleIconClick = (event) => {
    if (showVideoIcon) {
      event.stopPropagation();
      event.preventDefault();
      toggleVideo();
      return;
    }

    if (link.onClick) {
      event.stopPropagation();
      event.preventDefault();
      link.onClick(event);
    }
  };

  if (isTop && isHudActive) {
    return (
      <div className="relative flex w-full items-center justify-between">
        <NavHud />
      </div>
    );
  }

  return (
    <div className="relative flex h-auto w-full flex-col gap-2.5">
      <div className="relative flex w-full items-center gap-2.5">
        <div className="center relative">
          {link.icon ? (
            <NavIcon
              icon={showVideoIcon ? (isPlaying ? 'mdi:pause' : 'mdi:play') : link.icon}
              iconOverlay={effectiveIconOverlay}
              style={itemStyle.icon}
              onClick={isIconInteractive ? handleIconClick : null}
              ariaLabel={
                isIconInteractive
                  ? showVideoIcon
                    ? isPlaying
                      ? 'Pause video'
                      : 'Play video'
                    : 'Open'
                  : undefined
              }
            />
          ) : (
            <div className="h-12" />
          )}
          {!showVideoIcon && !effectiveIconOverlay && <Badge badge={badge} />}
        </div>

        <div className="relative flex w-full flex-1 items-center justify-between gap-2.5 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
            <div className="flex items-center gap-1.5">
              <NavTitle
                text={link.title || link.name}
                style={{
                  ...itemStyle.title,
                  className: cn(itemStyle.title?.className, 'text-base'),
                }}
              />
            </div>
            <NavDescription text={description} style={itemStyle.description} />
          </div>
          {isTop ? <NavActionsContainer activeItem={link} /> : null}
        </div>
      </div>

      {footerNode ? (
        <div
          key="nav-surface-footer"
          className="relative z-10 w-full overflow-visible transition-opacity duration-200 ease-in-out"
        >
          {footerNode}
        </div>
      ) : null}
    </div>
  );
}

const Item = memo(
  forwardRef(function Item(
    {
      onContentHeightChange,
      isStackHovered,
      onMouseEnter,
      onMouseLeave,
      compact,
      globalCompact,
      expanded,
      position,
      onClick,
      isTop,
      link,
      isActive,
      statusStyle = null,
      isHudActive = false,
    },
    ref,
  ) {
    const [isHovered, setIsHovered] = useState(false);

    const pathname = usePathname();
    const router = useRouter();

    const { hud } = useNavigationState();
    const { isVideo } = useBackgroundState();
    const isTopHudActive = Boolean(isTop && isHudActive);
    const showVideoScrubber = Boolean(isTop && isVideo && !link.isSurface);

    const badge = useNavBadge(link.name?.toLowerCase(), link.badge);
    const ActionComponent = useActionComponent(link, pathname, { isTop });

    const cardContentRef = useRef(null);

    const showBorder = expanded ? isHovered : isHovered || isStackHovered;
    const effectiveStyle = useMemo(() => {
      if (!statusStyle) return link.style;
      if (!link.style) return statusStyle;
      return {
        ...statusStyle,
        ...link.style,
        card: {
          ...statusStyle.card,
          ...link.style.card,
        },
        icon: {
          ...statusStyle.icon,
          ...link.style.icon,
        },
        title: {
          ...statusStyle.title,
          ...link.style.title,
        },
        description: {
          ...statusStyle.description,
          ...link.style.description,
        },
      };
    }, [link.style, statusStyle]);

    const itemStyle = useMemo(
      () => resolveNavVisualStyle(effectiveStyle, { isActive, isHovered: showBorder }),
      [effectiveStyle, isActive, showBorder],
    );

    const renderedActionNode = link.isSurface || isTopHudActive ? null : ActionComponent;
    const hasNestedInteractiveContent = Boolean(renderedActionNode || link.isSurface);
    const itemIdentity = link.path || link.name || link.type || 'standard';
    const contentKey = link.isSurface
      ? `surface:${link.surfaceId ?? 'active'}`
      : isTopHudActive
        ? `hud:${hud?.id || 'active'}`
        : `standard:${itemIdentity}`;

    useElementHeight(
      onContentHeightChange,
      cardContentRef,
      isTop,
      getRouteMeasurementKey(
        pathname,
        getItemMeasurementKey({
          link,
          expanded,
          isHovered,
          isStackHovered,
          compact,
          isHud: isTopHudActive,
        }),
      ),
    );

    const handleMouseEnter = () => {
      if (link.isOverlay) return;
      setIsHovered(true);

      if (link.path) router.prefetch(link.path);
      if (!expanded) onMouseEnter?.();
    };

    const handleMouseLeave = () => {
      if (link.isOverlay) return;
      setIsHovered(false);
      if (!expanded) onMouseLeave?.();
    };

    const handleFocus = () => {
      if (link.isOverlay) return;
      setIsHovered(true);
      onMouseEnter?.();
    };

    const handleBlur = () => {
      if (link.isOverlay) return;
      setIsHovered(false);
      onMouseLeave?.();
    };

    const handleKeyDown = (event) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      onClick?.(event);
    };

    const renderContent = () => {
      if (link.isLoading) return <LoadingItemContent />;
      return (
        <StandardItemContent
          link={link}
          isTop={isTop}
          itemStyle={itemStyle}
          badge={badge}
          isActive={isActive}
          isHudActive={isTopHudActive}
          footerNode={
            renderedActionNode ? (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key="nav-action-component"
                  variants={textCrossfadeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={NAV_FADE_TRANSITION}
                  className="flow-root overflow-visible"
                  style={{ overflow: 'visible' }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Suspense>{renderedActionNode}</Suspense>
                </motion.div>
              </AnimatePresence>
            ) : null
          }
        />
      );
    };

    const {
      className: cardClassName,
      style: cardStyle,
      motionValues,
    } = getNavItemCardProps({
      expanded,
      position,
      cardStyle: itemStyle.card,
      cardScale: itemStyle.scale,
      isAnchoredToBottom: link.isSurface,
      visibleCount: globalCompact && !isStackHovered ? 1 : 3,
    });

    const cardDelay = useMemo(
      () => getNavCardDelay({ expanded, isStackHovered, position }),
      [expanded, isStackHovered, position],
    );

    return (
      <motion.div
        ref={ref}
        className={cardClassName}
        style={cardStyle}
        initial={false}
        animate={getNavItemAnimateValues({
          motionValues,
          isStackHovered,
          position,
        })}
        transition={getNavItemTransition({
          isStackHovered,
          position,
          delay: cardDelay,
        })}
        role={hasNestedInteractiveContent ? 'group' : 'button'}
        aria-label={
          compact
            ? `${link.title || link.name || 'Navigation item'}; click again to expand navigation`
            : undefined
        }
        title={compact ? 'Click again to expand navigation' : undefined}
        tabIndex={link.isOverlay ? -1 : 0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onScroll={(event) => {
          if (event.currentTarget.scrollTop !== 0) {
            event.currentTarget.scrollTop = 0;
          }
        }}
        onClick={onClick}
      >
        {showVideoScrubber && <NavMediaScrubber />}

        <AnimatePresence>
          {compact && (
            <motion.div
              key="compact-title-overlay"
              variants={navFadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={NAV_FADE_TRANSITION}
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-[38px] items-center justify-center px-5"
            >
              <div className="min-w-0">
                <NavTitle
                  text={link.title || link.name}
                  style={{
                    ...itemStyle.title,
                    className: cn(
                      'normal-case text-center text-sm underline decoration-dotted underline-offset-2',
                      itemStyle.title?.className,
                    ),
                    textTransform: 'none',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          ref={cardContentRef}
          className="flow-root w-full"
          animate={getNavCardContentAnimateProps({
            compact,
            expanded,
            position,
          })}
          transition={NAV_FADE_TRANSITION}
          style={{
            pointerEvents: compact || (!expanded && position > 0) ? 'none' : 'auto',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {link.isSurface ? (
              <SurfaceItemContent key={contentKey} link={link} />
            ) : (
              <motion.div
                key={contentKey}
                variants={navFadeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={NAV_FADE_TRANSITION}
              >
                {renderContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }),
);

/**
 * Renders the fixed navigation card stack into the document body.
 * @returns {React.ReactElement|null} Rendered navigation UI
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
    pathname,
    navigate,
  } = useNavigation();

  const isFullscreenStateActive = useIsFullscreenStateActive();

  const { hud } = useNavigationState();

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
  const isCompactPreviewActive = compact && !expanded && isStackHovered;
  const isTopItemCompact = compact && !expanded && !isStackHovered;
  const isCompactStack = !expanded && compact && !isCompactPreviewActive;
  const activeTitle = activeItem?.title || activeItem?.name || '';

  const { breadcrumbs } = useNavBreadcrumbs();
  const hasBreadcrumbs = Boolean(breadcrumbs && breadcrumbs.length > 1);
  const isBreadcrumbsCardVisible = Boolean(expanded && !isOverlayActive && hasBreadcrumbs);

  const compactStackWidth = useMemo(
    () => estimateCompactCardWidth(activeTitle, stackWidth),
    [activeTitle, stackWidth],
  );

  const { containerHeight, handleContentHeightChange } = useNavHeightController({
    compact: isTopItemCompact,
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
        statusStyle={statusStyle}
        isHudActive={isHudActive}
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
