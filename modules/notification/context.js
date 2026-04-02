'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react'

import {
  removeStorageItem,
  getStorageItem,
  setStorageItem,
} from '@/lib/utils/client-utils'

const FALLBACK_NOTIFICATION_ACTIONS = Object.freeze({
  dismissNotification: () => {},
  showNotification: () => {},
})

const FALLBACK_NOTIFICATION_STATE = Object.freeze({
  notifications: {},
  hasNotification: () => false,
  getNotification: () => undefined,
})

const NotificationActionsContext = createContext(FALLBACK_NOTIFICATION_ACTIONS)
const NotificationStateContext = createContext(FALLBACK_NOTIFICATION_STATE)

const STORAGE_KEY = 'critical_notifications'

export const CRITICAL_TYPES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SERVER_ERROR: 'SERVER_ERROR',
  OFFLINE: 'OFFLINE',
}

export const TOAST_TYPES = {
  WARNING: 'WARNING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  INFO: 'INFO',
}

const CRITICAL_SET = new Set(Object.values(CRITICAL_TYPES))

function isValidCritical(notification) {
  if (!notification?.type) return false
  if (!CRITICAL_SET.has(notification.type)) return false
  if (notification.message && /HTTP\s*404/i.test(notification.message))
    return false
  return true
}

function filterCriticalNotifications(map) {
  return Object.fromEntries(
    Object.entries(map).filter(([, n]) => isValidCritical(n))
  )
}

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState({})
  const timersRef = useRef(new Map())

  useEffect(() => {
    const stored = getStorageItem(STORAGE_KEY)

    if (!stored) return

    if (typeof stored !== 'object' || Array.isArray(stored)) {
      removeStorageItem(STORAGE_KEY)
      return
    }

    const filtered = filterCriticalNotifications(stored)

    setNotifications(filtered)

    if (Object.keys(filtered).length === 0) {
      removeStorageItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    const timers = timersRef.current

    return () => {
      timers.forEach(clearTimeout)
      timers.clear()
    }
  }, [])

  useEffect(() => {
    const critical = filterCriticalNotifications(notifications)

    if (Object.keys(critical).length > 0) {
      setStorageItem(STORAGE_KEY, critical)
    } else {
      removeStorageItem(STORAGE_KEY)
    }
  }, [notifications])

  const dismissNotification = useCallback((id) => {
    const timer = timersRef.current.get(id)

    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setNotifications((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const showNotification = useCallback(
    (type, data = {}) => {
      const id = data.id || type

      const existing = timersRef.current.get(id)
      if (existing) {
        clearTimeout(existing)
        timersRef.current.delete(id)
      }

      setNotifications((prev) => ({
        ...prev,
        [id]: {
          id,
          type,
          timestamp: Date.now(),
          ...data,
        },
      }))

      if (data.duration) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id)
          dismissNotification(id)
        }, data.duration)

        timersRef.current.set(id, timer)
      }
    },
    [dismissNotification]
  )

  const actions = useMemo(
    () => ({
      dismissNotification,
      showNotification,
    }),
    [dismissNotification, showNotification]
  )

  const state = useMemo(
    () => ({
      notifications,
      hasNotification: (type) => notifications[type] !== undefined,
      getNotification: (type) => notifications[type],
    }),
    [notifications]
  )

  return (
    <NotificationActionsContext.Provider value={actions}>
      <NotificationStateContext.Provider value={state}>
        {children}
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  )
}

export function useNotificationActions() {
  return useContext(NotificationActionsContext)
}

export function useNotificationState() {
  return useContext(NotificationStateContext)
}
