'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { usePathname } from 'next/navigation'

import { Wifi, WifiOff } from 'lucide-react'

import { EVENT_TYPES, globalEvents } from '@/lib/events'
import { hexToRgba } from '@/lib/utils/index'
import { Button } from '@/ui/elements/index'

const STATUS_PRIORITY = {
  LOGIN: 110,
  LOGOUT: 110,
  APP_ERROR: 100,
  API_ERROR: 95,
  OFFLINE: 90,
  ONLINE: 10,
}

const STATUS_TYPES = {
  ERROR: ['APP_ERROR', 'API_ERROR'],
  SUCCESS: ['LOGIN', 'ONLINE'],
  WARNING: ['LOGOUT', 'OFFLINE'],
}

const getStatusTheme = (type) => {
  const isError = STATUS_TYPES.ERROR.includes(type)
  const isSuccess = STATUS_TYPES.SUCCESS.includes(type)
  const colorVar = isError ? 'error' : isSuccess ? 'success' : 'warning'

  const color = hexToRgba(`var(--color-${colorVar})`, 0.2)
  const border = hexToRgba(`var(--color-${colorVar})`, 0.4)
  const iconBg = hexToRgba(`var(--color-${colorVar})`, 0.4)
  const badgeBg = hexToRgba(`var(--color-${colorVar})`, 0.2)
  const badgeBorder = hexToRgba(`var(--color-${colorVar})`, 0.3)
  const darkFade = 'rgba(0,0,0,0.5)'

  return {
    card: {
      className: 'animate-status-gradient',
      background: `linear-gradient(90deg, ${color} 0%, ${darkFade} 20%, ${color} 50%, ${darkFade} 80%, ${color} 100%)`,
      borderColor: border,
    },
    icon: {
      background: iconBg,
      color: '#ffffff',
    },
    shortcutBadge: {
      background: badgeBg,
      borderColor: badgeBorder,
      color: '#ffffff',
      opacity: 1,
    },
  }
}

const ErrorActions = ({ onRetry, onRefresh, onInfo }) => (
  <div className="mt-2.5 flex items-center gap-2">
    {onRetry && (
      <Button
        className="center bg-error/20 text-error hover:bg-error/30 w-full cursor-pointer rounded-[20px] px-4 py-2 text-sm transition-colors"
        onClick={(e) => {
          e.stopPropagation()
          onRetry()
        }}
      >
        Retry
      </Button>
    )}
    <Button
      className="center bg-error/20 text-error hover:bg-error/30 w-full cursor-pointer rounded-[20px] px-4 py-2 text-sm transition-colors"
      onClick={(e) => {
        e.stopPropagation()
        onRefresh()
      }}
    >
      Refresh
    </Button>
    <Button
      className="center bg-error/20 text-error hover:bg-error/30 w-full cursor-pointer rounded-[20px] px-4 py-2 text-sm transition-colors"
      onClick={(e) => {
        e.stopPropagation()
        onInfo()
      }}
    >
      Info
    </Button>
  </div>
)

