'use client'

import { useCallback, useMemo } from 'react'

import { TOAST_TYPES, useNotificationActions } from './context'

const NOTIFICATION_DURATIONS = {
  SHORT: 3000,
  DEFAULT: 4000,
  LONG: 5000,
}

export function useToast() {
  const { showNotification } = useNotificationActions()

  const createToast = useCallback(
    (type, message, options = {}) => {
      const { action, actions, duration, ...rest } = options

      let finalActions = actions
      if (action && !actions) {
        finalActions = [action]
      }

      return showNotification(type, {
        id: `toast_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        actions: finalActions,
        duration,
        message,
        ...rest,
      })
    },
    [showNotification]
  )

  const toast = useMemo(
    () => ({
      success: (message, options = {}) =>
        createToast(TOAST_TYPES.SUCCESS, message, {
          duration: NOTIFICATION_DURATIONS.SHORT,
          ...options,
        }),
      warning: (message, options = {}) =>
        createToast(TOAST_TYPES.WARNING, message, {
          duration: NOTIFICATION_DURATIONS.DEFAULT,
          ...options,
        }),
      error: (message, options = {}) =>
        createToast(TOAST_TYPES.ERROR, message, {
          duration: NOTIFICATION_DURATIONS.DEFAULT,
          ...options,
        }),
      info: (message, options = {}) =>
        createToast(TOAST_TYPES.INFO, message, {
          duration: NOTIFICATION_DURATIONS.SHORT,
          ...options,
        }),
      show: (type, message, options = {}) =>
        createToast(type, message, options),
    }),
    [createToast]
  )

  return toast
}
