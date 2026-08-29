'use client';

import React, {
  Children,
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
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Wifi, WifiOff } from 'lucide-react';

import {
  DESTRUCTIVE_ACTION_TONE_CLASS,
  SEMANTIC_SURFACE_CLASSES,
  Z_INDEX,
} from '@/shared';
import { EVENT_TYPES, globalEvents } from '@/shared';
import { useClickOutside } from '@/shared';
import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';
import { isReservedAccountSegment } from '@/shared';
import { getNavActionClass } from '@/domains/shell/navigation/actions/constants';

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

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const NAV_CONFIG_FIELD_TYPES = Object.freeze({
  path: 'string',
  name: 'string',
  width: 'number',
  expandHorizontal: 'boolean',
  isLoading: 'boolean',
  isOverlay: 'boolean',
  dismissible: 'boolean',
});

const NAV_RENDERABLE_FIELDS = Object.freeze(['title', 'description']);

function isRenderableNavValue(value) {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number' || isValidElement(value)) {
    return true;
  }

  return Array.isArray(value) && value.every(isRenderableNavValue);
}

export function validateNavConfig(config) {
  const issues = [];

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { valid: false, issues: ['NAV config must be an object'] };
  }

  Object.entries(NAV_CONFIG_FIELD_TYPES).forEach(([field, expectedType]) => {
    if (config[field] === undefined || config[field] === null) return;
    if (typeof config[field] !== expectedType) {
      issues.push(`NAV.${field} must be a ${expectedType}`);
    }
  });

  NAV_RENDERABLE_FIELDS.forEach((field) => {
    if (config[field] === undefined || config[field] === null) return;
    if (!isRenderableNavValue(config[field])) {
      issues.push(`NAV.${field} must be a renderable value`);
    }
  });

  if (config.path !== undefined && !String(config.path).startsWith('/')) {
    issues.push('NAV.path must start with /');
  }
  if (config.actions !== undefined && !Array.isArray(config.actions)) {
    issues.push('NAV.actions must be an array');
  }
  if (config.style !== undefined && (!config.style || typeof config.style !== 'object')) {
    issues.push('NAV.style must be an object');
  }

  return { valid: issues.length === 0, issues };
}

const SECTION_KEYS = ['card', 'icon', 'title', 'description'];

function isObjectLike(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function formatMediaTime(seconds = 0) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toObject(value) {
  return isObjectLike(value) ? value : {};
}

function getLegacyCardStyle(style) {
  const legacyCardStyle = {};

  if (style?.background) legacyCardStyle.background = style.background;
  if (style?.borderColor) legacyCardStyle.borderColor = style.borderColor;

  return legacyCardStyle;
}

function mergeSection(baseStyle, stateStyle, hoverStyle, section) {
  return {
    ...toObject(baseStyle?.[section]),
    ...toObject(stateStyle?.[section]),
    ...toObject(hoverStyle?.[section]),
  };
}

export function resolveNavVisualStyle(style, { isActive = false, isHovered = false } = {}) {
  const baseStyle = toObject(style);
  const stateStyle = isActive ? toObject(baseStyle.active) : toObject(baseStyle.inactive);
  const hoverStyle = isHovered ? toObject(baseStyle.hover) : {};

  const sections = SECTION_KEYS.reduce(
    (acc, section) => {
      acc[section] = mergeSection(baseStyle, stateStyle, hoverStyle, section);
      return acc;
    },
    {
      card: {},
      icon: {},
      title: {},
      description: {},
    },
  );

  sections.card = {
    ...getLegacyCardStyle(baseStyle),
    ...sections.card,
  };

  return {
    ...sections,
    scale: stateStyle?.card?.scale ?? hoverStyle?.card?.scale ?? baseStyle?.scale,
  };
}

export function getNavStackClassName() {
  return 'fixed bottom-1 left-1/2 h-auto w-full -translate-x-1/2 touch-manipulation select-none';
}

export function getItemKey(link, index = 0) {
  return `nav-card-slot-${index}`;
}

export function getIsItemActive(link, activeItem) {
  return (link.path || link.name) === (activeItem?.path || activeItem?.name);
}

export function getItemPosition(index) {
  return index;
}

export function shouldSyncStackHover(pathname, compact) {
  return compact;
}

export function canPreviewStackOnTopHover(compact, expanded) {
  return !(compact && !expanded);
}

export function getActiveItemLayoutKey(activeItem) {
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
    activeItem.action ? 'action' : 'no-action',
  ].join('::');
}

export function normalizePath(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized === '/') return '/';
  return normalized.replace(/\/+$/, '');
}

export function isSamePath(left, right) {
  return normalizePath(left) === normalizePath(right);
}

export function isPathPrefix(candidatePath, pathname) {
  const normalizedCandidate = normalizePath(candidatePath);
  const normalizedPathname = normalizePath(pathname);

  if (!normalizedCandidate || !normalizedPathname) return false;
  if (normalizedCandidate === normalizedPathname) return true;
  if (normalizedCandidate === '/') return normalizedPathname.startsWith('/');
  return normalizedPathname.startsWith(`${normalizedCandidate}/`);
}

export function isInlineActionPathMatch(path, pathname) {
  return isSamePath(path, pathname) || (path !== '/' && isPathPrefix(path, pathname));
}

export function shouldRenderInlineAction({ action, isLoading, isOverlay, path }, pathname) {
  return (
    Boolean(action) && !isLoading && (isOverlay || !path || isInlineActionPathMatch(path, pathname))
  );
}

export function toSearchableText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toSearchableText).join(' ');
  if (React.isValidElement(value)) return toSearchableText(value.props?.children);
  if (value && typeof value === 'object') {
    return Object.values(value).map(toSearchableText).join(' ');
  }
  return '';
}

const NAV_EASINGS = Object.freeze({
  CINEMATIC: MOTION_EASINGS.CINEMATIC,
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const NAV_TIERS = Object.freeze({
  MICRO: {
    duration: 0.24,
    distance: 4,
    scaleDelta: 0.008,
    ease: NAV_EASINGS.EMPHASIZED,
  },

  FAST: {
    duration: 0.44,
    distance: 9,
    scaleDelta: 0.012,
    ease: NAV_EASINGS.EMPHASIZED,
  },

  STANDARD: {
    duration: 0.66,
    distance: 18,
    scaleDelta: 0.018,
    ease: NAV_EASINGS.SOFT,
  },

  SURFACE: {
    duration: 0.96,
    distance: 28,
    scaleDelta: 0.024,
    ease: NAV_EASINGS.CINEMATIC,
  },
});

const NAV_SPRINGS = Object.freeze({
  PRESS: MOTION_SPRINGS.PRESS,
  BADGE: MOTION_SPRINGS.BADGE,
  DECK: MOTION_SPRINGS.PANEL,

  PEEK: Object.freeze({
    type: 'spring',
    stiffness: 150,
    damping: 22,
    mass: 0.85,
  }),
});

const NAV_STAGGER_TIMINGS = Object.freeze({
  EXPAND: 0.068,
  COLLAPSE: 0.042,
  PEEK: 0.078,
  STANDARD: 0.06,
  FAST: 0.042,
});

export const NAV_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

export const NAV_TAP_SCALE = 0.97;

export const NAV_BUTTON_TRANSITION = NAV_SPRINGS.PRESS;

export const NAV_CARD_SPRING = NAV_SPRINGS.DECK;

export const NAV_CARD_EXPAND_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.84,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_STACK_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_CARD_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_CARD_COLLAPSE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.62,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_PEEK_SPRING = NAV_SPRINGS.PEEK;

export const NAV_SURFACE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.SURFACE.duration,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.66,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_FADE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.STANDARD.duration,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_TEXT_ENTER_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_TEXT_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.38,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_ICON_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_STAGGER_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.62,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_MICRO_TRANSITION = Object.freeze({
  type: 'tween',
  duration: NAV_TIERS.MICRO.duration,
  ease: NAV_TIERS.MICRO.ease,
});

export const NAV_BADGE_TRANSITION = NAV_SPRINGS.BADGE;

export const NAV_ACTIVE_INDICATOR_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.48,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_RESULTS_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.79,
  ease: NAV_EASINGS.CINEMATIC,
});

export const NAV_RESULTS_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.48,
  ease: NAV_EASINGS.EXIT,
});

export const NAV_RESULTS_STAGGER_DELAY = NAV_STAGGER_TIMINGS.STANDARD;

export const NAV_PEEK_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.72,
  ease: NAV_EASINGS.SOFT,
});

export const NAV_COMPACT_TO_SURFACE_DELAY_MS = 480;

export const NAV_SURFACE_EXIT_SETTLE_MS = 700;

export const NAV_SURFACE_DRAG_CONSTRAINTS = Object.freeze({
  top: 0,
  bottom: 0,
});

export const NAV_SURFACE_DRAG_ELASTIC = Object.freeze({
  top: 0.05,
  bottom: 0.5,
});

export const NAV_BREADCRUMBS_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.57,
  ease: NAV_EASINGS.EMPHASIZED,
});

export const NAV_HUD_TRANSITION = NAV_FADE_TRANSITION;

function toGpuTransform(y = 0, scale = 1) {
  const safeY = Number(y);
  const safeScale = Number(scale);

  return `translate3d(0, ${
    Number.isFinite(safeY) ? safeY : 0
  }px, 0) scale(${Number.isFinite(safeScale) ? safeScale : 1})`;
}

export const navActionVariants = Object.freeze({
  idle: {
    transform: toGpuTransform(0, 1),
  },
  hover: {
    transform: toGpuTransform(0, 1.02),
  },
  tap: {
    transform: toGpuTransform(0, NAV_TAP_SCALE),
  },
});

export const NAV_ACTION_VARIANTS = navActionVariants;

export function getNavActionMotionProps({ disabled = false, reduceMotion = false } = {}) {
  const canMove = !disabled && !reduceMotion;

  return {
    initial: false,
    animate: 'idle',
    whileHover: canMove ? 'hover' : undefined,
    whileTap: canMove ? 'tap' : undefined,
    variants: navActionVariants,
    transition: NAV_BUTTON_TRANSITION,
  };
}

function buildVariants(tierName, { distanceScale = 0, blur = 0 } = {}) {
  const tier = NAV_TIERS[tierName];
  const distance = tier.distance * distanceScale;

  const hidden = {
    opacity: 0,
    ...(blur > 0 ? { filter: `blur(${blur}px)` } : {}),
  };

  const visible = {
    opacity: 1,
    ...(blur > 0 ? { filter: 'blur(0px)' } : {}),
    transition: {
      duration: tier.duration,
      ease: tier.ease,
    },
  };

  const exit = {
    opacity: 0,
    ...(blur > 0 ? { filter: `blur(${Math.max(blur * 0.6, 3)}px)` } : {}),
    transition: {
      duration: tier.duration * 0.72,
      ease: NAV_EASINGS.EXIT,
    },
  };

  if (distance) {
    hidden.transform = toGpuTransform(distance, 1 - tier.scaleDelta);

    visible.transform = toGpuTransform(0);

    exit.transform = toGpuTransform(distance * 0.72, 1 - tier.scaleDelta * 0.6);
  }

  return Object.freeze({
    hidden,
    visible,
    exit,
  });
}

export const slideFadeVariants = buildVariants('SURFACE', {
  distanceScale: 1,
  blur: 10,
});

export const textCrossfadeVariants = buildVariants('STANDARD', {
  distanceScale: 0.42,
  blur: 5,
});

export const staggerItemVariants = buildVariants('FAST', {
  distanceScale: 0.75,
  blur: 6,
});

export const navListItemVariants = Object.freeze({
  hidden: staggerItemVariants.hidden,

  visible: (index = 0) => ({
    ...staggerItemVariants.visible,
    transition: {
      ...NAV_STAGGER_TRANSITION,
      delay: Math.min(Math.max(Number(index) || 0, 0) * NAV_STAGGER_TIMINGS.STANDARD, 0.42),
    },
  }),

  exit: {
    ...staggerItemVariants.exit,

    transition: {
      ...NAV_TEXT_EXIT_TRANSITION,
    },
  },
});

export const NAV_LIST_ITEM_VARIANTS = navListItemVariants;

export const navFadeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(12, 0.978),
    filter: 'blur(5px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(8, 0.988),
    filter: 'blur(4px)',
  },
});

export const NAV_FADE_VARIANTS = navFadeVariants;

export const navBadgeVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(0, 0.78),
    filter: 'blur(4px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(0, 0.82),
    filter: 'blur(3px)',
  },
});

export const NAV_BADGE_VARIANTS = navBadgeVariants;

export const navBackdropVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },

  visible: {
    opacity: 1,
  },

  exit: {
    opacity: 0,
  },
});

export const NAV_BACKDROP_VARIANTS = navBackdropVariants;

export const navBreadcrumbsVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(-10, 0.96),
    filter: 'blur(5px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(-6, 0.98),
    filter: 'blur(4px)',
  },
});

export const NAV_BREADCRUMBS_VARIANTS = navBreadcrumbsVariants;

export const navHudVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(10, 0.975),
    filter: 'blur(5px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(8, 0.985),
    filter: 'blur(4px)',
  },
});

export const NAV_HUD_VARIANTS = navHudVariants;

export function getNavDescriptionVariants(targetOpacity = 0.7) {
  return {
    hidden: {
      opacity: 0,
      transform: toGpuTransform(8, 0.99),
      filter: 'blur(4px)',
    },

    visible: {
      opacity: targetOpacity,
      transform: toGpuTransform(0),
      filter: 'blur(0px)',
      transition: {
        duration: 0.62,
        ease: NAV_EASINGS.EMPHASIZED,
      },
    },

    exit: {
      opacity: 0,
      transform: toGpuTransform(5, 0.99),
      filter: 'blur(3px)',
      transition: {
        duration: 0.38,
        ease: NAV_EASINGS.EXIT,
      },
    },
  };
}

export function getNavActionStaggerTransition(index = 0) {
  return {
    ...NAV_STAGGER_TRANSITION,
    delay: Math.min(Math.max(Number(index) || 0, 0) * NAV_STAGGER_DELAY, 0.42),
  };
}

export function getNavStackAnimateProps({
  width,
  height,
  isBreadcrumbsVisible = false,
  isFullscreen = false,
}) {
  return {
    width: Math.round(width),
    height: Math.round(height),

    transform: toGpuTransform(isBreadcrumbsVisible ? -48 : 0),

    opacity: isFullscreen ? 0 : 1,

    pointerEvents: isFullscreen ? 'none' : 'auto',
  };
}

export function getNavCardDelay({ expanded = false, isStackHovered = false, position = 0 } = {}) {
  const safePosition = Math.max(0, Number(position) || 0);

  if (expanded && safePosition > 0) {
    return Math.min(safePosition * NAV_STAGGER_TIMINGS.EXPAND, 0.42);
  }

  if (isStackHovered && safePosition > 0) {
    return Math.min((safePosition - 1) * NAV_STAGGER_TIMINGS.PEEK, 0.32);
  }

  return 0;
}

export function getNavItemAnimateValues({
  motionValues,
  isStackHovered = false,
  position = 0,
} = {}) {
  if (!motionValues) return {};

  const safePosition = Math.max(0, Number(position) || 0);

  const isHoveredOffset = isStackHovered && safePosition > 0;

  const peekProgress = Math.min(safePosition / 3, 1);

  const peekOffset = NAV_TIERS.MICRO.distance * (0.85 + peekProgress * 0.35);

  const peekScale = NAV_TIERS.MICRO.scaleDelta * (1 - peekProgress * 0.25);

  const y = isHoveredOffset ? motionValues.y - safePosition * peekOffset : motionValues.y;

  const scale = isHoveredOffset ? motionValues.scale * (1 + peekScale) : motionValues.scale;

  return {
    transform: toGpuTransform(y, scale),
    opacity: motionValues.opacity,
  };
}

export function getNavItemTransition({ isStackHovered = false, position = 0, delay = 0 } = {}) {
  const baseTransition = isStackHovered && position > 0 ? NAV_PEEK_TRANSITION : NAV_CARD_TRANSITION;

  return {
    ...baseTransition,
    delay,
  };
}

export function getNavCardContentAnimateProps({
  compact = false,
  expanded = false,
  position = 0,
} = {}) {
  const isHidden = compact || (!expanded && position > 0);

  return {
    opacity: isHidden ? 0 : 1,

    transform: toGpuTransform(
      isHidden ? NAV_TIERS.STANDARD.distance * 0.35 : 0,

      isHidden ? 1 - NAV_TIERS.MICRO.scaleDelta : 1,
    ),

    filter: isHidden ? 'blur(5px)' : 'blur(0px)',
  };
}

export function getNavScrollProgressStyle(progress = 0) {
  const safeProgress = Math.min(Math.max(Number(progress) || 0, 0), 1);

  return {
    width: '100%',
    transformOrigin: 'left center',
    transform: `scaleX(${safeProgress})`,
  };
}

export const navSoundwaveBarVariants = Object.freeze({
  playing: (index) => ({
    transform: [
      toGpuTransform(0, 0.3),
      toGpuTransform(0, 1),
      toGpuTransform(0, 0.42),
      toGpuTransform(0, 0.92),
      toGpuTransform(0, 0.3),
    ],

    transition: {
      duration: 1.28,
      repeat: Infinity,
      ease: NAV_EASINGS.SOFT,
      delay: Number(index) * 0.18,
    },
  }),

  paused: {
    transform: toGpuTransform(0, 0.3),

    transition: {
      duration: 0.44,
      ease: NAV_EASINGS.EXIT,
    },
  },
});

