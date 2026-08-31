'use client';

import { useCallback, useMemo } from 'react';

import { normalizeFeedbackText } from '@/shared';
import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared';

import { TOAST_TYPES, useNotificationActions } from './store';

// -----------------------------------------------------------------------------
// Notification motion contract
// -----------------------------------------------------------------------------
// Toast motion is kept as data so the view layer consumes one consistent
// language for enter, exit, drag, and press interactions.
const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.EXIT,
});

const NOTIFICATION_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, scaleDelta: 0.008, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  FAST: { duration: 0.44, distance: 9, scaleDelta: 0.012, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.66, distance: 18, scaleDelta: 0.018, ease: NOTIFICATION_EASINGS.SOFT },
});

function toGpuTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

export const NOTIFICATION_MICRO_SPRING = MOTION_SPRINGS.PRESS;
export const NOTIFICATION_MICRO_TAP_SCALE = 0.97;

export const NOTIFICATION_DRAG_CONSTRAINTS = Object.freeze({ left: 0, right: 0 });
export const NOTIFICATION_DRAG_ELASTIC = Object.freeze({ left: 0.05, right: 0.7 });
export const NOTIFICATION_WHILE_DRAG = Object.freeze({ scale: 0.98 });
export const NOTIFICATION_CLOSE_TAP = Object.freeze({
  transform: toGpuTransform({ scale: NOTIFICATION_MICRO_TAP_SCALE }),
});
export const NOTIFICATION_ACTION_TAP = Object.freeze({
  transform: toGpuTransform({ scale: NOTIFICATION_MICRO_TAP_SCALE }),
});
export const NOTIFICATION_ACTION_TRANSITION = MOTION_SPRINGS.PRESS;

export const notificationContentVariants = Object.freeze({
  hidden: { opacity: 0, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.SOFT,
      delay: 0.06,
    },
  },
  exit: {
    opacity: 0,
    filter: 'blur(3px)',
    transition: { duration: 0.38, ease: NOTIFICATION_EASINGS.EXIT },
  },
});

export const toastVariants = Object.freeze({
  hidden: {
    opacity: 0,
    transform: toGpuTransform({
      x: NOTIFICATION_TIERS.STANDARD.distance,
      scale: 1 - NOTIFICATION_TIERS.STANDARD.scaleDelta,
    }),
    filter: 'blur(6px)',
  },
  visible: {
    opacity: 1,
    transform: toGpuTransform(),
    filter: 'blur(0px)',
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.EMPHASIZED,
    },
  },
  exit: {
    opacity: 0,
    transform: toGpuTransform({ x: 28, scale: 0.976 }),
    filter: 'blur(4px)',
    transition: { duration: 0.38, ease: NOTIFICATION_EASINGS.EXIT },
  },
});

export const TOAST_VARIANTS = toastVariants;
export const NOTIFICATION_CONTENT_VARIANTS = notificationContentVariants;

// -----------------------------------------------------------------------------
// Toast policy
// -----------------------------------------------------------------------------
const DURATIONS = Object.freeze({
  SHORT: 3000,
  DEFAULT: 4000,
  LONG: 5000,
});

function withDefaultDuration(duration, options = {}) {
  return {
    duration,
    ...(options || {}),
  };
}

const PRODUCTION_OPTIONAL_TOAST_TYPES = new Set([TOAST_TYPES.SUCCESS, TOAST_TYPES.INFO]);

function isSuppressedToastMessage(message) {
  const normalized = String(message || '')
    .trim()
    .toLowerCase();
  return (
    normalized.includes('profile is private') || normalized.includes('this profile is private')
  );
}

function shouldSuppressToast(type, options = {}, message = '') {
  if (isSuppressedToastMessage(message)) return true;

  if (process.env.NODE_ENV !== 'production') return false;
  if (!PRODUCTION_OPTIONAL_TOAST_TYPES.has(type)) return false;

  return options.allowInProduction !== true;
}

// -----------------------------------------------------------------------------
// Public toast facade
// -----------------------------------------------------------------------------
// useToast turns a small message-oriented interface into a normalized
// notification entry while keeping environment and dedupe policy local.
export function useToast() {
  const { showNotification } = useNotificationActions();

  const createToast = useCallback(
    (type, message, options = {}) => {
      const {
        action,
        actions,
        allowInProduction,
        dedupeKey,
        description,
        duration,
        id: explicitId,
        ...rest
      } = options;
      const normalizedMessage = normalizeFeedbackText(message);

      if (
        !normalizedMessage ||
        isSuppressedToastMessage(normalizedMessage) ||
        shouldSuppressToast(type, { allowInProduction }, normalizedMessage)
      ) {
        return null;
      }

      const finalActions = actions || (action ? [action] : undefined);
      const resolvedId = dedupeKey || explicitId || String(normalizedMessage).slice(0, 50);

      return showNotification(type, {
        ...rest,
        id: resolvedId,
        message: normalizedMessage,
        description: normalizeFeedbackText(description),
        duration,
        actions: finalActions,
      });
    },
    [showNotification],
  );

  return useMemo(
    () => ({
      success: (message, options = {}) =>
        createToast(TOAST_TYPES.SUCCESS, message, withDefaultDuration(DURATIONS.SHORT, options)),
      warning: (message, options = {}) =>
        createToast(TOAST_TYPES.WARNING, message, withDefaultDuration(DURATIONS.DEFAULT, options)),
      error: (message, options = {}) =>
        createToast(TOAST_TYPES.ERROR, message, withDefaultDuration(DURATIONS.DEFAULT, options)),
      info: (message, options = {}) =>
        createToast(TOAST_TYPES.INFO, message, withDefaultDuration(DURATIONS.SHORT, options)),
      show: (type, message, options = {}) => createToast(type, message, options),
    }),
    [createToast],
  );
}