export const useNavigationStatus = () => {
  const [status, setStatus] = useState(null)
  const pathname = usePathname()

  const apiErrorQueue = useRef([])
  const batchTimeout = useRef(null)
  const statusClearTimeout = useRef(null)
  const onlineResetTimeout = useRef(null)
  const offlineDispatchTimeout = useRef(null)

  const clearTimer = useCallback((timerRef) => {
    if (!timerRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const scheduleStatusClear = useCallback(
    (duration = 4500) => {
      clearTimer(statusClearTimeout)
      statusClearTimeout.current = setTimeout(() => {
        statusClearTimeout.current = null
        setStatus((current) =>
          current?.type === 'LOGIN' || current?.type === 'LOGOUT' ? null : current
        )
      }, duration)
    },
    [clearTimer]
  )

  const updateStatus = useCallback((newStatus) => {
    setStatus((prev) => {
      if (!newStatus) return null
      if (!prev) return newStatus

      const prevPriority = STATUS_PRIORITY[prev.type] ?? 0
      const newPriority = STATUS_PRIORITY[newStatus.type] ?? 0

      return newPriority >= prevPriority ? newStatus : prev
    })
  }, [])

  const clearStatus = useCallback(() => setStatus(null), [])

  useEffect(() => {
    setStatus((prev) => {
      if (prev && STATUS_TYPES.ERROR.includes(prev.type)) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          clearTimer(offlineDispatchTimeout)
          offlineDispatchTimeout.current = setTimeout(() => {
            offlineDispatchTimeout.current = null
            window.dispatchEvent(new Event('offline'))
          }, 0)
        }
        return null
      }
      return prev
    })
  }, [clearTimer, pathname])

  useEffect(() => {
    const unsubscribeApiError = globalEvents.subscribe(
      EVENT_TYPES.API_ERROR,
      (eventData) => {
        const {
          status: errStatus,
          message,
          isCritical,
          retry,
        } = eventData || {}
        if (!isCritical) return

        apiErrorQueue.current.push({ status: errStatus, message, retry })

        if (batchTimeout.current) clearTimeout(batchTimeout.current)

        batchTimeout.current = setTimeout(() => {
          const errors = [...apiErrorQueue.current]
          apiErrorQueue.current = []

          const isBatch = errors.length > 1
          const title = isBatch
            ? 'Multiple API Errors'
            : `API Error (${errors[0].status || 'Network'})`
          const description = isBatch
            ? `${errors.length} requests failed`
            : errors[0].message || 'An error occurred during the request'

          updateStatus({
            type: 'API_ERROR',
            isOverlay: true,
            title,
            description,
            icon: 'solar:danger-triangle-bold',
            style: getStatusTheme('API_ERROR'),
            action: () => (
              <ErrorActions
                onRetry={() => {
                  clearStatus()
                  errors.forEach((err) => err.retry?.())
                }}
                onRefresh={() => window.location.reload()}
                onInfo={() => alert(JSON.stringify(errors, null, 2))}
              />
            ),
            hideSettings: true,
            hideScroll: true,
          })
        }, 300)
      }
    )

    const unsubscribeAppError = globalEvents.subscribe(
      EVENT_TYPES.APP_ERROR,
      (eventData) => {
        const { message, error, resetError } = eventData || {}
        const title = error?.name || 'Application Error'
        const description =
          error?.message || message || 'An unexpected error occurred'

        updateStatus({
          type: 'APP_ERROR',
          isOverlay: true,
          title,
          description,
          icon: 'solar:danger-triangle-bold',
          style: getStatusTheme('APP_ERROR'),
          action: () => (
            <ErrorActions
              onRetry={
                resetError
                  ? () => {
                      clearStatus()
                      resetError()
                      if (
                        typeof navigator !== 'undefined' &&
                        !navigator.onLine
                      ) {
                        clearTimer(offlineDispatchTimeout)
                        offlineDispatchTimeout.current = setTimeout(() => {
                          offlineDispatchTimeout.current = null
                          window.dispatchEvent(new Event('offline'))
                        }, 0)
                      }
                    }
                  : null
              }
              onRefresh={() => window.location.reload()}
              onInfo={() =>
                alert(
                  error?.stack ||
                    error?.message ||
                    message ||
                    'No detailed error information available'
                )
              }
            />
          ),
          hideSettings: true,
          hideScroll: true,
        })
      }
    )

    const unsubscribeSignOut = globalEvents.subscribe(
      EVENT_TYPES.AUTH_SIGN_OUT,
      (eventData) => {
        const user = eventData?.previousSession?.user
        if (!user) return

        updateStatus({
          type: 'LOGOUT',
          isOverlay: true,
          title: user.name || user.email || 'User',
          description: 'Logging out',
          icon:
            user.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id || 'default'}`,
          style: getStatusTheme('LOGOUT'),
          hideSettings: true,
          hideScroll: true,
        })

        scheduleStatusClear(4500)
      }
    )

    const unsubscribeSignIn = globalEvents.subscribe(
      EVENT_TYPES.AUTH_SIGN_IN,
      (eventData) => {
        const user = eventData?.session?.user
        if (!user) return

        updateStatus({
          type: 'LOGIN',
          isOverlay: true,
          title: user.name || user.email || 'User',
          description: 'Logging in',
          icon:
            user.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id || 'default'}`,
          style: getStatusTheme('LOGIN'),
          hideSettings: true,
          hideScroll: true,
        })

        scheduleStatusClear(4500)
      }
    )

    const handleOffline = () => {
      updateStatus({
        type: 'OFFLINE',
        isOverlay: true,
        title: 'Connection Lost',
        description: 'You are currently offline',
        icon: <WifiOff size={24} />,
        style: getStatusTheme('OFFLINE'),
        hideSettings: true,
        hideScroll: true,
      })
    }

    const handleOnline = () => {
      setStatus((prev) => {
        if (prev?.type !== 'OFFLINE') return null

        clearTimer(onlineResetTimeout)
        onlineResetTimeout.current = setTimeout(() => {
          onlineResetTimeout.current = null
          setStatus((current) => (current?.type === 'ONLINE' ? null : current))
        }, 4500)

        return {
          type: 'ONLINE',
          isOverlay: false,
          title: 'Connection Restored',
          description: 'You are back online',
          icon: <Wifi size={24} />,
          style: getStatusTheme('ONLINE'),
          hideSettings: true,
          hideScroll: true,
        }
      })
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleOffline()
    }

    return () => {
      unsubscribeAppError()
      unsubscribeApiError()
      unsubscribeSignOut()
      unsubscribeSignIn()
      clearTimer(batchTimeout)
      clearTimer(statusClearTimeout)
      clearTimer(onlineResetTimeout)
      clearTimer(offlineDispatchTimeout)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [clearStatus, clearTimer, scheduleStatusClear, updateStatus])

  return status
}