export const NAV_SOUNDWAVE_BAR_VARIANTS = navSoundwaveBarVariants;

export const navScrubberTooltipVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform(8, 0.94),
    filter: 'blur(5px)',
  },

  visible: {
    opacity: 1,
    transform: toGpuTransform(0),
    filter: 'blur(0px)',
  },

  exit: {
    opacity: 0,
    transform: toGpuTransform(6, 0.96),
    filter: 'blur(4px)',
  },
});

export const NAV_SCRUBBER_TOOLTIP_VARIANTS = navScrubberTooltipVariants;

export const NAV_SCRUBBER_TOOLTIP_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.31,
  ease: NAV_EASINGS.EMPHASIZED,
});

const MotionButtonBase = motion.create(Button);

export const NavMotionButton = forwardRef(function NavMotionButton(
  { disabled = false, style, ...props },
  ref,
) {
  const reduceMotion = useReducedMotion();

  return (
    <MotionButtonBase
      ref={ref}
      {...props}
      {...getNavActionMotionProps({ disabled, reduceMotion })}
      disabled={disabled}
      style={{
        ...style,
        transformOrigin: 'center center',
        transitionDuration: reduceMotion ? '0ms' : '150ms',
        transitionProperty: 'background-color, color, border-color, box-shadow',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    />
  );
});

NavMotionButton.displayName = 'NavMotionButton';

const createEventEmitter = (eventType) => (data) =>
  globalEvents.emit(eventType, {
    timestamp: Date.now(),
    type: eventType,
    ...data,
  });

const createEventSubscriber = (eventType) => (callback) =>
  globalEvents.subscribe(eventType, callback);

export const NAV_EVENTS = Object.freeze({
  DATA_SOURCE_SELECT: 'NAV_DATA_SOURCE_SELECT',
  NAVIGATE_START: 'NAV_NAVIGATE_START',
  NAVIGATE_END: 'NAV_NAVIGATE_END',
  UPDATE_BADGE: 'NAV_UPDATE_BADGE',
  UPDATE_ITEM: 'NAV_UPDATE_ITEM',
  ITEM_HOVER: 'NAV_ITEM_HOVER',
  ITEM_CLICK: 'NAV_ITEM_CLICK',
  ITEM_FOCUS: 'NAV_ITEM_FOCUS',
  UNREGISTER: 'NAV_UNREGISTER',
  NAVIGATE: 'NAV_NAVIGATE',
  REGISTER: 'NAV_REGISTER',
  COLLAPSE: 'NAV_COLLAPSE',
  EXPAND: 'NAV_EXPAND',
});

export const NAV_EVENT_HANDLERS = Object.freeze({
  selectDataSource: (key, value, sourceType) =>
    createEventEmitter(NAV_EVENTS.DATA_SOURCE_SELECT)({ sourceType, value, key }),
  itemHover: (item, index, isEntering) =>
    createEventEmitter(NAV_EVENTS.ITEM_HOVER)({ item, index, isEntering }),
  navigateEnd: (to, from, duration) =>
    createEventEmitter(NAV_EVENTS.NAVIGATE_END)({ to, from, duration }),
  updateBadge: (key, value, color = 'bg-primary') =>
    createEventEmitter(NAV_EVENTS.UPDATE_BADGE)({ key, value, color }),
  register: (key, item, source) => createEventEmitter(NAV_EVENTS.REGISTER)({ key, item, source }),
  navigate: (to, from, item) => createEventEmitter(NAV_EVENTS.NAVIGATE)({ to, from, item }),
  navigateStart: (to, from) => createEventEmitter(NAV_EVENTS.NAVIGATE_START)({ to, from }),
  updateItem: (key, updates) => createEventEmitter(NAV_EVENTS.UPDATE_ITEM)({ key, updates }),
  unregister: (key, source) => createEventEmitter(NAV_EVENTS.UNREGISTER)({ key, source }),
  itemFocus: (item, index) => createEventEmitter(NAV_EVENTS.ITEM_FOCUS)({ item, index }),
  itemClick: (item, index) => createEventEmitter(NAV_EVENTS.ITEM_CLICK)({ item, index }),
  collapse: createEventEmitter(NAV_EVENTS.COLLAPSE),
  expand: createEventEmitter(NAV_EVENTS.EXPAND),
  onDataSourceSelect: createEventSubscriber(NAV_EVENTS.DATA_SOURCE_SELECT),
  onNavigateStart: createEventSubscriber(NAV_EVENTS.NAVIGATE_START),
  onNavigateEnd: createEventSubscriber(NAV_EVENTS.NAVIGATE_END),
  onBadgeUpdate: createEventSubscriber(NAV_EVENTS.UPDATE_BADGE),
  onUpdateItem: createEventSubscriber(NAV_EVENTS.UPDATE_ITEM),
  onUnregister: createEventSubscriber(NAV_EVENTS.UNREGISTER),
  onItemHover: createEventSubscriber(NAV_EVENTS.ITEM_HOVER),
  onItemClick: createEventSubscriber(NAV_EVENTS.ITEM_CLICK),
  onItemFocus: createEventSubscriber(NAV_EVENTS.ITEM_FOCUS),
  onRegister: createEventSubscriber(NAV_EVENTS.REGISTER),
  onNavigate: createEventSubscriber(NAV_EVENTS.NAVIGATE),
  onCollapse: createEventSubscriber(NAV_EVENTS.COLLAPSE),
  onExpand: createEventSubscriber(NAV_EVENTS.EXPAND),
});

const guardRegistry = new Map();
let guardIdCounter = 0;

export function clearNavigationGuards() {
  guardRegistry.clear();
  guardIdCounter = 0;
}

export function getNavigationGuardCount() {
  return guardRegistry.size;
}

export function registerGuard(guard) {
  const id = ++guardIdCounter;
  guardRegistry.set(id, guard);
  return () => guardRegistry.delete(id);
}

export async function checkGuards(to, from) {
  for (const [id, guard] of guardRegistry) {
    let shouldBlock = typeof guard.when === 'function' ? guard.when(to, from) : guard.when;

    try {
      shouldBlock = await Promise.resolve(shouldBlock);
    } catch (error) {
      console.error('[Navigation Guard] Guard evaluation failed:', error);
      shouldBlock = false;
    }

    if (shouldBlock) {
      const message = guard.message || 'Are you sure you want to leave this page?';
      guard.onBlock?.({ to, from, guardId: id, message });
      return { message, blocked: true, guardId: id };
    }
  }
  return { blocked: false };
}

export function useNavigationGuard(options = {}) {
  const {
    message = 'You have unsaved changes Are you sure you want to leave',
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

export const NAV_HUD_RENDER_MODE = Object.freeze({
  COMPONENT: 'component',
  NODE: 'node',
});

export const NAV_HUD_VARIANT = Object.freeze({
  COMPACT: 'compact',
  EXPANDED: 'expanded',
  PROGRESS: 'progress',
  CUSTOM: 'custom',
});

export const NAV_HUD_PRIORITY = Object.freeze({
  DEFAULT: 0,
  CONTEXTUAL: 10,
  MEDIA: 15,
  SELECTION: 20,
  TASK_PROGRESS: 30,
  CRITICAL: 50,
});

function normalizePriority(value) {
  const priority = Number(value);
  return Number.isFinite(priority) ? priority : NAV_HUD_PRIORITY.DEFAULT;
}

function normalizeProgress(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, num));
}

function normalizeAutoDismiss(value) {
  if (value == null) return null;
  const ms = Number(value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

export function isValidComponentType(type) {
  if (typeof type === 'function') return true;
  if (
    type != null &&
    typeof type === 'object' &&
    !React.isValidElement(type) &&
    ('$$typeof' in type || 'render' in type || 'type' in type)
  ) {
    return true;
  }
  return false;
}

export function isHudDescriptor(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !React.isValidElement(value) &&
    ('component' in value ||
      'content' in value ||
      'node' in value ||
      'element' in value ||
      'isActive' in value ||
      'title' in value ||
      'actions' in value ||
      'id' in value)
  );
}

export function createHudDefinition(input, config = {}) {
  if (!input) return null;

  const descriptor = isHudDescriptor(input) ? input : null;

  const component = isValidComponentType(descriptor?.component)
    ? descriptor.component
    : isValidComponentType(input)
      ? input
      : null;

  const content = descriptor?.content ?? descriptor?.node ?? descriptor?.element ?? null;

  if (!component && content == null && !React.isValidElement(input) && !descriptor?.title && !descriptor?.actions) {
    return null;
  }

  const id =
    descriptor?.id ??
    config?.id ??
    (component ? component.displayName || component.name || 'component-hud' : 'hud');
  const isActive = descriptor?.isActive ?? config?.isActive ?? true;
  const onCancel =
    typeof descriptor?.onCancel === 'function'
      ? descriptor.onCancel
      : typeof config?.onCancel === 'function'
        ? config.onCancel
        : null;
  const props =
    component && descriptor?.props && typeof descriptor.props === 'object' ? descriptor.props : {};

  const variant =
    descriptor?.variant ??
    config?.variant ??
    (descriptor?.progress != null ? NAV_HUD_VARIANT.PROGRESS : NAV_HUD_VARIANT.COMPACT);

  return {
    id,
    renderMode: component ? NAV_HUD_RENDER_MODE.COMPONENT : NAV_HUD_RENDER_MODE.NODE,
    variant,
    component,
    content: component ? null : (content ?? input),
    props,
    isActive: Boolean(isActive),
    icon: descriptor?.icon ?? config?.icon ?? null,
    title: descriptor?.title ?? config?.title ?? null,
    description: descriptor?.description ?? config?.description ?? null,
    badge: descriptor?.badge ?? config?.badge ?? null,
    actions: Array.isArray(descriptor?.actions)
      ? descriptor.actions
      : Array.isArray(config?.actions)
        ? config.actions
        : [],
    progress: normalizeProgress(descriptor?.progress ?? config?.progress),
    isIndeterminate: Boolean(descriptor?.isIndeterminate ?? config?.isIndeterminate),
    dismissOnNavigate: descriptor?.dismissOnNavigate ?? config?.dismissOnNavigate ?? true,
    dismissOnEscape: descriptor?.dismissOnEscape ?? config?.dismissOnEscape ?? true,
    autoDismissMs: normalizeAutoDismiss(descriptor?.autoDismissMs ?? config?.autoDismissMs),
    onCancel,
    priority: normalizePriority(descriptor?.priority ?? config?.priority),
  };
}

export const NAV_ATTENTION_KIND = Object.freeze({
  HUD: 'hud',
  LOADING: 'loading',
  ROUTE: 'route',
  STATUS: 'status',
  SURFACE: 'surface',
});

export const NAV_ATTENTION_PRIORITY = Object.freeze({
  HUD: 200,
  LOADING: 100,
  ROUTE: 0,
  STATUS: 75,
  STATUS_OVERLAY: 300,
  SURFACE: 400,
});

function toFinitePriority(value) {
  const priority = Number(value);
  return Number.isFinite(priority) ? priority : 0;
}

function createCandidate(kind, source, priority) {
  return { kind, priority, source };
}

export function resolveActiveHud(hudEntries) {
  return hudEntries.reduce((activeHud, hud) => {
    if (!hud?.isActive) return activeHud;
    if (!activeHud || toFinitePriority(hud.priority) > toFinitePriority(activeHud.priority)) {
      return hud;
    }
    return activeHud;
  }, null);
}

export function resolveNavigationAttention({
  hud = null,
  isPageLoading = false,
  status = null,
  surface = null,
} = {}) {
  const candidates = [
    surface?.isSurfaceOpen
      ? createCandidate(NAV_ATTENTION_KIND.SURFACE, surface, NAV_ATTENTION_PRIORITY.SURFACE)
      : null,
    status?.isOverlay
      ? createCandidate(
          NAV_ATTENTION_KIND.STATUS,
          status,
          NAV_ATTENTION_PRIORITY.STATUS_OVERLAY + toFinitePriority(status.priority),
        )
      : null,
    hud?.isActive
      ? createCandidate(
          NAV_ATTENTION_KIND.HUD,
          hud,
          NAV_ATTENTION_PRIORITY.HUD + toFinitePriority(hud.priority),
        )
      : null,
    isPageLoading
      ? createCandidate(NAV_ATTENTION_KIND.LOADING, null, NAV_ATTENTION_PRIORITY.LOADING)
      : null,
    status
      ? createCandidate(
          NAV_ATTENTION_KIND.STATUS,
          status,
          NAV_ATTENTION_PRIORITY.STATUS + toFinitePriority(status.priority),
        )
      : null,
    createCandidate(NAV_ATTENTION_KIND.ROUTE, null, NAV_ATTENTION_PRIORITY.ROUTE),
  ].filter(Boolean);

  return candidates.reduce((activeCandidate, candidate) =>
    candidate.priority > activeCandidate.priority ? candidate : activeCandidate,
  );
}

export const NAV_SURFACE_RENDER_MODE = Object.freeze({
  COMPONENT: 'component',
  NODE: 'node',
});

export function isSurfaceDescriptor(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !React.isValidElement(value)
  );
}

export function createSurfaceEntryDefinition(input, config = {}) {
  const descriptor =
    isSurfaceDescriptor(input) &&
    (isValidComponentType(input.component) ||
      'content' in input ||
      'node' in input ||
      'element' in input ||
      (Array.isArray(input.steps) && input.steps.length > 0))
      ? input
      : null;

  const steps = descriptor?.steps ?? config?.steps ?? null;
  const firstStep = Array.isArray(steps) && steps.length > 0 ? steps[0] : null;

  const component =
    isValidComponentType(descriptor?.component)
      ? descriptor.component
      : isValidComponentType(input)
        ? input
        : isValidComponentType(firstStep?.component)
          ? firstStep.component
          : isValidComponentType(firstStep)
            ? firstStep
            : null;

  const content =
    descriptor?.content ??
    descriptor?.node ??
    descriptor?.element ??
    firstStep?.content ??
    firstStep?.node ??
    firstStep?.element ??
    null;

  if (!component && content == null && !React.isValidElement(input) && !steps) {
    return null;
  }

  return {
    renderMode: component ? NAV_SURFACE_RENDER_MODE.COMPONENT : NAV_SURFACE_RENDER_MODE.NODE,
    component,
    content: component ? null : (content ?? input),
    props: component
      ? descriptor?.props && typeof descriptor.props === 'object'
        ? descriptor.props
        : config
      : {},
    action: descriptor?.action ?? config?.action ?? null,
    showAction: descriptor?.showAction ?? config?.showAction ?? false,
    dismissible: descriptor?.dismissible ?? config?.dismissible ?? true,
    onClose: descriptor?.onClose ?? config?.onClose ?? null,
    icon:
      descriptor?.icon ?? descriptor?.header?.icon ?? config?.icon ?? config?.header?.icon ?? null,
    title:
      descriptor?.title ??
      descriptor?.header?.title ??
      config?.title ??
      config?.header?.title ??
      null,
    description:
      descriptor?.description ??
      descriptor?.header?.description ??
      config?.description ??
      config?.header?.description ??
      null,
    descriptionMaxLines:
      descriptor?.descriptionMaxLines ?? config?.descriptionMaxLines ?? 2,
    trailing: descriptor?.trailing ?? config?.trailing ?? null,
    headerAction: descriptor?.headerAction ?? config?.headerAction ?? null,
    closeLabel: descriptor?.closeLabel ?? config?.closeLabel ?? null,
    expandHorizontal: descriptor?.expandHorizontal ?? config?.expandHorizontal ?? false,
    width: descriptor?.width ?? config?.width ?? null,
    allowSwipeDismiss: descriptor?.allowSwipeDismiss ?? config?.allowSwipeDismiss ?? true,
    steps: descriptor?.steps ?? config?.steps ?? null,
    currentStepIndex: descriptor?.currentStepIndex ?? config?.currentStepIndex ?? 0,
    syncWithUrl: descriptor?.syncWithUrl ?? config?.syncWithUrl ?? false,
    urlKey: descriptor?.urlKey ?? config?.urlKey ?? null,
    badge: descriptor?.badge ?? config?.badge ?? null,
  };
}

export function createInlineSurfaceEntry(surface) {
  if (surface === undefined) return null;

  if (!isSurfaceDescriptor(surface)) {
    return {
      renderMode: NAV_SURFACE_RENDER_MODE.NODE,
      component: null,
      content: surface,
      props: {},
      action: null,
      showAction: undefined,
      dismissible: true,
      onClose: null,
      icon: null,
      title: null,
      description: null,
      trailing: null,
      headerAction: null,
      closeLabel: null,
    };
  }

  const component = typeof surface.component === 'function' ? surface.component : null;
  const content = surface.content ?? surface.node ?? surface.element ?? null;

  if (!component && content == null) return null;

  return {
    renderMode: component ? NAV_SURFACE_RENDER_MODE.COMPONENT : NAV_SURFACE_RENDER_MODE.NODE,
    component,
    content: component ? null : content,
    props: surface.props && typeof surface.props === 'object' ? surface.props : {},
    action: surface.action ?? null,
    showAction: surface.showAction,
    dismissible: surface.dismissible ?? true,
    onClose: typeof surface.onClose === 'function' ? surface.onClose : null,
    icon: surface.icon ?? null,
    title: surface.title ?? null,
    description: surface.description ?? null,
    descriptionMaxLines: surface.descriptionMaxLines ?? 2,
    trailing: surface.trailing ?? null,
    headerAction: surface.headerAction ?? null,
    closeLabel: surface.closeLabel ?? null,
    expandHorizontal: surface.expandHorizontal ?? false,
    width: surface.width ?? null,
  };
}

export function resolveSurfaceAction(item, surfaceEntry) {
  if (surfaceEntry?.action != null) return surfaceEntry.action;
  if (surfaceEntry?.showAction === true) return item.action ?? null;
  if (surfaceEntry?.showAction === false) return null;

  return item.action ?? null;
}

export function resolveActiveStepDefinition(surfaceEntry) {
  if (!surfaceEntry) return null;

  const steps = surfaceEntry.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    return surfaceEntry;
  }

  const currentIndex = Math.max(
    0,
    Math.min(surfaceEntry.currentStepIndex || 0, steps.length - 1),
  );
  const step = steps[currentIndex];

  if (!step) return surfaceEntry;

  const stepComponent =
    typeof step.component === 'function'
      ? step.component
      : typeof step === 'function'
        ? step
        : surfaceEntry.component;
  const stepContent = step.content ?? step.node ?? step.element ?? surfaceEntry.content;
  const stepProps = {
    ...(surfaceEntry.props || {}),
    ...(step.props && typeof step.props === 'object' ? step.props : {}),
  };

  return {
    ...surfaceEntry,
    component: stepComponent,
    content: stepContent,
    props: stepProps,
    icon: step.icon ?? step.header?.icon ?? surfaceEntry.icon,
    title: step.title ?? step.header?.title ?? surfaceEntry.title,
    description: step.description ?? step.header?.description ?? surfaceEntry.description,
    descriptionMaxLines: step.descriptionMaxLines ?? surfaceEntry.descriptionMaxLines ?? 2,
    trailing: step.trailing ?? surfaceEntry.trailing,
    headerAction: step.headerAction ?? surfaceEntry.headerAction,
    action: step.action ?? surfaceEntry.action,
    showAction: step.showAction ?? surfaceEntry.showAction,
    closeLabel: step.closeLabel ?? surfaceEntry.closeLabel,
    stepIndex: currentIndex,
    totalSteps: steps.length,
    canGoBack: currentIndex > 0,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === steps.length - 1,
  };
}

function splitStyle(style = {}) {
  const { className, ...inlineStyle } = style;
  return { className, inlineStyle };
}

function getLineClampStyle(maxLines, style) {
  if (Number(maxLines) <= 1) return style;

  return {
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: maxLines,
    display: '-webkit-box',
    overflow: 'hidden',
    ...style,
  };
}

function renderIconNode(icon, size) {
  return typeof icon === 'string' ? <Iconify icon={icon} size={size} /> : icon;
}

function getImageIconStyle(style, icon) {
  const nextStyle = { ...style };
  delete nextStyle.background;
  delete nextStyle.backgroundImage;

  return {
    ...nextStyle,
    backgroundImage: `url(${icon})`,
  };
}

export const Description = memo(function Description({ text, style, maxLines = 1 }) {
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

export const IconOverlay = memo(function IconOverlay({ overlay }) {
  if (!overlay?.icon) return null;

  const { icon, onClick, title = '' } = overlay;
  const isImageSource = isImageIconSource(icon);

  return (
    <AnimatePresence mode="popLayout">
      <motion.button
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
        className={cn(
          'absolute -right-1 -bottom-1 z-20 flex size-6 items-center justify-center overflow-hidden rounded-full bg-black ring ring-black transition-[background-color,color,box-shadow] duration-150 ease-out',
          typeof onClick === 'function' ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        {isImageSource ? (
          <span
            className="size-full rounded-full bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${icon})` }}
          />
        ) : (
          <span className="text-white">{renderIconNode(icon, 12)}</span>
        )}
      </motion.button>
    </AnimatePresence>
  );
});

export const Icon = memo(function Icon({ icon, iconOverlay = null, isStackHovered, style }) {
  const { className, inlineStyle } = splitStyle(style);
  const { size = 24, ...iconStyle } = inlineStyle;
  const isImageSource = isImageIconSource(icon);
  const iconKey = typeof icon === 'string' ? icon : 'icon-node';

  return (
    <div className="relative size-12 shrink-0">
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
      <IconOverlay overlay={iconOverlay} />
    </div>
  );
});

export const BadgeIcon = Icon;

export const Title = memo(function Title({ text, style }) {
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

export const NAV_VIEWPORT_GAP = 4;
export const NAV_HEIGHT_BUFFER = 16;
export const NAV_SPACER_BOTTOM_LOCK_DISTANCE = 40;

const VIEWPORT_MARGIN = 24;
const COMPACT_CARD_MIN_WIDTH = 148;
const COMPACT_CARD_HORIZONTAL_PADDING = 56;
const COMPACT_CARD_MAX_OFFSET = 72;

function getNavStackOffset(cardHeight) {
  return -(cardHeight + NAV_VIEWPORT_GAP);
}

const NAV_CARD_DIMENSIONS = Object.freeze({
  chromeHeight: 20,
  collapsedY: -10,
  compactHeight: 38,
  hudHeight: 52,
  expandedY: getNavStackOffset(68),
  actionGap: 10,
  height: 68,
});

export const NAV_CARD_LAYOUT = Object.freeze({
  collapsed: Object.freeze({
    offsetY: NAV_CARD_DIMENSIONS.collapsedY,
    scale: 0.88,
  }),
  expanded: Object.freeze({
    offsetY: NAV_CARD_DIMENSIONS.expandedY,
    scale: 1,
  }),
  baseHeight: NAV_CARD_DIMENSIONS.height,
  chromeHeight: NAV_CARD_DIMENSIONS.chromeHeight,
  compactHeight: NAV_CARD_DIMENSIONS.compactHeight,
  hudHeight: NAV_CARD_DIMENSIONS.hudHeight,
  actionGap: NAV_CARD_DIMENSIONS.actionGap,
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function estimateCompactCardWidth(title, stackWidth) {
  const titleLength = String(title || '').trim().length;
  const estimatedWidth = titleLength * 10 + COMPACT_CARD_HORIZONTAL_PADDING;
  const maxWidth = Math.max(COMPACT_CARD_MIN_WIDTH, stackWidth - COMPACT_CARD_MAX_OFFSET);

  return clamp(estimatedWidth, COMPACT_CARD_MIN_WIDTH, maxWidth);
}

export function getNavItemCardProps({
  cardScale,
  cardStyle,
  cardWidth,
  compact,
  expanded,
  isAnchoredToBottom,
  position,
  showBorder,
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

export function isImageIconSource(icon) {
  return (
    typeof icon === 'string' &&
    (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:image/'))
  );
}

export function shouldShowVideoIcon({ isActive, isVideo, link }) {
  return Boolean(isActive && isVideo);
}

export function getItemMeasurementKey({ link, expanded, compact, isHud = false }) {
  const state = isHud
    ? 'hud'
    : link.isLoading
      ? 'loading'
      : link.isSurface
        ? 'surface'
        : 'standard';
  return `${link.path || link.name || 'item'}:${state}:${expanded ? 'expanded' : 'collapsed'}:${compact ? 'compact' : 'full'}`;
}

export function getRouteMeasurementKey(pathname, key) {
  return `${pathname || ''}:${key}`;
}

export function getItemDescription({ link }) {
  return link.description;
}

export function getViewportMaxHeight() {
  if (typeof window === 'undefined') return Infinity;
  return window.innerHeight - VIEWPORT_MARGIN;
}

export function getDistanceToBottom() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Infinity;
  }

  const root = document.documentElement;
  const maxScrollY = Math.max((root?.scrollHeight || 0) - window.innerHeight, 0);
  const scrollY = window.scrollY || 0;

  return Math.max(maxScrollY - scrollY, 0);
}

export function getContainerHeight({ cardContentHeight, compact, isHud = false }) {
  const chromeHeight = NAV_CARD_LAYOUT.chromeHeight;
  const minCardHeight = compact
    ? NAV_CARD_LAYOUT.compactHeight
    : isHud
      ? NAV_CARD_LAYOUT.hudHeight
      : NAV_CARD_LAYOUT.baseHeight;
  const nextCardHeight = Math.max(minCardHeight, cardContentHeight + chromeHeight);

  return Math.min(nextCardHeight, getViewportMaxHeight());
}

export function getNavCardWidth(activeItem = null) {
  if (typeof window === 'undefined') {
    return 460;
  }

  const isDesktop = window.innerWidth >= 640;
  if (isDesktop && activeItem) {
    if (activeItem.width) {
      const targetWidth = Number(activeItem.width);
      return Math.min(targetWidth, Math.max(window.innerWidth - 32, 0));
    }
    if (activeItem.expandHorizontal) {
      return Math.min(640, Math.max(window.innerWidth - 32, 0));
    }
  }

  return Math.min(460, Math.max(window.innerWidth - 16, 0));
}

export const NAVIGATION_EVENTS = Object.freeze({
  COLLAPSE: 'COLLAPSE',
  EXPAND: 'EXPAND',
  OPEN_SURFACE: 'OPEN_SURFACE',
  SURFACE_MOUNTED: 'SURFACE_MOUNTED',
  CLOSE_SURFACE: 'CLOSE_SURFACE',
  CLOSE_ALL_SURFACES: 'CLOSE_ALL_SURFACES',
  SET_COMPACT: 'SET_COMPACT',
});

export const NAVIGATION_LIFECYCLE = Object.freeze({
  IDLE: 'idle',
  OPENING: 'opening',
  OPEN: 'open',
  CLOSING: 'closing',
});

export function createNavigationMachineState() {
  return {
    expanded: false,
    isCompact: false,
    surfaceIds: [],
    surfaceLifecycle: NAVIGATION_LIFECYCLE.IDLE,
  };
}

export function navigationStateReducer(state, action) {
  switch (action?.type) {
    case NAVIGATION_EVENTS.COLLAPSE:
      return state.expanded ? { ...state, expanded: false } : state;
    case NAVIGATION_EVENTS.EXPAND:
      return state.expanded ? state : { ...state, expanded: true };
    case NAVIGATION_EVENTS.SET_COMPACT:
      return state.isCompact === Boolean(action.value)
        ? state
        : { ...state, isCompact: Boolean(action.value) };
    case NAVIGATION_EVENTS.OPEN_SURFACE: {
      const surfaceId = action.surfaceId;
      if (surfaceId == null || state.surfaceIds.includes(surfaceId)) return state;
      return {
        ...state,
        expanded: false,
        surfaceIds: [...state.surfaceIds, surfaceId],
        surfaceLifecycle: NAVIGATION_LIFECYCLE.OPENING,
      };
    }
    case NAVIGATION_EVENTS.SURFACE_MOUNTED:
      return state.surfaceLifecycle === NAVIGATION_LIFECYCLE.OPENING
        ? { ...state, surfaceLifecycle: NAVIGATION_LIFECYCLE.OPEN }
        : state;
    case NAVIGATION_EVENTS.CLOSE_SURFACE: {
      const surfaceIds = state.surfaceIds.filter((id) => id !== action.surfaceId);
      if (surfaceIds.length === state.surfaceIds.length) return state;
      return {
        ...state,
        surfaceIds,
        surfaceLifecycle:
          surfaceIds.length > 0 ? NAVIGATION_LIFECYCLE.OPEN : NAVIGATION_LIFECYCLE.CLOSING,
      };
    }
    case NAVIGATION_EVENTS.CLOSE_ALL_SURFACES:
      return state.surfaceIds.length === 0
        ? state
        : { ...state, surfaceIds: [], surfaceLifecycle: NAVIGATION_LIFECYCLE.CLOSING };
    default:
      return state;
  }
}

const SECTION_TITLES = Object.freeze({
  activity: 'Activity',
  diary: 'Diary',
  likes: 'Likes',
  lists: 'Lists',
  reviews: 'Reviews',
  watched: 'Watched',
  watchlist: 'Watchlist',
  edit: 'Edit Profile',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
});

const SECTION_ICONS = Object.freeze({
  activity: 'solar:bolt-bold',
  diary: 'solar:calendar-mark-bold',
  likes: 'solar:heart-bold',
  lists: 'solar:list-bold',
  reviews: 'solar:chat-round-bold',
  watched: 'solar:eye-bold',
  watchlist: 'solar:bookmark-bold',
  edit: 'solar:pen-new-square-bold',
});

function formatSlugTitle(slug = '') {
  if (!slug) return '';
  return String(slug)
    .split(/[-_]+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
}

export function resolveRouteBreadcrumbs(pathname = '', overrides = {}) {
  const normalizedPath = String(pathname || '').trim().replace(/\/+$/, '') || '/';

  const homeItem = {
    id: 'home',
    title: 'Tvizzie',
    path: '/',
    icon: '/tvizzie.png',
    isCurrent: normalizedPath === '/',
    level: 0,
  };

  if (normalizedPath === '/') {
    return [homeItem];
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  const breadcrumbs = [homeItem];

  if (segments.length === 0) {
    return breadcrumbs;
  }

  const [firstSegment, secondSegment, thirdSegment, fourthSegment] = segments;

  if (firstSegment === 'account') {
    if (segments.length === 1) {
      breadcrumbs.push({
        id: 'account',
        title: overrides['/account']?.title || 'Account',
        path: '/account',
        icon: overrides['/account']?.icon || 'solar:user-circle-bold',
        isCurrent: true,
        level: 1,
      });
      return breadcrumbs;
    }

    if (secondSegment === 'edit') {
      breadcrumbs.push({
        id: 'account',
        title: 'Account',
        path: '/account',
        icon: 'solar:user-circle-bold',
        isCurrent: false,
        level: 1,
      });
      breadcrumbs.push({
        id: 'account-edit',
        title: overrides['/account/edit']?.title || 'Edit Profile',
        path: '/account/edit',
        icon: 'solar:pen-new-square-bold',
        isCurrent: true,
        level: 2,
      });
      return breadcrumbs;
    }

    const username = secondSegment;
    const userPath = `/account/${username}`;
    const userTitle = overrides[userPath]?.title || `@${username}`;

    breadcrumbs.push({
      id: `user-${username}`,
      title: userTitle,
      path: userPath,
      icon: overrides[userPath]?.icon || 'solar:user-circle-bold',
      isCurrent: segments.length === 2,
      level: 1,
    });

    if (thirdSegment) {
      const sectionPath = `/account/${username}/${thirdSegment}`;
      const sectionTitle =
        overrides[sectionPath]?.title || SECTION_TITLES[thirdSegment] || formatSlugTitle(thirdSegment);
      const sectionIcon = overrides[sectionPath]?.icon || SECTION_ICONS[thirdSegment] || null;

      breadcrumbs.push({
        id: `section-${thirdSegment}`,
        title: sectionTitle,
        path: sectionPath,
        icon: sectionIcon,
        isCurrent: segments.length === 3,
        level: 2,
      });

      if (fourthSegment) {
        const itemPath = `${sectionPath}/${fourthSegment}`;
        const itemTitle = overrides[itemPath]?.title || formatSlugTitle(fourthSegment);
        const itemIcon = overrides[itemPath]?.icon || null;

        breadcrumbs.push({
          id: `item-${fourthSegment}`,
          title: itemTitle,
          path: itemPath,
          icon: itemIcon,
          isCurrent: true,
          level: 3,
        });
      }
    }

    return breadcrumbs;
  }

  if (firstSegment === 'movie' || firstSegment === 'tv' || firstSegment === 'person') {
    const mediaId = secondSegment;
    const mediaPath = `/${firstSegment}/${mediaId}`;
    const defaultMediaTitle =
      firstSegment === 'movie' ? 'Movie' : firstSegment === 'tv' ? 'TV Show' : 'Person';
    const mediaTitle = overrides[mediaPath]?.title || defaultMediaTitle;
    const mediaIcon =
      overrides[mediaPath]?.icon ||
      (firstSegment === 'person' ? 'solar:user-rounded-bold' : 'solar:clapperboard-play-bold');

    breadcrumbs.push({
      id: `${firstSegment}-${mediaId}`,
      title: mediaTitle,
      path: mediaPath,
      icon: mediaIcon,
      isCurrent: segments.length === 2,
      level: 1,
    });

    if (thirdSegment === 'reviews') {
      const reviewPath = `${mediaPath}/reviews`;
      breadcrumbs.push({
        id: `${firstSegment}-${mediaId}-reviews`,
        title: overrides[reviewPath]?.title || 'Reviews',
        path: reviewPath,
        icon: 'solar:chat-round-bold',
        isCurrent: true,
        level: 2,
      });
    }

    return breadcrumbs;
  }

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isCurrent = index === segments.length - 1;
    const title = overrides[currentPath]?.title || SECTION_TITLES[segment] || formatSlugTitle(segment);
    const icon = overrides[currentPath]?.icon || SECTION_ICONS[segment] || null;

    breadcrumbs.push({
      id: `segment-${segment}-${index}`,
      title,
      path: currentPath,
      icon,
      isCurrent,
      level: index + 1,
    });
  });

  return breadcrumbs;
}

const BreadcrumbStateContext = createContext(null);
const BreadcrumbActionsContext = createContext(null);

export function BreadcrumbProvider({ children }) {
  const [overrides, setOverrides] = useState({});

  const registerOverride = useCallback((path, config) => {
    if (!path || !config) return;
    const normalizedPath = String(path).trim().replace(/\/+$/, '') || '/';
    setOverrides((prev) => {
      const existing = prev[normalizedPath];
      if (existing?.title === config.title && existing?.icon === config.icon) {
        return prev;
      }
      return {
        ...prev,
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
    setOverrides((prev) => {
      if (!prev[normalizedPath]) return prev;
      const next = { ...prev };
      delete next[normalizedPath];
      return next;
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

export function useBreadcrumbOverrides() {
  return useContext(BreadcrumbStateContext) || {};
}

export function useBreadcrumbActions() {
  return (
    useContext(BreadcrumbActionsContext) || {
      registerOverride: () => {},
      unregisterOverride: () => {},
    }
  );
}

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

export function useRegisterBreadcrumbOverride({ icon = null, path, title = null } = {}) {
  const { registerOverride, unregisterOverride } = useBreadcrumbActions();

  useEffect(() => {
    if (!path || !title) return undefined;

    registerOverride(path, { title, icon });

    return () => {
      unregisterOverride(path);
    };
  }, [icon, path, registerOverride, title, unregisterOverride]);
}

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
      ? [breadcrumbs[0], { id: 'ellipsis', title: '...', isEllipsis: true }, ...breadcrumbs.slice(-2)]
      : breadcrumbs;

  return (
    <motion.div
      variants={navBreadcrumbsVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={NAV_BREADCRUMBS_TRANSITION}
      className={cn(
        'absolute inset-x-0 top-[calc(100%+4px)] z-10 flex h-[38px] w-full items-center justify-center rounded-[22px] ring-1 ring-inset ring-white/10 bg-black/80 px-4 text-xs select-none',
        className,
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <nav aria-label="Breadcrumbs" className="flex items-center gap-2 overflow-x-auto scrollbar-none">
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
                    <Iconify
                      icon={crumb.icon}
                      size={14}
                      className="shrink-0 text-white/70"
                    />
                  )}
                  <span className="truncate max-w-[160px]">{crumb.title}</span>
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="flex items-center gap-1.5 text-white/70 transition-colors hover:text-white"
                >
                  {crumb.icon && (
                    <Iconify
                      icon={crumb.icon}
                      size={14}
                      className="shrink-0 text-white/40"
                    />
                  )}
                  <span className="truncate max-w-[120px]">{crumb.title}</span>
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

export const NavBreadcrumbsTab = NavBreadcrumbsCard;
export const NavBreadcrumbsBar = NavBreadcrumbsCard;

export const NavSoundwave = memo(function NavSoundwave({
  isPlaying = false,
  className = '',
  barCount = 4,
}) {
  return (
    <div
      className={cn('flex items-end justify-center gap-0.5 h-3.5', className)}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }).map((_, index) => (
        <motion.span
          key={index}
          custom={index}
          variants={navSoundwaveBarVariants}
          animate={isPlaying ? 'playing' : 'paused'}
          className="w-0.5 h-full origin-bottom rounded-full bg-white/70"
        />
      ))}
    </div>
  );
});

const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

export const NavMediaControls = memo(function NavMediaControls({ className = '' }) {
  const { isPlaying, videoElement, videoOptions } = useBackgroundState();
  const { toggleVideo, toggleLoop } = useBackgroundActions();

  const [playbackRate, setPlaybackRate] = useState(videoElement?.playbackRate || 1);
  const isLoop = Boolean(videoOptions?.loop);

  const handleSkip = useCallback(
    (seconds) => {
      if (!videoElement) return;
      const duration = videoElement.duration || 0;
      const current = videoElement.currentTime || 0;
      const targetTime = duration
        ? Math.max(0, Math.min(current + seconds, duration))
        : Math.max(0, current + seconds);
      videoElement.currentTime = targetTime;
    },
    [videoElement],
  );

  const handleCycleSpeed = useCallback(() => {
    if (!videoElement) return;
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    videoElement.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  }, [playbackRate, videoElement]);

  return (
    <div className={cn('flex w-full items-center justify-between gap-2 select-none', className)}>
      <Button
        type="button"
        onClick={handleCycleSpeed}
        className="flex h-8 cursor-pointer items-center justify-center rounded-full bg-white/5 px-3 text-xs font-semibold text-white/70 tabular-nums ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
        aria-label={`Playback speed ${playbackRate}x`}
      >
        <span>{playbackRate}x</span>
      </Button>

      {}
      <div className="flex items-center gap-2">
        {}
        <Button
          type="button"
          onClick={() => handleSkip(-10)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
          aria-label="Rewind 10 seconds"
        >
          <Iconify icon="solar:rewind-10-seconds-back-bold" size={16} />
        </Button>

        <Button
          type="button"
          onClick={toggleVideo}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10 ring-inset hover:bg-white/15"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          <Iconify icon={isPlaying ? 'solar:pause-bold' : 'solar:play-bold'} size={18} />
        </Button>

        <Button
          type="button"
          onClick={() => handleSkip(10)}
          className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/5 ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10"
          aria-label="Forward 10 seconds"
        >
          <Iconify icon="solar:rewind-10-seconds-forward-bold" size={16} />
        </Button>
      </div>

      <Button
        type="button"
        onClick={toggleLoop}
        className={cn(
          'flex size-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-inset',
          isLoop
            ? 'bg-white/10 text-white ring-white/10 hover:bg-white/15'
            : 'bg-white/5 text-white/40 ring-white/5 hover:bg-white/10 hover:text-white hover:ring-white/10',
        )}
        aria-label={isLoop ? 'Disable loop' : 'Enable loop'}
      >
        <Iconify icon="solar:repeat-bold" size={16} />
      </Button>
    </div>
  );
});

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
  const isSeekingRef = useRef(false);

  useEffect(() => {
    if (!videoElement) {
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = 'scaleX(0)';
      }
      setCurrentTime(0);
      setDuration(0);
      return undefined;
    }

    let animationFrameId;

    const syncProgress = () => {
      if (!isSeekingRef.current && videoElement.duration) {
        const current = videoElement.currentTime || 0;
        const total = videoElement.duration || 0;
        const ratio = total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
        if (progressBarRef.current) {
          progressBarRef.current.style.transform = `scaleX(${ratio})`;
        }
        setCurrentTime(current);
        setDuration(total);
      }
      if (isPlaying) {
        animationFrameId = requestAnimationFrame(syncProgress);
      }
    };

    syncProgress();

    const handleTimeUpdate = () => {
      syncProgress();
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPlaying, videoElement]);

  const handleSeek = useCallback(
    (event) => {
      if (!videoElement || !scrubberRef.current || !duration) return;

      const rect = scrubberRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? event.touches?.[0]?.clientX ?? 0;
      const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = rect.width > 0 ? offsetX / rect.width : 0;
      const targetTime = percentage * duration;

      videoElement.currentTime = targetTime;
      setCurrentTime(targetTime);
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${percentage})`;
      }
    },
    [duration, videoElement],
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
      className={cn(
        'group absolute inset-x-0 top-0 z-30 h-3 cursor-pointer touch-none select-none overflow-hidden rounded-t-[30px]',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onClick={(e) => {
        e.stopPropagation();
        handleSeek(e);
      }}
    >
      {}
      <div className="absolute inset-x-0 top-0 h-[2.5px] w-full bg-white/10 transition-all duration-200 group-hover:h-1">
        {}
        <div
          ref={progressBarRef}
          className="h-full w-full origin-left bg-white/70 transition-colors duration-150 group-hover:bg-white"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {}
      <AnimatePresence>
        {isHovered && showTimeOnHover && duration > 0 && (
          <motion.div
            variants={navScrubberTooltipVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={NAV_SCRUBBER_TOOLTIP_TRANSITION}
            className="pointer-events-none absolute top-3 -translate-x-1/2 rounded-md ring-1 ring-inset ring-white/10 bg-black/80 px-1.5 py-0.5 text-xs text-white"
            style={{ left: hoverPosition }}
          >
            {formatMediaTime(hoverTime)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export const NAV_ACTION_KEYS = Object.freeze({
  NOTIFICATIONS: 'notifications',
  LOGOUT: 'logout',
  SCROLL_TOP: 'scroll-top',
});

export const NAV_ACTION_ORDER = Object.freeze({
  NOTIFICATIONS: -10,
  SCROLL_TOP: 20,
  LOGOUT: 30,
});

function stopPropagation(event) {
  event.stopPropagation();
}

function normalizeToolbarActions(actions) {
  if (!actions) return [];
  const actionList = Array.isArray(actions) ? actions : [actions];
  return actionList.map((action, index) => ({
    key: action.key ?? `action-${index}`,
    ...action,
  }));
}

function getVisibleToolbarActions(actions) {
  return actions.filter((action) => action.visible !== false);
}

function sortToolbarActionsByOrder(actions) {
  return [...actions].sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
}

function isActionlessNavItem(activeItem) {
  return Boolean(
    activeItem?.isNotFound ||
    activeItem?.path === 'not-found' ||
    activeItem?.isMasked ||
    activeItem?.isSurface,
  );
}

function isStatusToolbarActionAllowed(activeItem) {
  return activeItem?.type === 'APP_ERROR' || activeItem?.type === 'API_ERROR';
}

function filterContextToolbarActions(actions, activeItem) {
  return actions.filter((action) => {
    if (action.key === NAV_ACTION_KEYS.LOGOUT && activeItem?.hideLogout) return false;
    if (action.key === NAV_ACTION_KEYS.SCROLL_TOP && activeItem?.hideScroll) return false;
    return true;
  });
}

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

export function useNavActions({ activeItem } = {}) {
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

export const NavAction = memo(function NavAction({ action }) {
  return (
    <Tooltip className="px-2" text={action.tooltip}>
      <NavMotionButton
        className="center relative size-8 cursor-pointer rounded-xl p-1 text-white/70 transition-[background-color,color] duration-150 ease-out hover:bg-white/10 hover:text-white motion-reduce:transition-none"
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
      </NavMotionButton>
    </Tooltip>
  );
});

export const NavActionsContainer = memo(function NavActionsContainer({ activeItem }) {
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

const SurfaceHeaderContext = createContext(null);

export function useSurfaceHeader() {
  return useContext(SurfaceHeaderContext);
}

export function NavSurfaceHeaderButton({
  children,
  className = '',
  disabled = false,
  onClick,
  ariaLabel,
}) {
  const reduceMotion = useReducedMotion();

  return (
    <NavMotionButton
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'center h-8 shrink-0 cursor-pointer gap-1 rounded-xl bg-white/5 px-2.5 text-xs font-bold whitespace-nowrap text-white/70 uppercase ring-1 ring-white/5 transition-[background-color,color,box-shadow] duration-150 ease-out ring-inset hover:bg-white hover:text-black hover:ring-transparent focus-visible:ring-2 focus-visible:ring-white/10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
        className,
      )}
    >
      {children}
    </NavMotionButton>
  );
}

export function NavSurfaceHeader({
  icon = null,
  title = '',
  description = '',
  trailing = null,
  headerAction = null,
  onClose = null,
  onBack = null,
  stepIndex = 0,
  totalSteps = 1,
  badge = null,
  closeLabel = 'Close surface',
  backLabel = 'Previous step',
  descriptionMaxLines = 2,
  className = '',
}) {
  const reduceMotion = useReducedMotion();
  const hasHeaderAction = Boolean(headerAction);
  const hasClose = typeof onClose === 'function';
  const hasBack = typeof onBack === 'function';
  const controlCount = [hasHeaderAction, hasBack, hasClose].filter(Boolean).length;

  const renderedHeaderAction = useMemo(() => {
    if (!hasHeaderAction) return null;
    if (isValidElement(headerAction)) {
      return cloneElement(headerAction, {
        className: cn(
          headerAction.props?.className,
          hasClose ? 'rounded-l-[20px] rounded-r-none' : 'rounded-[20px]',
        ),
      });
    }
    return headerAction;
  }, [hasClose, hasHeaderAction, headerAction]);

  const stepIndicatorText = totalSteps > 1 ? `Step ${stepIndex + 1} of ${totalSteps}` : null;

  return (
    <div
      className={cn('relative flex w-full min-w-0 items-start justify-between gap-2.5', className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        {icon ? (
          <div className="center relative size-12 shrink-0">
            <BadgeIcon icon={icon} />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 items-center justify-between gap-2.5 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col justify-center -space-y-0.5">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <Title text={title} style={{ className: '!normal-case !truncate text-base' }} />
              {badge ? (
                <span className="center rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-white">
                  {badge}
                </span>
              ) : stepIndicatorText ? (
                <span className="text-xs font-semibold text-white/40">• {stepIndicatorText}</span>
              ) : null}
            </div>
            {description ? <Description text={description} maxLines={descriptionMaxLines} /> : null}
          </div>
          {trailing ? <div className="shrink-0">{trailing}</div> : null}
        </div>
      </div>

      {controlCount ? (
        <div
          className={cn(
            'flex shrink-0 items-center self-start',
            controlCount > 1 ? 'gap-[1px]' : 'gap-1',
          )}
        >
          {renderedHeaderAction ? (
            <motion.div {...getNavActionMotionProps({ reduceMotion })}>
              {renderedHeaderAction}
            </motion.div>
          ) : null}
          {hasBack ? (
            <NavMotionButton
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onBack();
              }}
              className={cn(
                'center size-8 shrink-0 cursor-pointer bg-white/5 text-white/70 ring-1 ring-white/5 transition-[background-color,color,box-shadow] duration-150 ease-out ring-inset hover:bg-white hover:text-black hover:ring-transparent motion-reduce:transition-none',
                hasClose ? 'rounded-l-[20px] rounded-r-none' : 'rounded-[20px]',
                hasHeaderAction ? 'rounded-l-none' : '',
              )}
              aria-label={backLabel}
            >
              <Iconify icon="solar:alt-arrow-left-bold" size={16} />
            </NavMotionButton>
          ) : null}
          {hasClose ? (
            <NavMotionButton
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className={cn(
                'center size-8 shrink-0 cursor-pointer bg-white/5 text-white/70 ring-1 ring-white/5 transition-[background-color,color,box-shadow] duration-150 ease-out ring-inset hover:bg-white hover:text-black hover:ring-transparent motion-reduce:transition-none',
                controlCount > 1 ? 'rounded-l-none rounded-r-[20px]' : 'rounded-[20px]',
              )}
              aria-label={closeLabel}
            >
              <Iconify icon="material-symbols:close-rounded" size={16} />
            </NavMotionButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export const NavSurfaceShell = forwardRef(function NavSurfaceShell(
  {
    icon = null,
    title = '',
    description = '',
    trailing = null,
    headerAction = null,
    onClose = null,
    onBack = null,
    stepIndex = 0,
    totalSteps = 1,
    badge = null,
    allowSwipeDismiss = true,
    closeLabel = 'Close surface',
    backLabel = 'Previous step',
    descriptionMaxLines = 2,
    className = '',
    contentClassName = '',
    children,
    onAnimationComplete = null,
  },
  ref,
) {
  const [headerState, setHeaderState] = useState({
    icon,
    title,
    description,
    trailing,
    headerAction,
    onBack,
    stepIndex,
    totalSteps,
    badge,
  });

  useEffect(() => {
    setHeaderState((previousState) => ({
      ...previousState,
      icon,
      title,
      description,
      trailing,
      headerAction,
      onBack,
      stepIndex,
      totalSteps,
      badge,
    }));
  }, [badge, description, headerAction, icon, onBack, stepIndex, title, totalSteps, trailing]);

  const handleDragEnd = (_event, info) => {
    if (!allowSwipeDismiss || typeof onClose !== 'function') return;
    if (info.offset.y > 65 || info.velocity.y > 400) {
      onClose();
    }
  };

  return (
    <SurfaceHeaderContext.Provider value={setHeaderState}>
      <motion.section
        ref={ref}
        className={cn('relative flex flex-col gap-2.5 overflow-visible', className)}
        variants={slideFadeVariants}
        initial={false}
        animate="visible"
        exit="exit"
        transition={NAV_SURFACE_TRANSITION}
        drag={allowSwipeDismiss && typeof onClose === 'function' ? 'y' : false}
        dragConstraints={NAV_SURFACE_DRAG_CONSTRAINTS}
        dragElastic={NAV_SURFACE_DRAG_ELASTIC}
        onDragEnd={handleDragEnd}
        onAnimationComplete={onAnimationComplete}
      >
        <div className="w-full">
          <NavSurfaceHeader
            descriptionMaxLines={descriptionMaxLines}
            description={headerState.description}
            trailing={headerState.trailing}
            headerAction={headerState.headerAction}
            title={headerState.title}
            icon={headerState.icon}
            onBack={headerState.onBack || onBack}
            stepIndex={headerState.stepIndex ?? stepIndex}
            totalSteps={headerState.totalSteps ?? totalSteps}
            badge={headerState.badge || badge}
            closeLabel={closeLabel}
            backLabel={backLabel}
            onClose={onClose}
          />
        </div>
        <div className={cn('w-full overflow-visible', contentClassName)}>{children}</div>
      </motion.section>
    </SurfaceHeaderContext.Provider>
  );
});

function HudActionButton({ action, expanded = false }) {
  const isDestructive = Boolean(action.isDestructive);
  const button = (
    <NavMotionButton
      type="button"
      disabled={action.disabled}
      onClick={(event) => {
        event.stopPropagation();
        action.onClick?.(event);
      }}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-xl text-xs font-medium ring-1 transition-[background-color,color,box-shadow] duration-150 ease-out ring-inset motion-reduce:transition-none',
        expanded ? 'px-3' : 'px-2.5',
        isDestructive
          ? 'bg-red-500/20 text-red-300 ring-red-500/20 hover:bg-red-500/30'
          : expanded
            ? 'bg-white/10 text-white ring-white/10 hover:bg-white/15'
            : 'bg-white/5 text-white/70 ring-white/5 hover:bg-white/10 hover:text-white',
        action.disabled && 'pointer-events-none opacity-40',
      )}
      aria-label={action.label}
    >
      {action.icon && <Iconify icon={action.icon} size={15} />}
      {action.label && <span>{action.label}</span>}
    </NavMotionButton>
  );

  if (expanded) return button;

  return <Tooltip text={action.tooltip || action.label}>{button}</Tooltip>;
}

export const NavHudShell = memo(function NavHudShell({
  children,
  className = '',
  icon = null,
  title = null,
  description = null,
  badge = null,
  progress = null,
  isIndeterminate = false,
  actions = [],
  trailing = null,
  variant = NAV_HUD_VARIANT.COMPACT,
  onCancel = null,
  onClick,
}) {
  const hasStructuredContent = Boolean(
    title || icon || badge || actions.length > 0 || progress != null || isIndeterminate,
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="nav-hud-shell"
        variants={navHudVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={NAV_HUD_TRANSITION}
        className={cn('flex w-full flex-col justify-center gap-2 select-none', className)}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
      >
        {children ? (
          children
        ) : hasStructuredContent ? (
          <div className="flex w-full flex-col gap-2">
            <div className="flex w-full items-center justify-between gap-2.5">
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {badge != null ? (
                  <div className="flex h-8 items-center gap-1.5 rounded-xl bg-white/10 px-2.5 text-xs font-semibold text-white ring-1 ring-white/10 ring-inset">
                    {badge}
                  </div>
                ) : icon ? (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white ring-1 ring-white/10 ring-inset">
                    {typeof icon === 'string' ? <Iconify icon={icon} size={18} /> : icon}
                  </div>
                ) : null}

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  {title && (
                    <div className="truncate text-sm leading-tight font-semibold text-white">
                      {title}
                    </div>
                  )}
                  {description && (
                    <div className="truncate text-xs leading-tight text-white/40">
                      {description}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {trailing}

                {variant === NAV_HUD_VARIANT.COMPACT &&
                  actions.map((action, index) => {
                    const actionKey = action.key || `hud-action-${index}`;

                    return <HudActionButton key={actionKey} action={action} />;
                  })}

                {typeof onCancel === 'function' && (
                  <NavMotionButton
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(e);
                    }}
                    className="flex size-8 items-center justify-center rounded-xl bg-white/5 text-white/40 ring-1 ring-white/5 transition-[background-color,color,box-shadow] duration-150 ease-out ring-inset hover:bg-white/10 hover:text-white hover:ring-white/10 motion-reduce:transition-none"
                    aria-label="Dismiss HUD"
                  >
                    <Iconify icon="solar:close-circle-bold" size={16} />
                  </NavMotionButton>
                )}
              </div>
            </div>

            {(progress != null || isIndeterminate) && (
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
                {isIndeterminate ? (
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-white/70" />
                ) : (
                  <div
                    className="h-full w-full origin-left rounded-full bg-white/70 transition-transform duration-150"
                    style={{ transform: `scaleX(${Math.max(0, Math.min(100, progress)) / 100})` }}
                  />
                )}
              </div>
            )}

            {variant === NAV_HUD_VARIANT.EXPANDED && actions.length > 0 && (
              <div className="flex w-full items-center justify-end gap-1.5 pt-0.5">
                {actions.map((action, index) => {
                  const actionKey = action.key || `hud-expanded-action-${index}`;

                  return <HudActionButton key={actionKey} action={action} expanded />;
                })}
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
});

export const NavHud = memo(function NavHud() {
  const { hud } = useNavigationState();
  const { clearHud } = useNavigationActions();
  const pathname = usePathname();

  const handleCancel = useCallback(() => {
    if (typeof hud?.onCancel === 'function') {
      hud.onCancel();
    }
    if (hud?.id) {
      clearHud(hud.id);
    }
  }, [hud, clearHud]);

  useEffect(() => {
    if (hud?.isActive && hud?.dismissOnNavigate) {

      return () => {
        if (hud?.id) clearHud(hud.id);
      };
    }
  }, [pathname, hud?.id, hud?.isActive, hud?.dismissOnNavigate, clearHud]);

  useEffect(() => {
    if (!hud?.isActive || !hud?.dismissOnEscape) return;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        handleCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [hud?.isActive, hud?.dismissOnEscape, handleCancel]);

  useEffect(() => {
    if (!hud?.isActive || !hud?.autoDismissMs) return;

    const timer = setTimeout(() => {
      handleCancel();
    }, hud.autoDismissMs);

    return () => {
      clearTimeout(timer);
    };
  }, [hud?.isActive, hud?.autoDismissMs, handleCancel]);

  if (!hud || !hud.isActive) {
    return null;
  }

  if (hud.renderMode === NAV_HUD_RENDER_MODE.COMPONENT && isValidComponentType(hud.component)) {
    const Component = hud.component;
    return (
      <NavHudShell onCancel={handleCancel}>
        <Component {...(hud.props || {})} onCancel={handleCancel} />
      </NavHudShell>
    );
  }

  if (hud.content) {
    return <NavHudShell onCancel={handleCancel}>{hud.content}</NavHudShell>;
  }

  return (
    <NavHudShell
      icon={hud.icon}
      title={hud.title}
      description={hud.description}
      badge={hud.badge}
      progress={hud.progress}
      isIndeterminate={hud.isIndeterminate}
      actions={hud.actions}
      variant={hud.variant}
      onCancel={handleCancel}
    />
  );
});

export function NavHeightSpacer({ className = '' }) {
  const { navHeight } = useNavHeight();

  return (
    <div aria-hidden="true" className={className} style={{ flexShrink: 0, height: navHeight }} />
  );
}

const STATUS_PRIORITY = Object.freeze({
  ACCOUNT_DELETE: 115,
  SIGNUP: 110,
  LOGIN: 110,
  LOGOUT: 110,
  APP_ERROR: 100,
  NOT_FOUND: 97,
  API_ERROR: 95,
  OFFLINE: 90,
  ONLINE: 10,
});

const ERROR_STATUS_TYPES = new Set(['ACCOUNT_DELETE', 'APP_ERROR', 'API_ERROR', 'NOT_FOUND']);

const STATUS_TONES = Object.freeze({
  ACCOUNT_DELETE: 'error',
  API_ERROR: 'error',
  APP_ERROR: 'error',
  LOGIN: 'success',
  LOGOUT: 'warning',
  NOT_FOUND: 'error',
  OFFLINE: 'warning',
  ONLINE: 'success',
  SIGNUP: 'success',
});

export const STATUS_CLEAR_DURATION = 4500;
export const AUTH_STATUS_CLEAR_DURATION = 3000;
export const API_ERROR_BATCH_DELAY = 300;

const AUTH_STATUS_STORAGE_KEY = 'nav_auth_status';
const PERSISTED_AUTH_STATUS_TYPES = new Set(['LOGIN', 'LOGOUT', 'SIGNUP']);

function readSessionStorage() {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null;
  }

  return window.sessionStorage;
}

function normalizeUpper(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizeLower(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isErrorStatus(type) {
  return ERROR_STATUS_TYPES.has(type);
}

function getStatusPriority(type) {
  return STATUS_PRIORITY[type] ?? 0;
}

export function resolveStatusPriority(status) {
  if (!status) {
    return 0;
  }

  const explicitPriority = Number(status.priority);

  return Number.isFinite(explicitPriority) ? explicitPriority : getStatusPriority(status.type);
}

function getStatusTone(type) {
  return STATUS_TONES[type] || 'info';
}

export function getStatusTheme(type) {
  const semanticTone =
    SEMANTIC_SURFACE_CLASSES[getStatusTone(type)] || SEMANTIC_SURFACE_CLASSES.info;

  return {
    card: {
      className: semanticTone.surface,
    },
    icon: {
      className: semanticTone.icon,
    },
    title: {
      className: semanticTone.title,
    },
    description: {
      className: semanticTone.description,
      opacity: 1,
    },
  };
}

export function isPersistableAuthStatus(status) {
  return (
    Boolean(status) &&
    PERSISTED_AUTH_STATUS_TYPES.has(status.type) &&
    (typeof status.icon === 'string' || status.icon == null)
  );
}

export function clearPersistedAuthStatus() {
  readSessionStorage()?.removeItem(AUTH_STATUS_STORAGE_KEY);
}

export function persistAuthStatus(status, duration) {
  const storage = readSessionStorage();

  if (!isPersistableAuthStatus(status) || !storage) {
    return;
  }

  storage.setItem(
    AUTH_STATUS_STORAGE_KEY,
    JSON.stringify({
      description: status.description || '',
      expiresAt: Date.now() + Math.max(0, Number(duration) || 0),
      flow: status.flow || null,
      icon: status.icon || null,
      priority: resolveStatusPriority(status),
      title: status.title || '',
      type: status.type,
    }),
  );
}

export function restorePersistedAuthStatus() {
  const storage = readSessionStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(AUTH_STATUS_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const payload = JSON.parse(rawValue);
    const type = normalizeUpper(payload?.type);
    const expiresAt = Number(payload?.expiresAt || 0);

    if (
      !PERSISTED_AUTH_STATUS_TYPES.has(type) ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      clearPersistedAuthStatus();
      return null;
    }

    return {
      remainingMs: expiresAt - Date.now(),
      status: createOverlayStatus({
        type,
        flow: payload?.flow || null,
        priority: Number.isFinite(Number(payload?.priority)) ? Number(payload.priority) : null,
        title: payload?.title || 'Account',
        description: payload?.description || '',
        icon: payload?.icon || null,
        style: getStatusTheme(type),
      }),
    };
  } catch {
    clearPersistedAuthStatus();
    return null;
  }
}

export function createOverlayStatus({
  type,
  title,
  description,
  icon,
  style,
  isOverlay = true,
  action = null,
  actions = null,
  flow = null,
  priority = null,
}) {
  return {
    type,
    flow,
    isOverlay,
    priority,
    title,
    description,
    icon,
    style,
    action,
    actions,
    hideScroll: true,
  };
}

function ErrorActions({ onRetry, onRefresh }) {
  return (
    <div className="flex w-full items-center gap-2.5">
      <Button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRetry();
        }}
        className={getNavActionClass({
          isActive: false,
          className: DESTRUCTIVE_ACTION_TONE_CLASS,
        })}
      >
        Retry
      </Button>
      <Button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRefresh();
        }}
        className={getNavActionClass({
          isActive: false,
          className: DESTRUCTIVE_ACTION_TONE_CLASS,
        })}
      >
        Refresh
      </Button>
    </div>
  );
}

export function createErrorStatus({ type, title, description, icon, style, onRetry, clearStatus }) {
  const retryHandler =
    typeof onRetry === 'function'
      ? () => {
          clearStatus();
          onRetry();
        }
      : () => {
          window.location.reload();
        };

  return createOverlayStatus({
    type,
    title,
    description,
    icon,
    style,
    isOverlay: true,
    action: () => (
      <ErrorActions onRetry={retryHandler} onRefresh={() => window.location.reload()} />
    ),
  });
}

export function createProgressIcon() {
  return <Spinner size={24} />;
}

export function createSuccessIcon() {
  return 'material-symbols:check-rounded';
}

export function resolveFeedbackIcon({ phase, icon = null }) {
  if (phase === 'start') {
    return createProgressIcon();
  }

  if (phase === 'success') {
    return createSuccessIcon();
  }

  return icon;
}

export function createConnectionStatus(type) {
  if (type === 'OFFLINE') {
    return createOverlayStatus({
      type,
      title: 'Connection Lost',
      description: 'You are currently offline',
      icon: <WifiOff size={24} />,
      style: getStatusTheme(type),
    });
  }

  return createOverlayStatus({
    type: 'ONLINE',
    title: 'Connection Restored',
    description: 'You are back online',
    icon: <Wifi size={24} />,
    style: getStatusTheme('ONLINE'),
    isOverlay: false,
  });
}

export function createAuthStatus({ type, user = null, titleFallback = 'Account', description }) {
  return createOverlayStatus({
    type,
    title: user?.name || user?.email || titleFallback,
    description,
    icon: createSuccessIcon(),
    style: getStatusTheme(type),
  });
}

export function normalizeAuthFeedback(eventData = {}) {
  const phase = normalizeLower(eventData?.phase);
  const flow = normalizeLower(eventData?.flow);
  const statusType = normalizeUpper(eventData?.statusType || flow || 'AUTH_FEEDBACK');

  return {
    flow,
    phase,
    statusType,
  };
}

export function createAuthFeedbackStatus(eventData = {}) {
  const { flow, phase, statusType } = normalizeAuthFeedback(eventData);

  if (!phase) {
    return null;
  }

  return createOverlayStatus({
    type: statusType,
    flow,
    priority: eventData?.priority ?? STATUS_PRIORITY.LOGIN,
    title: eventData?.title || 'Account',
    description: eventData?.description || '',
    icon: resolveFeedbackIcon({
      phase,
      icon: eventData?.icon || null,
    }),
    style: eventData?.style || getStatusTheme(eventData?.themeType || 'LOGIN'),
    isOverlay: eventData?.isOverlay !== false,
  });
}

const HEIGHT_EPSILON = 2.0;

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

export function useElementHeight(onHeightChange, elementRef, shouldMeasure, dependencyKey = null) {
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
    let settleTimer = null;

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

      if (settleTimer !== null) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    };
  }, [dependencyKey, elementRef, shouldMeasure]);
}

export function useNavBadge(navKey, initialBadge) {
  const [badge, setBadge] = useState({
    visible: Boolean(initialBadge),
    value: initialBadge,
    color: 'bg-white/5',
  });

  useEffect(() => {
    const unsubscribe = NAV_EVENT_HANDLERS.onBadgeUpdate((data) => {
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

export function useNavContextActions(actions) {
  const { registerContextAction, unregisterContextAction } = useNavigationActions();
  const registeredKeysRef = useRef(new Set());

  useEffect(() => {
    if (!actions) return;

    const actionList = Array.isArray(actions) ? actions : [actions];
    const currentKeys = new Set();

    actionList.forEach((action, index) => {
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

export const useNavHeight = () => {
  const { navHeight } = useNavigationState();
  return { navHeight, padding: { paddingBottom: `${navHeight}px` } };
};

export function useNavHeightController({
  activeItemIsOverlay,
  activeItemLayoutKey,
  compact,
  isHud = false,
  pathname,
  setNavHeight,
}) {
  const [containerHeight, setContainerHeight] = useState(
    isHud ? NAV_CARD_LAYOUT.hudHeight : NAV_CARD_LAYOUT.baseHeight,
  );

  const heightRef = useRef({ content: 0 });
  const rafRef = useRef(null);
  const compactRef = useRef(compact);
  const isHudRef = useRef(isHud);
  const previousPathRef = useRef(pathname);
  const previousActiveItemLayoutKeyRef = useRef(activeItemLayoutKey);

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

  const resetHeights = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    heightRef.current = { content: 0 };
    lastAppliedContainerHeightRef.current = NAV_CARD_LAYOUT.baseHeight;
    lastAppliedSpacerHeightRef.current = NAV_CARD_LAYOUT.baseHeight + NAV_HEIGHT_BUFFER;
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

  useIsomorphicLayoutEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
  }, [pathname]);

  useIsomorphicLayoutEffect(() => {
    if (activeItemIsOverlay) return;
    if (previousActiveItemLayoutKeyRef.current === activeItemLayoutKey) return;
    previousActiveItemLayoutKeyRef.current = activeItemLayoutKey;
  }, [activeItemIsOverlay, activeItemLayoutKey]);

  return {
    containerHeight,
    handleContentHeightChange,
  };
}

export function useNavHud(descriptor) {
  const { setHud, clearHud } = useNavigationActions();
  const wasActiveRef = useRef(false);
  const registeredIdRef = useRef(null);

  useEffect(() => {
    const definition = createHudDefinition(descriptor);

    if (!definition || !definition.isActive) {
      if (wasActiveRef.current) {
        wasActiveRef.current = false;
        clearHud(registeredIdRef.current);
        registeredIdRef.current = null;
      }
      return;
    }

    wasActiveRef.current = true;
    registeredIdRef.current = definition.id;
    setHud(definition);
  }, [descriptor, setHud, clearHud]);

  useEffect(() => {
    return () => {
      if (wasActiveRef.current) {
        clearHud(registeredIdRef.current);
      }
    };
  }, [clearHud]);
}

function isEditableTarget(target) {
  return (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable ||
      target.getAttribute?.('contenteditable') === '' ||
      target.getAttribute?.('role') === 'textbox')
  );
}

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('button, a, [role="button"], [role="option"], [role="combobox"]'));
}

export function useNavKeyboard({
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
      if (isEditableTarget(event.target) || isInteractiveTarget(event.target)) {
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

export function useNavViewport(activeItem = null) {
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

    const handleResize = () => {
      setStackWidth(getNavCardWidth(activeItem));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeItem]);

  return {
    portalTarget,
    stackWidth,
  };
}

const COMPACT_SCROLL_THRESHOLD = 148;
const COMPACT_RELEASE_THRESHOLD = 36;
const SCROLL_DIRECTION_EPSILON = 0.5;
const COMPACT_ACTIVATION_BUFFER = 88;
const COMPACT_MIN_ACTIVATION_DELTA = 4.5;
const COMPACT_TOGGLE_COOLDOWN_MS = 300;
const OVERSCROLL_THRESHOLD = -1;
const HORIZONTAL_GESTURE_DELTA_THRESHOLD = 8;
const HORIZONTAL_GESTURE_DOMINANCE_RATIO = 1.15;
const HORIZONTAL_GESTURE_SUPPRESSION_MS = 260;
const BOTTOM_LOCK_ACTIVATION_DISTANCE = 2;
const BOTTOM_LOCK_RELEASE_DISTANCE = 40;
const BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT = COMPACT_SCROLL_THRESHOLD + BOTTOM_LOCK_RELEASE_DISTANCE;
const BEHAVIOR_FOCUS_IDLE_MS = 1400;
const BEHAVIOR_CHECK_INTERVAL_MS = 350;

export const NAV_COMPACT_BEHAVIOR = Object.freeze({
  BROWSING: 'browsing',
  FOCUSED: 'focused',
});

function getDocumentDistanceToBottom(scrollY) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Infinity;
  }

  const root = document.documentElement;
  const maxScrollY = Math.max((root?.scrollHeight || 0) - window.innerHeight, 0);
  return Math.max(maxScrollY - scrollY, 0);
}

function getScrollableHeight() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  const root = document.documentElement;
  return Math.max((root?.scrollHeight || 0) - window.innerHeight, 0);
}

function canUseBottomLock(scrollableHeight) {
  return scrollableHeight >= BOTTOM_LOCK_MIN_SCROLLABLE_HEIGHT;
}

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

export function isEditableNavigationTarget(target) {
  if (!target || typeof target.matches !== 'function') {
    return false;
  }

  return target.matches(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]',
  );
}

export function resolveCompactBehavior({ isInputFocused, isPointerIdle, isVideoPlaying }) {
  if (isInputFocused || isVideoPlaying || isPointerIdle) {
    return NAV_COMPACT_BEHAVIOR.FOCUSED;
  }

  return NAV_COMPACT_BEHAVIOR.BROWSING;
}

function useNavigationBehavior({ isVideoPlaying = false }) {
  const [behavior, setBehavior] = useState(NAV_COMPACT_BEHAVIOR.BROWSING);
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    lastInteractionRef.current = getNow();

    const updateBehavior = () => {
      const isInputFocused = isEditableNavigationTarget(document.activeElement);
      const isPointerIdle = getNow() - lastInteractionRef.current >= BEHAVIOR_FOCUS_IDLE_MS;
      const nextBehavior = resolveCompactBehavior({
        isInputFocused,
        isPointerIdle,
        isVideoPlaying,
      });

      setBehavior((currentBehavior) =>
        currentBehavior === nextBehavior ? currentBehavior : nextBehavior,
      );
    };

    const recordBrowsingActivity = () => {
      lastInteractionRef.current = getNow();
      updateBehavior();
    };

    const handleFocusChange = () => {
      updateBehavior();
    };

    const intervalId = window.setInterval(updateBehavior, BEHAVIOR_CHECK_INTERVAL_MS);

    updateBehavior();
    window.addEventListener('pointermove', recordBrowsingActivity, { passive: true });
    window.addEventListener('pointerdown', recordBrowsingActivity, { passive: true });
    window.addEventListener('wheel', recordBrowsingActivity, { passive: true });
    window.addEventListener('keydown', recordBrowsingActivity);
    document.addEventListener('focusin', handleFocusChange);
    document.addEventListener('focusout', handleFocusChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pointermove', recordBrowsingActivity);
      window.removeEventListener('pointerdown', recordBrowsingActivity);
      window.removeEventListener('wheel', recordBrowsingActivity);
      window.removeEventListener('keydown', recordBrowsingActivity);
      document.removeEventListener('focusin', handleFocusChange);
      document.removeEventListener('focusout', handleFocusChange);
    };
  }, [isVideoPlaying]);

  return behavior;
}

function canUseCompactNav({
  hasActiveItem,
  isActionEngaged,
  isHudActive,
  isLoading,
  isOverlay,
  isStatus,
  isSurface,
  isBehaviorFocused,
  title,
}) {
  if (!hasActiveItem) {
    return false;
  }

  if (
    isOverlay ||
    isSurface ||
    isLoading ||
    isStatus ||
    isActionEngaged ||
    isHudActive ||
    isBehaviorFocused
  ) {
    return false;
  }

  return Boolean(String(title || '').trim());
}

function resolveCompactState(
  scrollY,
  previousScrollY,
  currentValue,
  downwardTravel,
  compactActivationSuppressed,
) {
  const scrollDelta = scrollY - previousScrollY;

  if (scrollY <= COMPACT_RELEASE_THRESHOLD) {
    return false;
  }

  if (scrollDelta < -SCROLL_DIRECTION_EPSILON) {
    return false;
  }

  if (compactActivationSuppressed) {
    return currentValue;
  }

  if (
    scrollY >= COMPACT_SCROLL_THRESHOLD &&
    scrollDelta >= COMPACT_MIN_ACTIVATION_DELTA &&
    downwardTravel >= COMPACT_ACTIVATION_BUFFER
  ) {
    return true;
  }

  return currentValue;
}

export function useNavigationCompact({
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
    const initialDistanceToBottom = getDocumentDistanceToBottom(currentScrollY);
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
      const distanceToBottom = getDocumentDistanceToBottom(scrollY);
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
          lastToggleTimeRef.current = getNow();
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
        !compactRef.current && getNow() < suppressCompactUntilRef.current;

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

      if (getNow() - lastToggleTimeRef.current < COMPACT_TOGGLE_COOLDOWN_MS) {
        return;
      }

      compactRef.current = nextValue;
      lastToggleTimeRef.current = getNow();

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

      suppressCompactUntilRef.current = getNow() + HORIZONTAL_GESTURE_SUPPRESSION_MS;
      downwardTravelRef.current = 0;
    };

    updateCompactState();
    const unsubscribeScroll = subscribeNavigationScroll(updateCompactState);
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

function blurActiveElement() {
  if (typeof document === 'undefined') return;
  document.activeElement?.blur?.();
}

export function useNavigationCore() {
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
      NAV_EVENT_HANDLERS.navigateStart(href, from);
      const confirmNavigation = () => {
        blurActiveElement();
        startLoading({ showOverlay: false });
        router.push(href);
        NAV_EVENT_HANDLERS.navigate(href, from);
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

      if (isSamePath(href, from)) {
        return true;
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
      NAV_EVENT_HANDLERS.navigateStart(href, from);
      router.push(href);
      NAV_EVENT_HANDLERS.navigate(href, from);

      return true;
    },
    [openGuardConfirmation, pathname, router, startLoading],
  );

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    NAV_EVENT_HANDLERS.navigateEnd(pathname, previousPathRef.current);
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

function resolveActiveIndex({ navigationItems, activeItem, pathname }) {
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
  return Math.max(0, matchedIndex);
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

  const prefixMatchedRawItem = rawItems
    .filter((item) => isPathPrefix(item.path, normalizedPathname))
    .sort((left, right) => normalizePath(right.path).length - normalizePath(left.path).length)[0];

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

function applyStatusOverlay(item, statusState) {
  if (!item || !statusState) {
    return item;
  }

  const showStatusActions = statusState.type === 'APP_ERROR' || statusState.type === 'API_ERROR';

  return {
    ...item,
    ...statusState,
    activeChild: null,
    children: null,
    hasActiveChild: false,
    isExpanded: false,
    isParent: false,
    isStatus: true,
    badge: null,
    iconOverlay: null,
    action: showStatusActions ? statusState.action : null,
    actions: showStatusActions ? statusState.actions : null,
  };
}

function applySurface(
  item,
  rawSurfaceEntry,
  closeSurface,
  closeAllSurfaces,
  goBackSurface,
  pushStep,
  popStep,
  goToStep,
  handleSurfaceAnimationComplete,
  surfaceStack = [],
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
    return applySurface(
      baseActiveItem,
      surfaceState.activeSurfaceEntry,
      (result) => closeSurface(result, surfaceState.activeSurfaceId),
      closeAllSurfaces,
      goBackSurface,
      pushStep,
      popStep,
      goToStep,
      handleSurfaceAnimationComplete,
      surfaceStack,
    );
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
    return applySurface(
      itemWithMediaAction,
      inlineSurface,
      closeSurface,
      closeAllSurfaces,
      goBackSurface,
      pushStep,
      popStep,
      goToStep,
      handleSurfaceAnimationComplete,
      surfaceStack,
    );
  }

  return itemWithMediaAction;
}

function hasActiveItemChanged(currentItem, previousItem) {
  return (
    currentItem?.path !== previousItem?.path ||
    currentItem?.name !== previousItem?.name ||
    currentItem?.type !== previousItem?.type ||
    currentItem?.isLoading !== previousItem?.isLoading ||
    currentItem?.isOverlay !== previousItem?.isOverlay ||
    currentItem?.isSurface !== previousItem?.isSurface ||
    currentItem?.title !== previousItem?.title ||
    currentItem?.surfaceComponent !== previousItem?.surfaceComponent ||
    currentItem?.surfaceContent !== previousItem?.surfaceContent ||
    currentItem?.surfaceProps !== previousItem?.surfaceProps ||
    currentItem?.stepIndex !== previousItem?.stepIndex ||
    currentItem?.totalSteps !== previousItem?.totalSteps ||
    currentItem?.action !== previousItem?.action
  );
}

function hasDisplayResultChanged(currentResult, previousResult) {
  return (
    currentResult.navigationItems !== previousResult.navigationItems ||
    currentResult.activeIndex !== previousResult.activeIndex ||
    currentResult.statusState !== previousResult.statusState ||
    currentResult.attention !== previousResult.attention ||
    hasActiveItemChanged(currentResult.activeItem, previousResult.activeItem)
  );
}

export function useNavigationDisplay() {
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

  const result = useMemo(() => {
    return {
      navigationItems,
      activeItem,
      activeIndex,
      statusState,
      attention,
    };
  }, [navigationItems, activeItem, activeIndex, statusState, attention]);

  const lastResultRef = useRef(null);

  return useMemo(() => {
    const previousResult = lastResultRef.current;

    if (!previousResult || hasDisplayResultChanged(result, previousResult)) {
      lastResultRef.current = result;
      return result;
    }

    return previousResult;
  }, [result]);
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

export function useNavigationItems() {
  const { getAll } = useNavRegistry();

  const rawItems = useMemo(() => {
    return Object.values(getAll()).map(stripChildrenSystemFields);
  }, [getAll]);

  return { rawItems };
}

const MAX_VISIBLE_STACKED_CARDS = 3;

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

function findActiveIndex(items, activeItem, pathname) {
  let index = items.findIndex((item) => item.isDataSource && item.isSelected);

  if (index !== -1) {
    return index;
  }

  if (activeItem) {
    index = items.findIndex(
      (item) =>
        (item.path && item.path === activeItem.path) ||
        (item.name && item.name === activeItem.name),
    );

    if (index !== -1) {
      return index;
    }
  }

  return items.findIndex((item) => item.path === pathname);
}

function replaceActiveItem(items, activeIndex, activeItem) {
  if (activeIndex === -1 || !activeItem) {
    return items;
  }

  const nextItems = [...items];
  nextItems[activeIndex] = activeItem;
  return nextItems;
}

function isSameItem(item, candidate) {
  return (
    (item?.path && item.path === candidate?.path) || (item?.name && item.name === candidate?.name)
  );
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

function getCollapsedVisibleCount({ isCompact, shouldShowSingleStatusCard }) {
  if (shouldShowSingleStatusCard || isCompact) {
    return 1;
  }

  return MAX_VISIBLE_STACKED_CARDS;
}

export function useNavigationLayout({
  isHovered,
  isCompact = false,
  navigationItems,
  activeItem,
} = {}) {
  const pathname = usePathname();
  const { expanded } = useNavigationState();

  const { displayItems, displayActiveIndex } = useMemo(() => {
    const shouldShowOverlayStack = activeItem?.isSurface;
    const shouldShowSingleStatusCard = Boolean(activeItem?.isStatus);

    const activeIndex = findActiveIndex(navigationItems, activeItem, pathname);

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
  }, [pathname, expanded, isHovered, isCompact, navigationItems, activeItem]);

  return {
    displayItems,
    activeIndex: displayActiveIndex,
    MAX_VISIBLE_STACKED_CARDS,
  };
}

export function useNavigationRouteReset(pathname, onRouteChange) {
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    if (previousPathRef.current === pathname) return;

    previousPathRef.current = pathname;
    onRouteChange?.(pathname);
  }, [onRouteChange, pathname]);
}

const EMPTY_SNAPSHOT = Object.freeze({
  scrollY: 0,
  scrollableHeight: 0,
  viewportHeight: 0,
  progress: 0,
});

let snapshot = EMPTY_SNAPSHOT;
let frameId = null;
const listeners = new Set();

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

function publish() {
  frameId = null;
  const nextSnapshot = readSnapshot();
  if (
    nextSnapshot.scrollY === snapshot.scrollY &&
    nextSnapshot.scrollableHeight === snapshot.scrollableHeight &&
    nextSnapshot.viewportHeight === snapshot.viewportHeight
  ) {
    return;
  }

  snapshot = Object.freeze(nextSnapshot);
  listeners.forEach((listener) => listener());
}

function queuePublish() {
  if (frameId !== null || typeof window === 'undefined') return;
  frameId = window.requestAnimationFrame(publish);
}

function subscribe(listener) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    snapshot = Object.freeze(readSnapshot());
    window.addEventListener('scroll', queuePublish, { passive: true });
    window.addEventListener('resize', queuePublish, { passive: true });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || typeof window === 'undefined') return;
    window.removeEventListener('scroll', queuePublish);
    window.removeEventListener('resize', queuePublish);
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
  };
}

export const subscribeNavigationScroll = subscribe;

export function useNavigationScrollSnapshot() {
  return useSyncExternalStore(subscribe, () => snapshot, () => EMPTY_SNAPSHOT);
}

export function useNavigationStatus() {
  const pathname = usePathname();
  const { notFoundAction } = useNavRuntimeRegistry();
  const [status, setStatus] = useState(null);

  const previousPathRef = useRef(pathname);
  const apiErrorQueueRef = useRef([]);
  const skipPersistedStatusCleanupRef = useRef(false);

  const batchTimerRef = useRef(null);
  const statusClearTimerRef = useRef(null);
  const onlineResetTimerRef = useRef(null);
  const offlineDispatchTimerRef = useRef(null);

  const clearTimer = useCallback((timerRef) => {
    if (!timerRef.current) {
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const clearTransientTimers = useCallback(() => {
    clearTimer(batchTimerRef);
    clearTimer(onlineResetTimerRef);
    clearTimer(offlineDispatchTimerRef);
  }, [clearTimer]);

  const clearAllTimers = useCallback(() => {
    clearTransientTimers();
    clearTimer(statusClearTimerRef);
  }, [clearTimer, clearTransientTimers]);

  const clearStatus = useCallback(() => {
    clearPersistedAuthStatus();
    setStatus(null);
  }, []);

  const updateStatus = useCallback((nextStatus) => {
    setStatus((currentStatus) => {
      if (!nextStatus) {
        return null;
      }

      const isAuthStatus = ['LOGIN', 'LOGOUT', 'SIGNUP'].includes(nextStatus.type);
      if (
        currentStatus &&
        isAuthStatus &&
        currentStatus.type === nextStatus.type &&
        currentStatus.flow === nextStatus.flow &&
        currentStatus.title === nextStatus.title &&
        currentStatus.description === nextStatus.description &&
        currentStatus.isOverlay === nextStatus.isOverlay
      ) {
        return currentStatus;
      }

      if (!currentStatus) {
        return nextStatus;
      }

      return resolveStatusPriority(nextStatus) >= resolveStatusPriority(currentStatus)
        ? nextStatus
        : currentStatus;
    });
  }, []);

  const scheduleStatusClear = useCallback(
    ({ duration = STATUS_CLEAR_DURATION, clearWhen = [] } = {}) => {
      clearTimer(statusClearTimerRef);

      const clearTypes = Array.isArray(clearWhen) ? clearWhen.filter(Boolean) : [];

      statusClearTimerRef.current = setTimeout(() => {
        statusClearTimerRef.current = null;

        setStatus((currentStatus) => {
          if (!currentStatus) {
            return currentStatus;
          }

          if (clearTypes.length === 0 || clearTypes.includes(currentStatus.type)) {
            clearPersistedAuthStatus();
            return null;
          }

          return currentStatus;
        });
      }, duration);
    },
    [clearTimer],
  );

  const dispatchOfflineEvent = useCallback(() => {
    clearTimer(offlineDispatchTimerRef);

    offlineDispatchTimerRef.current = setTimeout(() => {
      offlineDispatchTimerRef.current = null;
      window.dispatchEvent(new Event('offline'));
    }, 0);
  }, [clearTimer]);

  const handleOffline = useCallback(() => {
    updateStatus(createConnectionStatus('OFFLINE'));
  }, [updateStatus]);

  const handleOnline = useCallback(() => {
    setStatus((currentStatus) => {
      if (currentStatus?.type !== 'OFFLINE') {
        return null;
      }

      clearTimer(onlineResetTimerRef);

      onlineResetTimerRef.current = setTimeout(() => {
        onlineResetTimerRef.current = null;
        setStatus((nextStatus) => (nextStatus?.type === 'ONLINE' ? null : nextStatus));
      }, STATUS_CLEAR_DURATION);

      return createConnectionStatus('ONLINE');
    });
  }, [clearTimer]);

  useEffect(() => {
    const persistedStatus = restorePersistedAuthStatus();

    if (!persistedStatus) {
      return;
    }

    skipPersistedStatusCleanupRef.current = true;
    setStatus((currentStatus) => currentStatus || persistedStatus.status);
    scheduleStatusClear({
      duration: persistedStatus.remainingMs,
      clearWhen: [persistedStatus.status.type],
    });
  }, [scheduleStatusClear]);

  useEffect(() => {
    if (skipPersistedStatusCleanupRef.current) {
      skipPersistedStatusCleanupRef.current = false;
      return;
    }

    if (isPersistableAuthStatus(status)) {
      return;
    }

    clearPersistedAuthStatus();
  }, [status]);

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    previousPathRef.current = pathname;

    setStatus((currentStatus) => {
      if (
        currentStatus &&
        isErrorStatus(currentStatus.type) &&
        currentStatus.type !== 'ACCOUNT_DELETE'
      ) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          dispatchOfflineEvent();
        }

        return null;
      }

      return currentStatus;
    });
  }, [pathname, dispatchOfflineEvent]);

  useEffect(() => {
    const unsubscribeApiError = globalEvents.subscribe(EVENT_TYPES.API_ERROR, (eventData) => {
      const { status: errorStatus, message, isCritical, retry } = eventData || {};

      if (!isCritical) {
        return;
      }

      apiErrorQueueRef.current.push({
        status: errorStatus,
        message,
        retry,
      });

      clearTimer(batchTimerRef);

      batchTimerRef.current = setTimeout(() => {
        const errors = [...apiErrorQueueRef.current];
        apiErrorQueueRef.current = [];

        if (errors.length === 0) {
          return;
        }

        const isBatch = errors.length > 1;
        const title = isBatch
          ? 'Multiple API Errors'
          : `API Error (${errors[0].status || 'Network'})`;
        const description = isBatch
          ? `${errors.length} requests failed`
          : errors[0].message || 'An error occurred during the request';

        updateStatus(
          createErrorStatus({
            type: 'API_ERROR',
            title,
            description,
            icon: 'solar:danger-triangle-bold',
            onRetry: () => {
              errors.forEach((error) => error.retry?.());
            },
            style: getStatusTheme('API_ERROR'),
            clearStatus,
          }),
        );
      }, API_ERROR_BATCH_DELAY);
    });

    const unsubscribeAppError = globalEvents.subscribe(EVENT_TYPES.APP_ERROR, (eventData) => {
      const { message, error, resetError } = eventData || {};

      updateStatus(
        createErrorStatus({
          type: 'APP_ERROR',
          title: error?.name || 'Application Error',
          description: error?.message || message || 'An unexpected error occurred',
          icon: 'solar:danger-triangle-bold',
          onRetry: resetError
            ? () => {
                resetError();

                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                  dispatchOfflineEvent();
                }
              }
            : undefined,
          style: getStatusTheme('APP_ERROR'),
          clearStatus,
        }),
      );
    });

    const unsubscribeSignOut = globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_OUT, (eventData) => {
      const isAccountDelete = eventData?.reason === 'delete-account';
      const user = eventData?.previousSession?.user || null;

      if (!user && !isAccountDelete) {
        return;
      }

      const type = isAccountDelete ? 'ACCOUNT_DELETE' : 'LOGOUT';
      const nextStatus = createAuthStatus({
        type,
        user,
        description: isAccountDelete ? 'Account deleted' : 'Signed out',
      });

      updateStatus(nextStatus);

      scheduleStatusClear({
        duration: AUTH_STATUS_CLEAR_DURATION,
        clearWhen: [type],
      });

      if (!isAccountDelete) {
        persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
      }
    });

    const unsubscribeAccountDeleteStart = globalEvents.subscribe(
      EVENT_TYPES.AUTH_ACCOUNT_DELETE_START,
      (eventData) => {
        const user = eventData?.user || null;

        clearTimer(statusClearTimerRef);

        updateStatus(
          createOverlayStatus({
            type: 'ACCOUNT_DELETE',
            title: user?.name || user?.email || 'Account',
            description: 'Deleting account. This may take a few seconds',
            icon: createProgressIcon(),
            style: getStatusTheme('ACCOUNT_DELETE'),
          }),
        );
      },
    );

    const unsubscribeAccountDeleteEnd = globalEvents.subscribe(
      EVENT_TYPES.AUTH_ACCOUNT_DELETE_END,
      (eventData) => {
        if (eventData?.status !== 'failure') {
          return;
        }

        clearTimer(statusClearTimerRef);

        setStatus((currentStatus) =>
          currentStatus?.type === 'ACCOUNT_DELETE' ? null : currentStatus,
        );
      },
    );

    const unsubscribeSignIn = globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_IN, (eventData) => {
      const user = eventData?.session?.user;

      if (!user) {
        return;
      }

      const nextStatus = createAuthStatus({
        type: 'LOGIN',
        user,
        titleFallback: 'User',
        description: 'Signed in',
      });

      updateStatus(nextStatus);

      scheduleStatusClear({
        duration: AUTH_STATUS_CLEAR_DURATION,
        clearWhen: ['LOGIN'],
      });

      persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
    });

    const unsubscribeSignUp = globalEvents.subscribe(EVENT_TYPES.AUTH_SIGN_UP, (eventData) => {
      const user = eventData?.session?.user;

      if (!user) {
        return;
      }

      const nextStatus = createAuthStatus({
        type: 'SIGNUP',
        user,
        description: 'Setting up account',
      });

      updateStatus(nextStatus);

      scheduleStatusClear({
        duration: AUTH_STATUS_CLEAR_DURATION,
        clearWhen: ['SIGNUP'],
      });

      persistAuthStatus(nextStatus, AUTH_STATUS_CLEAR_DURATION);
    });

    const unsubscribeAuthFeedback = globalEvents.subscribe(
      EVENT_TYPES.AUTH_FEEDBACK,
      (eventData) => {
        const { flow, phase, statusType } = normalizeAuthFeedback(eventData);

        if (!phase) {
          return;
        }

        if (phase === 'clear' || phase === 'failure') {
          clearTimer(statusClearTimerRef);
          setStatus((currentStatus) => {
            if (!currentStatus) {
              return currentStatus;
            }

            if (flow && currentStatus.flow === flow) {
              return null;
            }

            return currentStatus.type === statusType ? null : currentStatus;
          });
          return;
        }

        updateStatus(createAuthFeedbackStatus(eventData));

        if (phase === 'success') {
          scheduleStatusClear({
            duration:
              Number(eventData?.duration) > 0
                ? Number(eventData.duration)
                : AUTH_STATUS_CLEAR_DURATION,
            clearWhen: [statusType],
          });
          return;
        }

        clearTimer(statusClearTimerRef);
      },
    );

    const unsubscribeNotFound = globalEvents.subscribe(EVENT_TYPES.NAV_NOT_FOUND, (eventData) => {
      if (eventData?.clear) {
        setStatus((currentStatus) => (currentStatus?.type === 'NOT_FOUND' ? null : currentStatus));
        return;
      }

      updateStatus({
        type: 'NOT_FOUND',
        path: 'not-found',
        isOverlay: true,
        title: eventData?.title || '404',
        description:
          eventData?.description ||
          'The page you are looking for does not exist or is no longer available',
        icon: eventData?.icon || 'solar:forbidden-circle-bold',
        style: getStatusTheme('NOT_FOUND'),
        action: notFoundAction
          ? () => {
              const NotFoundAction = notFoundAction;
              return <NotFoundAction />;
            }
          : null,
        hideScroll: true,
      });
    });

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline();
    }

    return () => {
      unsubscribeApiError();
      unsubscribeAppError();
      unsubscribeSignOut();
      unsubscribeAccountDeleteStart();
      unsubscribeAccountDeleteEnd();
      unsubscribeSignIn();
      unsubscribeSignUp();
      unsubscribeAuthFeedback();
      unsubscribeNotFound();

      clearTransientTimers();

      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [
    clearTransientTimers,
    clearStatus,
    clearTimer,
    dispatchOfflineEvent,
    handleOffline,
    handleOnline,
    scheduleStatusClear,
    updateStatus,
    notFoundAction,
  ]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return status;
}

function resolveSurfaceEntry(entry, payloadMap) {
  if (!entry) return null;
  return {
    ...(payloadMap?.get(entry.payloadId) || {}),
    ...entry,
  };
}

function createSurfaceState(surfaceStack = [], payloadMap = null) {
  const activeSurfaceMetadata = surfaceStack[surfaceStack.length - 1] || null;
  const activeSurface = resolveSurfaceEntry(activeSurfaceMetadata, payloadMap);

  return {
    activeSurfaceId: activeSurface?.id || null,
    isSurfaceOpen: surfaceStack.length > 0,
    activeSurfaceEntry: activeSurface || null,
    surfaceStack,
  };
}

const INITIAL_SURFACE_STATE = createSurfaceState([]);

export function createPendingSurfaceScheduler({
  clearTimer = clearTimeout,
  scheduleTimer = setTimeout,
} = {}) {
  const timers = new Map();

  const cancel = (surfaceId) => {
    if (!timers.has(surfaceId)) {
      return false;
    }

    clearTimer(timers.get(surfaceId));
    timers.delete(surfaceId);
    return true;
  };

  return {
    cancel,
    cancelAll() {
      const surfaceIds = [...timers.keys()];
      surfaceIds.forEach(cancel);
      return surfaceIds;
    },
    getLatestId() {
      const surfaceIds = [...timers.keys()];
      return surfaceIds[surfaceIds.length - 1] || null;
    },
    schedule(surfaceId, callback, delayMs) {
      cancel(surfaceId);
      const timerId = scheduleTimer(() => {
        timers.delete(surfaceId);
        callback();
      }, delayMs);
      timers.set(surfaceId, timerId);
    },
    get size() {
      return timers.size;
    },
  };
}

function createSurfaceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getSurfaceUrlValue(surfaceEntry) {
  if (typeof surfaceEntry?.syncWithUrl === 'string') return surfaceEntry.syncWithUrl;
  return surfaceEntry?.urlKey || 'open';
}

function syncSurfaceUrl(surfaceEntry, isOpening, urlState = null) {
  if (typeof window === 'undefined') return;
  if (!surfaceEntry?.syncWithUrl && !surfaceEntry?.urlKey) return;

  try {
    const url = new URL(window.location.href);
    if (isOpening) {
      const surfaceParam = getSurfaceUrlValue(surfaceEntry);
      if (urlState) urlState.previousValue = url.searchParams.get('surface');
      url.searchParams.set('surface', surfaceParam);
      window.history.pushState(
        { ...window.history.state, navSurface: { value: surfaceParam } },
        '',
        url.toString(),
      );
    } else {
      const currentValue = url.searchParams.get('surface');
      if (urlState?.value && currentValue !== urlState.value) return;
      if (urlState?.previousValue) {
        url.searchParams.set('surface', urlState.previousValue);
      } else {
        url.searchParams.delete('surface');
      }
      window.history.replaceState(window.history.state, '', url.toString());
      return;
    }
  } catch (_error) {

  }
}

export function useSurfaceStack({ setCompactLock, setExpanded, setSearchQuery }) {
  const [surfaceState, setSurfaceState] = useState(INITIAL_SURFACE_STATE);
  const [navigationMachine, dispatchNavigation] = useReducer(
    navigationStateReducer,
    undefined,
    createNavigationMachineState,
  );

  const surfaceStackRef = useRef([]);
  const surfacePayloadMapRef = useRef(new Map());
  const surfaceResolveMapRef = useRef(new Map());
  const surfaceOnCloseMapRef = useRef(new Map());
  const surfaceUrlStateMapRef = useRef(new Map());
  const surfaceIdRef = useRef(0);
  const isCompactRef = useRef(false);
  const wasCompactRef = useRef(false);
  const compactUnlockTimerRef = useRef(null);
  const pendingSurfaceSchedulerRef = useRef(null);

  if (pendingSurfaceSchedulerRef.current === null) {
    pendingSurfaceSchedulerRef.current = createPendingSurfaceScheduler();
  }

  const setIsCompact = useCallback((compactVal) => {
    isCompactRef.current = compactVal;
    dispatchNavigation({ type: NAVIGATION_EVENTS.SET_COMPACT, value: compactVal });
  }, []);

  const syncSurfaceStack = useCallback((nextStack) => {
    surfaceStackRef.current = nextStack;
    setSurfaceState(createSurfaceState(nextStack, surfacePayloadMapRef.current));
  }, []);

  const finalizeSurfaceClose = useCallback((surfaceId, result) => {
    const targetEntry = surfaceStackRef.current.find((entry) => entry.id === surfaceId);
    if (targetEntry) {
      syncSurfaceUrl(targetEntry, false, surfaceUrlStateMapRef.current.get(surfaceId));
      surfacePayloadMapRef.current.delete(targetEntry.payloadId);
    }
    surfaceUrlStateMapRef.current.delete(surfaceId);

    const onClose = surfaceOnCloseMapRef.current.get(surfaceId);

    if (typeof onClose === 'function') {
      try {
        onClose(result);
      } catch (error) {
        console.error('Nav surface onClose handler failed:', error);
      }
    }

    surfaceOnCloseMapRef.current.delete(surfaceId);
    dispatchNavigation({ type: NAVIGATION_EVENTS.CLOSE_SURFACE, surfaceId });

    const resolve = surfaceResolveMapRef.current.get(surfaceId);

    if (typeof resolve === 'function') {
      resolve(result);
    }

    surfaceResolveMapRef.current.delete(surfaceId);
  }, []);

  const unlockCompactAfterSurfaceClose = useCallback(() => {
    if (!wasCompactRef.current) {
      return;
    }

    if (compactUnlockTimerRef.current !== null) {
      clearTimeout(compactUnlockTimerRef.current);
    }

    compactUnlockTimerRef.current = setTimeout(() => {
      compactUnlockTimerRef.current = null;
      wasCompactRef.current = false;
      setCompactLock('surface-opening', false);
    }, NAV_SURFACE_EXIT_SETTLE_MS);
  }, [setCompactLock]);

  const handleSurfaceAnimationComplete = useCallback(
    (definition) => {
      if (definition !== 'exit' || !wasCompactRef.current) return;
      if (compactUnlockTimerRef.current !== null) {
        clearTimeout(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }
      wasCompactRef.current = false;
      setCompactLock('surface-opening', false);
    },
    [setCompactLock],
  );

  const pushStep = useCallback(
    (stepInput, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = targetSurfaceId || currentStack[currentStack.length - 1]?.id;
      if (!activeSurfaceId) return;

      const nextStack = currentStack.map((entry) => {
        if (entry.id !== activeSurfaceId) return entry;
        const resolvedEntry = resolveSurfaceEntry(entry, surfacePayloadMapRef.current);
        const initialStep = {
          component: resolvedEntry.component,
          content: resolvedEntry.content,
          props: resolvedEntry.props,
          title: resolvedEntry.title,
          description: resolvedEntry.description,
          icon: resolvedEntry.icon,
          trailing: resolvedEntry.trailing,
          headerAction: resolvedEntry.headerAction,
          action: resolvedEntry.action,
          showAction: resolvedEntry.showAction,
          closeLabel: resolvedEntry.closeLabel,
        };
        const currentSteps =
          Array.isArray(resolvedEntry.steps) && resolvedEntry.steps.length > 0
            ? [...resolvedEntry.steps]
            : [initialStep];
        const nextSteps = [...currentSteps, stepInput];
        const nextIndex = nextSteps.length - 1;
        surfacePayloadMapRef.current.set(entry.payloadId, {
          ...surfacePayloadMapRef.current.get(entry.payloadId),
          steps: nextSteps,
        });
        return {
          ...entry,
          currentStepIndex: nextIndex,
        };
      });

      syncSurfaceStack(nextStack);
    },
    [syncSurfaceStack],
  );

  const popStep = useCallback(
    (targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = targetSurfaceId || currentStack[currentStack.length - 1]?.id;
      if (!activeSurfaceId) return;

      const targetEntry = currentStack.find((entry) => entry.id === activeSurfaceId);
      if (!targetEntry || !targetEntry.steps || (targetEntry.currentStepIndex || 0) <= 0) {
        return;
      }

      const nextStack = currentStack.map((entry) => {
        if (entry.id !== activeSurfaceId) return entry;
        return {
          ...entry,
          currentStepIndex: (entry.currentStepIndex || 0) - 1,
        };
      });

      syncSurfaceStack(nextStack);
    },
    [syncSurfaceStack],
  );

  const goToStep = useCallback(
    (index, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const activeSurfaceId = targetSurfaceId || currentStack[currentStack.length - 1]?.id;
      if (!activeSurfaceId) return;

      const targetEntry = currentStack.find((entry) => entry.id === activeSurfaceId);
      if (!targetEntry || !targetEntry.steps || index < 0 || index >= targetEntry.steps.length) {
        return;
      }

      const nextStack = currentStack.map((entry) => {
        if (entry.id !== activeSurfaceId) return entry;
        return {
          ...entry,
          currentStepIndex: index,
        };
      });

      syncSurfaceStack(nextStack);
    },
    [syncSurfaceStack],
  );

  const closeSurface = useCallback(
    (result = null, targetSurfaceId = null) => {
      const currentStack = surfaceStackRef.current;
      const pendingScheduler = pendingSurfaceSchedulerRef.current;
      const pendingSurfaceId = pendingScheduler.getLatestId();
      const activeSurfaceId = currentStack[currentStack.length - 1]?.id || null;
      const latestSurfaceId =
        pendingSurfaceId && (!activeSurfaceId || pendingSurfaceId > activeSurfaceId)
          ? pendingSurfaceId
          : activeSurfaceId;
      const surfaceId = targetSurfaceId || latestSurfaceId;

      if (!surfaceId) {
        return;
      }

      if (pendingScheduler.cancel(surfaceId)) {
        finalizeSurfaceClose(surfaceId, result);

        if (currentStack.length === 0 && pendingScheduler.size === 0) {
          unlockCompactAfterSurfaceClose();
        }
        return;
      }

      const surfaceToClose = currentStack.find((entry) => entry.id === surfaceId);

      if (!surfaceToClose) {
        return;
      }

      const nextStack = currentStack.filter((entry) => entry.id !== surfaceId);
      finalizeSurfaceClose(surfaceId, result);
      syncSurfaceStack(nextStack);

      if (nextStack.length === 0 && pendingScheduler.size === 0) {
        unlockCompactAfterSurfaceClose();
      }
    },
    [finalizeSurfaceClose, syncSurfaceStack, unlockCompactAfterSurfaceClose],
  );

  const goBackSurface = useCallback(() => {
    const currentStack = surfaceStackRef.current;
    const activeEntry = currentStack[currentStack.length - 1];

    if (!activeEntry) return;

    if ((activeEntry.currentStepIndex || 0) > 0) {
      popStep(activeEntry.id);
      return;
    }

    if (currentStack.length > 1) {
      closeSurface(null, activeEntry.id);
    }
  }, [closeSurface, popStep]);

  const closeAllSurfaces = useCallback(
    (result = null) => {
      const currentStack = [...surfaceStackRef.current];
      const pendingSurfaceIds = pendingSurfaceSchedulerRef.current.cancelAll();

      if (currentStack.length === 0 && pendingSurfaceIds.length === 0) {
        return;
      }

      currentStack.forEach((entry) => {
        finalizeSurfaceClose(entry.id, result);
      });
      pendingSurfaceIds.forEach((surfaceId) => {
        finalizeSurfaceClose(surfaceId, result);
      });

      dispatchNavigation({ type: NAVIGATION_EVENTS.CLOSE_ALL_SURFACES });

      if (currentStack.length > 0) {
        syncSurfaceStack([]);
      }

      unlockCompactAfterSurfaceClose();
    },
    [finalizeSurfaceClose, syncSurfaceStack, unlockCompactAfterSurfaceClose],
  );

  const openSurface = useCallback(
    (input, config = {}) => {
      const definition = createSurfaceEntryDefinition(input, config);

      if (!definition) {
        const error = createSurfaceError(
          'NAV_SURFACE_INVALID_COMPONENT',
          'Nav surface input is invalid',
        );
        console.error(error);
        return Promise.resolve({
          success: false,
          error,
        });
      }

      const surfaceId = ++surfaceIdRef.current;
      const {
        onClose,
        component,
        content,
        props,
        action,
        showAction,
        steps,
        trailing,
        headerAction,
        title,
        description,
        icon,
        closeLabel,
        ...surfaceMetadata
      } = definition;
      const payloadId = `surface-payload-${surfaceId}`;
      surfacePayloadMapRef.current.set(payloadId, {
        component,
        content,
        props,
        action,
        showAction,
        steps,
        trailing,
        headerAction,
        title,
        description,
        icon,
        closeLabel,
        onClose,
      });
      const surfaceEntry = {
        id: surfaceId,
        payloadId,
        ...surfaceMetadata,
      };

      setExpanded(false);
      setSearchQuery('');

      const runOpen = () => {
        const urlState = { value: getSurfaceUrlValue(surfaceEntry), previousValue: null };
        surfaceUrlStateMapRef.current.set(surfaceId, urlState);
        syncSurfaceUrl(surfaceEntry, true, urlState);
        dispatchNavigation({ type: NAVIGATION_EVENTS.OPEN_SURFACE, surfaceId });
        syncSurfaceStack([...surfaceStackRef.current, surfaceEntry]);
        dispatchNavigation({ type: NAVIGATION_EVENTS.SURFACE_MOUNTED });
      };

      const resultPromise = new Promise((resolve) => {
        surfaceResolveMapRef.current.set(surfaceId, resolve);
        surfaceOnCloseMapRef.current.set(surfaceId, onClose || null);
      });

      if (isCompactRef.current) {
        if (compactUnlockTimerRef.current !== null) {
          clearTimeout(compactUnlockTimerRef.current);
          compactUnlockTimerRef.current = null;
        }

        wasCompactRef.current = true;
        setCompactLock('surface-opening', true);
        pendingSurfaceSchedulerRef.current.schedule(
          surfaceId,
          runOpen,
          NAV_COMPACT_TO_SURFACE_DELAY_MS,
        );
      } else {
        runOpen();
      }

      return resultPromise;
    },
    [setCompactLock, setExpanded, setSearchQuery, syncSurfaceStack],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePopState = () => {
      const activeEntry = surfaceStackRef.current[surfaceStackRef.current.length - 1];
      if (!activeEntry?.syncWithUrl && !activeEntry?.urlKey) return;
      const expectedValue = getSurfaceUrlValue(activeEntry);
      if (new URL(window.location.href).searchParams.get('surface') === expectedValue) return;

      closeAllSurfaces({
        success: false,
        cancelled: true,
        reason: 'browser-back',
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeAllSurfaces]);

  useEffect(() => {
    const pendingScheduler = pendingSurfaceSchedulerRef.current;
    const resolveMap = surfaceResolveMapRef.current;
    const onCloseMap = surfaceOnCloseMapRef.current;
    const payloadMap = surfacePayloadMapRef.current;

    return () => {
      if (compactUnlockTimerRef.current !== null) {
        clearTimeout(compactUnlockTimerRef.current);
        compactUnlockTimerRef.current = null;
      }

      const surfaceIds = [
        ...surfaceStackRef.current.map((entry) => entry.id),
        ...pendingScheduler.cancelAll(),
      ];
      const result = {
        cancelled: true,
        reason: 'unmount',
        success: false,
      };

      surfaceIds.forEach((surfaceId) => {
        const targetEntry = surfaceStackRef.current.find((entry) => entry.id === surfaceId);
        if (targetEntry) {
          syncSurfaceUrl(targetEntry, false, surfaceUrlStateMapRef.current.get(surfaceId));
          payloadMap.delete(targetEntry.payloadId);
        }
        surfaceUrlStateMapRef.current.delete(surfaceId);

        const onClose = onCloseMap.get(surfaceId);
        try {
          onClose?.(result);
        } catch (error) {
          console.error('Nav surface onClose handler failed:', error);
        }
        onCloseMap.delete(surfaceId);

        resolveMap.get(surfaceId)?.(result);
        resolveMap.delete(surfaceId);
      });

      surfaceStackRef.current = [];
      payloadMap.clear();
    };
  }, []);

  return {
    closeAllSurfaces,
    closeSurface,
    goBackSurface,
    goToStep,
    handleSurfaceAnimationComplete,
    isCompact: navigationMachine.isCompact,
    openSurface,
    popStep,
    pushStep,
    setIsCompact,
    surfaceState: {
      ...surfaceState,
      surfaceLifecycle: navigationMachine.surfaceLifecycle,
    },
  };
}

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

  const activeItemHasAction = useMemo(() => {
    return Boolean(activeItem?.action);
  }, [activeItem]);

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
    isHovered,
    isCompact: compact,
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

const NOOP = () => {};
const DEFAULT_NAVIGATION_ACTIONS = Object.freeze({
  clearContextActions: NOOP,
  clearHud: NOOP,
  clearSelectionMode: NOOP,
  closeAllSurfaces: NOOP,
  closeSurface: NOOP,
  goBackSurface: NOOP,
  goToStep: NOOP,
  openSurface: NOOP,
  popStep: NOOP,
  pushStep: NOOP,
  registerContextAction: NOOP,
  setCompactLock: NOOP,
  setContextActions: NOOP,
  setExpanded: NOOP,
  setHud: NOOP,
  setIsCompact: NOOP,
  setNavHeight: NOOP,
  setSearchQuery: NOOP,
  setSelectionMode: NOOP,
  unregisterContextAction: NOOP,
  collapse: NOOP,
  expand: NOOP,
  toggle: NOOP,
});

const DEFAULT_NAVIGATION_STATE = Object.freeze({
  contextActions: [],
  hud: null,
  hudEntries: [],
  isHudActive: false,
  selectionMode: null,
  searchQuery: '',
  compactLocked: false,
  navHeight: 0,
  expanded: false,
  isCompact: false,
  surfaceState: null,
});
const NavigationActionsContext = createContext(null);
const NavigationStateContext = createContext(null);

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
    const nextExpanded =
      typeof nextValue === 'function' ? nextValue(navigationMachine.expanded) : nextValue;
    dispatchNavigation({
      type: nextExpanded ? NAVIGATION_EVENTS.EXPAND : NAVIGATION_EVENTS.COLLAPSE,
    });
  }, [navigationMachine.expanded]);
  const collapse = useCallback(() => dispatchNavigation({ type: NAVIGATION_EVENTS.COLLAPSE }), []);
  const expand = useCallback(() => dispatchNavigation({ type: NAVIGATION_EVENTS.EXPAND }), []);
  const toggle = useCallback(() => {
    dispatchNavigation({
      type: navigationMachine.expanded ? NAVIGATION_EVENTS.COLLAPSE : NAVIGATION_EVENTS.EXPAND,
    });
  }, [navigationMachine.expanded]);
  const setIsCompact = useCallback((value) => {
    dispatchNavigation({ type: NAVIGATION_EVENTS.SET_COMPACT, value });
  }, []);

  const setCompactLock = useCallback((lockId, isLocked) => {
    if (!lockId) return;

    setCompactLocks((previousLocks) => {
      const hasLock = Boolean(previousLocks[lockId]);

      if (isLocked) {
        return hasLock ? previousLocks : { ...previousLocks, [lockId]: true };
      }

      if (!hasLock) return previousLocks;

      const nextLocks = { ...previousLocks };
      delete nextLocks[lockId];
      return nextLocks;
    });
  }, []);

  const registerContextAction = useCallback((action) => {
    if (!action) return;
    const key = action.key || `context-action-${Date.now()}`;
    setContextActionsMap((prev) => ({
      ...prev,
      [key]: { key, ...action },
    }));
  }, []);

  const unregisterContextAction = useCallback((key) => {
    if (!key) return;
    setContextActionsMap((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setContextActions = useCallback((actions) => {
    if (!actions) {
      setContextActionsMap({});
      return;
    }
    const actionList = Array.isArray(actions) ? actions : [actions];
    const map = {};
    actionList.forEach((action, index) => {
      const key = action.key || `context-action-${index}`;
      map[key] = { key, ...action };
    });
    setContextActionsMap(map);
  }, []);

  const clearContextActions = useCallback(() => {
    setContextActionsMap({});
  }, []);

  const setHud = useCallback((descriptor) => {
    const definition = createHudDefinition(descriptor);
    setHudEntries((previousEntries) => {
      if (!definition) return previousEntries;
      const previousDefinition = previousEntries[definition.id];
      if (
        previousDefinition &&
        previousDefinition.renderMode === definition.renderMode &&
        previousDefinition.isActive === definition.isActive &&
        previousDefinition.component === definition.component &&
        previousDefinition.content === definition.content &&
        previousDefinition.onCancel === definition.onCancel &&
        previousDefinition.priority === definition.priority &&
        JSON.stringify(previousDefinition.props) === JSON.stringify(definition.props)
      ) {
        return previousEntries;
      }
      return {
        ...previousEntries,
        [definition.id]: definition,
      };
    });
  }, []);

  const clearHud = useCallback((targetId) => {
    setHudEntries((previousEntries) => {
      if (!targetId) {
        return Object.keys(previousEntries).length === 0 ? previousEntries : {};
      }

      if (!previousEntries[targetId]) return previousEntries;

      const nextEntries = { ...previousEntries };
      delete nextEntries[targetId];
      return nextEntries;
    });
  }, []);

  const setSelectionMode = useCallback((config) => {
    setSelectionModeState((prev) => {
      if (!config) {
        return prev === null ? prev : null;
      }
      const nextActive = config.isActive !== false;
      const nextCount = Number(config.count) || 0;
      const nextTitle = config.title || null;
      const nextActions = Array.isArray(config.actions) ? config.actions : [];
      const nextOnCancel = typeof config.onCancel === 'function' ? config.onCancel : null;

      if (
        prev &&
        prev.isActive === nextActive &&
        prev.count === nextCount &&
        prev.title === nextTitle &&
        prev.onCancel === nextOnCancel &&
        prev.actions.length === nextActions.length &&
        prev.actions.every((a, idx) => {
          const b = nextActions[idx];
          return (
            a.key === b?.key &&
            a.label === b?.label &&
            a.icon === b?.icon &&
            a.disabled === b?.disabled &&
            a.isDestructive === b?.isDestructive &&
            a.onClick === b?.onClick
          );
        })
      ) {
        return prev;
      }

      return {
        isActive: nextActive,
        count: nextCount,
        title: nextTitle,
        actions: nextActions,
        onCancel: nextOnCancel,
        priority: NAV_HUD_PRIORITY.SELECTION,
      };
    });
  }, []);

  const clearSelectionMode = useCallback(() => {
    setSelectionModeState((prev) => (prev === null ? prev : null));
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

  const compactLocked = Object.keys(compactLocks).length > 0;
  const contextActions = useMemo(() => Object.values(contextActionsMap), [contextActionsMap]);

  const activeHud = useMemo(
    () => resolveActiveHud([...Object.values(hudEntries), selectionModeState]),
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

export function useNavigationState() {
  const context = useContext(NavigationStateContext);
  return context ?? DEFAULT_NAVIGATION_STATE;
}

export function useNavigationActions() {
  const context = useContext(NavigationActionsContext);
  return context ?? DEFAULT_NAVIGATION_ACTIONS;
}

export function useNavigationContext() {
  const actions = useNavigationActions();
  const state = useNavigationState();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
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
        <div className="skeleton-block-soft h-3 w-full animate-pulse rounded-full" />
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
          {typeof SurfaceComponent === 'function' ? (
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
  expanded,
  isHovered,
  isStackHovered,
  itemStyle,
  badge,
  isActive,
  footerNode,
  footerRef,
  isHudActive = false,
}) {
  const { isVideo, isPlaying, videoElement } = useBackgroundState();
  const { toggleVideo, toggleMute } = useBackgroundActions();
  const showVideoIcon = shouldShowVideoIcon({ isActive, isVideo, link });
  const description = getItemDescription({ expanded, isHovered, link });
  const iconHoverState = expanded ? isHovered : isStackHovered;
  const isMuted = Boolean(videoElement?.muted);

  const videoMuteOverlay = useMemo(() => {
    if (!showVideoIcon) return null;
    return {
      icon: isMuted ? 'solar:volume-cross-bold' : 'solar:volume-loud-bold',
      onClick: (event) => {
        event?.stopPropagation?.();
        event?.preventDefault?.();
        toggleMute();
      },
      title: isMuted ? 'Unmute video' : 'Mute video',
    };
  }, [isMuted, showVideoIcon, toggleMute]);

  const effectiveIconOverlay = showVideoIcon ? videoMuteOverlay : link.iconOverlay;

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
            <div
              className={link.onClick || showVideoIcon ? 'relative cursor-pointer' : 'relative'}
              onClick={handleIconClick}
            >
              <BadgeIcon
                isStackHovered={iconHoverState}
                icon={showVideoIcon ? (isPlaying ? 'mdi:pause' : 'mdi:play') : link.icon}
                iconOverlay={effectiveIconOverlay}
                style={itemStyle.icon}
              />
            </div>
          ) : (
            <div className="h-12" />
          )}
          {!effectiveIconOverlay && <Badge badge={badge} />}
        </div>

        <div className="relative flex w-full flex-1 items-center justify-between gap-2.5 overflow-hidden">
          <div className="flex h-full min-w-0 flex-1 flex-col justify-center -space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Title
                text={link.title || link.name}
                style={{
                  ...itemStyle.title,
                  className: cn(itemStyle.title?.className, 'text-base'),
                }}
              />
            </div>
            <Description text={description} style={itemStyle.description} />
          </div>
          {isTop ? <NavActionsContainer activeItem={link} /> : null}
        </div>
      </div>

      {footerNode ? (
        <div
          key="nav-surface-footer"
          ref={footerRef}
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
      stackWidth,
      cardWidth: cardWidthProp,
      containerHeight,
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
    const cardWidth =
      cardWidthProp ||
      (compact ? estimateCompactCardWidth(link.title || link.name, stackWidth) : stackWidth);

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
      if (link.isSurface) return <SurfaceItemContent link={link} />;

      return (
        <StandardItemContent
          link={link}
          compact={compact}
          isTop={isTop}
          expanded={expanded}
          isHovered={isHovered}
          isStackHovered={isStackHovered}
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
          footerRef={null}
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
      showBorder,
      cardStyle: itemStyle.card,
      cardScale: itemStyle.scale,
      cardWidth,
      containerHeight,
      isAnchoredToBottom: link.isSurface,
      globalCompact,
      compact,
      pathname,
      isHovered,
      isStackHovered,
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
                <Title
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
  const activeItemLayoutKey = useMemo(
    () => `${getActiveItemLayoutKey(activeItem)}:${isHudActive ? 'hud' : 'normal'}`,
    [activeItem, isHudActive],
  );

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
    activeItemIsOverlay: isOverlayActive,
    activeItemLayoutKey,
    compact: isTopItemCompact,
    isHud: isHudActive,
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

  const visibleNavigationItems = expanded
    ? navigationItems
    : navigationItems.slice(0, compact ? 1 : 3);

  const renderedNavItems = visibleNavigationItems.map((link, index) => {
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
        totalItems={visibleNavigationItems.length}
        statusStyle={statusStyle}
        isHudActive={isHudActive}
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

export const MotionButton = NavMotionButton;
export const Soundwave = NavSoundwave;
export const MediaScrubber = NavMediaScrubber;
export const MediaControls = NavMediaControls;
export const NavBreadcrumbs = NavBreadcrumbsBar;
export { NavSurfaceShell as defaultSurfaceShell };
