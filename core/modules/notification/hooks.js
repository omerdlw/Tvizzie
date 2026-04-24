'use client';

import { useCallback, useMemo } from 'react';

import { normalizeFeedbackText } from '@/core/utils';

import { useNotificationActions, TOAST_TYPES } from './context';

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

function generateToastId() {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

const PRODUCTION_OPTIONAL_TOAST_TYPES = new Set([TOAST_TYPES.SUCCESS, TOAST_TYPES.INFO]);

function shouldSuppressToast(type, options = {}) {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  if (!PRODUCTION_OPTIONAL_TOAST_TYPES.has(type)) {
    return false;
  }

  return options.allowInProduction !== true;
}

export function useToast() {
  const { showNotification } = useNotificationActions();

  const createToast = useCallback(
    (type, message, options = {}) => {
      const { action, actions, allowInProduction, dedupeKey, description, duration, ...rest } = options;
      const normalizedMessage = normalizeFeedbackText(message);

      if (!normalizedMessage || shouldSuppressToast(type, { allowInProduction })) {
        return null;
      }

      const finalActions = actions || (action ? [action] : undefined);
      const resolvedId = dedupeKey || rest.id || generateToastId();

      return showNotification(type, {
        id: resolvedId,
        message: normalizedMessage,
        description: normalizeFeedbackText(description),
        duration,
        actions: finalActions,
        ...rest,
      });
    },
    [showNotification]
  );

  return useMemo(
    () => ({
      success: (msg, opts = {}) =>
        createToast(TOAST_TYPES.SUCCESS, msg, withDefaultDuration(DURATIONS.SHORT, opts)),
      warning: (msg, opts = {}) =>
        createToast(TOAST_TYPES.WARNING, msg, withDefaultDuration(DURATIONS.DEFAULT, opts)),
      error: (msg, opts = {}) =>
        createToast(TOAST_TYPES.ERROR, msg, withDefaultDuration(DURATIONS.DEFAULT, opts)),
      info: (msg, opts = {}) =>
        createToast(TOAST_TYPES.INFO, msg, withDefaultDuration(DURATIONS.SHORT, opts)),
      show: (type, msg, opts = {}) => createToast(type, msg, opts),
    }),
    [createToast]
  );
}
