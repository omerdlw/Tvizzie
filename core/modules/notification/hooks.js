'use client';

import { useCallback, useMemo } from 'react';

import { useNotificationActions, TOAST_TYPES } from './context';

const DURATIONS = {
  SHORT: 3000,
  DEFAULT: 4000,
  LONG: 5000,
};

function generateToastId() {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useToast() {
  const { showNotification } = useNotificationActions();

  const createToast = useCallback(
    (type, message, options = {}) => {
      const { action, actions, dedupeKey, duration, ...rest } = options;

      const finalActions = actions || (action ? [action] : undefined);
      const resolvedId = dedupeKey || rest.id || generateToastId();

      return showNotification(type, {
        id: resolvedId,
        message,
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
        createToast(TOAST_TYPES.SUCCESS, msg, {
          duration: DURATIONS.SHORT,
          ...opts,
        }),
      warning: (msg, opts = {}) =>
        createToast(TOAST_TYPES.WARNING, msg, {
          duration: DURATIONS.DEFAULT,
          ...opts,
        }),
      error: (msg, opts = {}) =>
        createToast(TOAST_TYPES.ERROR, msg, {
          duration: DURATIONS.DEFAULT,
          ...opts,
        }),
      info: (msg, opts = {}) =>
        createToast(TOAST_TYPES.INFO, msg, {
          duration: DURATIONS.SHORT,
          ...opts,
        }),
      show: (type, msg, opts = {}) => createToast(type, msg, opts),
    }),
    [createToast]
  );
}
