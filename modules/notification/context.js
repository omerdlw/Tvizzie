'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from '@/lib/utils/client-utils'

const NotificationActionsContext = createContext(null)
const NotificationStateContext = createContext(null)
const CRITICAL_NOTIFICATION_KEY = 'critical_notifications'

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

const CRITICAL_TYPE_SET = new Set(Object.values(CRITICAL_TYPES))

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState({})
  const timersRef = useRef(new Map())

  useEffect(() => {
    const stored = getStorageItem(CRITICAL_NOTIFICATION_KEY)
    if (stored) {
      const parsed =
        stored && typeof stored === 'object' && !Array.isArray(stored)
          ? stored
          : {}

      const filteredEntries = Object.entries(parsed).filter(([, notification]) => {
        if (!notification || !notification.type) return false
        if (!CRITICAL_TYPE_SET.has(notification.type)) return false
        if (notification.message && /HTTP\s*404/i.test(notification.message))
          return false
        return true
      })

      const filtered = Object.fromEntries(filteredEntries)
      setNotifications(filtered)

      if (Object.keys(filtered).length === 0) {
        removeStorageItem(CRITICAL_NOTIFICATION_KEY)
      }
    }
  }, [])

  useEffect(() => {
    const timers = timersRef.current

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId))
      timers.clear()
    }
  }, [])

  useEffect(() => {
    const criticalOnly = Object.fromEntries(
      Object.entries(notifications).filter(
        ([, notification]) =>
          notification && notification.type && CRITICAL_TYPE_SET.has(notification.type)
      )
    )

    if (Object.keys(criticalOnly).length > 0) {
      setStorageItem(CRITICAL_NOTIFICATION_KEY, criticalOnly)
    } else {
      removeStorageItem(CRITICAL_NOTIFICATION_KEY)
    }
  }, [notifications])

  const dismissNotification = useCallback((id) => {
    const timerId = timersRef.current.get(id)
    if (timerId) {
      clearTimeout(timerId)
      timersRef.current.delete(id)
    }

    setNotifications((prev) => {
      const updated = { ...prev }
      delete updated[id]

      if (Object.keys(updated).length === 0) {
        removeStorageItem(CRITICAL_NOTIFICATION_KEY)
      }

      return updated
    })
  }, [])

  const showNotification = useCallback(
    (type, data = {}) => {
      const id = data.id || type

      const existingTimer = timersRef.current.get(id)
      if (existingTimer) {
        clearTimeout(existingTimer)
        timersRef.current.delete(id)
      }

      setNotifications((prev) => ({
        ...prev,
        [id]: {
          timestamp: Date.now(),
          type,
          id,
          ...data,
        },
      }))

      if (data.duration) {
        const timerId = setTimeout(() => {
          timersRef.current.delete(id)
          dismissNotification(id)
        }, data.duration)
        timersRef.current.set(id, timerId)
      }
    },
    [dismissNotification]
  )

  const actionsValue = useMemo(
    () => ({
      dismissNotification,
      showNotification,
    }),
    [dismissNotification, showNotification]
  )

  const hasNotification = useCallback(
    (type) => {
      return notifications[type] !== undefined
    },
    [notifications]
  )

  const getNotification = useCallback(
    (type) => {
      return notifications[type]
    },
    [notifications]
  )

  const stateValue = useMemo(
    () => ({
      hasNotification,
      getNotification,
      notifications,
    }),
    [notifications, hasNotification, getNotification]
  )

  return (
    <NotificationActionsContext.Provider value={actionsValue}>
      <NotificationStateContext.Provider value={stateValue}>
        {children}
      </NotificationStateContext.Provider>
    </NotificationActionsContext.Provider>
  )
}

export const useNotificationActions = () => {
  const context = useContext(NotificationActionsContext)
  if (!context)
    throw new Error(
      'useNotificationActions must be used within a NotificationProvider'
    )
  return context
}

export const useNotificationState = () => {
  const context = useContext(NotificationStateContext)
  if (!context)
    throw new Error(
      'useNotificationState must be used within a NotificationProvider'
    )
  return context
}
