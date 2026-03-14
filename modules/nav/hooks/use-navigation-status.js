'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { usePathname } from 'next/navigation'

import { Wifi, WifiOff } from 'lucide-react'

import { EVENT_TYPES, globalEvents } from '@/lib/events'
import { hexToRgba } from '@/lib/utils/index'
import { Button } from '@/ui/elements/index'

const STATUS_PRIORITY = {
  ACCOUNT_DELETE: 115,
  LOGIN: 110,
  LOGOUT: 110,
  APP_ERROR: 100,
  API_ERROR: 95,
  OFFLINE: 90,
  ONLINE: 10,
}

const STATUS_TYPES = {
  ERROR: ['ACCOUNT_DELETE', 'APP_ERROR', 'API_ERROR'],
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
      color: 'var(--color-white)',
    },
    shortcutBadge: {
      background: badgeBg,
      borderColor: badgeBorder,
      color: 'var(--color-white)',
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
    ({ duration = 4500, clearWhen = [] } = {}) => {
      clearTimer(statusClearTimeout)

      const clearTypes = Array.isArray(clearWhen)
        ? clearWhen.filter(Boolean)
        : []

      statusClearTimeout.current = setTimeout(() => {
        statusClearTimeout.current = null

        setStatus((current) => {
          if (!current) return current
          if (clearTypes.length === 0) return null
          return clearTypes.includes(current.type) ? null : current
        })
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
      if (
        prev &&
        STATUS_TYPES.ERROR.includes(prev.type) &&
        prev.type !== 'ACCOUNT_DELETE'
      ) {
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
        const isAccountDelete = eventData?.reason === 'delete-account'
        const user = eventData?.previousSession?.user || null

        if (!user && !isAccountDelete) return

        updateStatus({
          type: isAccountDelete ? 'ACCOUNT_DELETE' : 'LOGOUT',
          isOverlay: true,
          title: user?.name || user?.email || 'Account',
          description: isAccountDelete ? 'Deleting account' : 'Logging out',
          icon:
            user?.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'account'}`,
          style: getStatusTheme(isAccountDelete ? 'ACCOUNT_DELETE' : 'LOGOUT'),
          hideSettings: true,
          hideScroll: true,
        })

        scheduleStatusClear({
          duration: 4500,
          clearWhen: [isAccountDelete ? 'ACCOUNT_DELETE' : 'LOGOUT'],
        })
      }
    )

    const unsubscribeAccountDeleteStart = globalEvents.subscribe(
      EVENT_TYPES.AUTH_ACCOUNT_DELETE_START,
      (eventData) => {
        const user = eventData?.user || null

        clearTimer(statusClearTimeout)
        updateStatus({
          type: 'ACCOUNT_DELETE',
          isOverlay: true,
          title: user?.name || user?.email || 'Account',
          description: 'Deleting account',
          icon:
            user?.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'account'}`,
          style: getStatusTheme('ACCOUNT_DELETE'),
          hideSettings: true,
          hideScroll: true,
        })
      }
    )

    const unsubscribeAccountDeleteEnd = globalEvents.subscribe(
      EVENT_TYPES.AUTH_ACCOUNT_DELETE_END,
      (eventData) => {
        if (eventData?.status !== 'failure') return
        clearTimer(statusClearTimeout)
        setStatus((current) =>
          current?.type === 'ACCOUNT_DELETE' ? null : current
        )
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

        scheduleStatusClear({
          duration: 4500,
          clearWhen: ['LOGIN'],
        })
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
      unsubscribeAccountDeleteStart()
      unsubscribeAccountDeleteEnd()
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
