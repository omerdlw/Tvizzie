'use client'

import { useMemo } from 'react'

import { AUTH_STATUS } from './config'
import { canAccess } from './utils'
import { useAuth } from './context'

export function useAuthorization(rules = {}) {
  const auth = useAuth()

  const isPending =
    !auth.isReady ||
    auth.status === AUTH_STATUS.IDLE ||
    auth.status === AUTH_STATUS.LOADING ||
    auth.status === AUTH_STATUS.REFRESHING

  const isAllowed = canAccess(auth.session, rules)

  return useMemo(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      isAnonymous: auth.isAnonymous,
      isAllowed,
      isPending,
      can: auth.can,
      auth,
    }),
    [isAllowed, isPending, auth]
  )
}

export function AuthGate({
  loadingFallback = null,
  fallback = null,
  children,
  ...rules
}) {
  const { isAllowed, isPending } = useAuthorization(rules)

  if (isPending) {
    return loadingFallback
  }

  if (!isAllowed) {
    return fallback
  }

  return <>{children}</>
}

export function AnonymousGate({
  loadingFallback = null,
  fallback = null,
  children,
}) {
  const auth = useAuth()

  if (!auth.isReady || auth.status === AUTH_STATUS.LOADING) {
    return loadingFallback
  }

  if (auth.isAuthenticated) {
    return fallback
  }

  return <>{children}</>
}
