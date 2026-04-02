'use client'

import { useMemo } from 'react'

import { useAuthState } from './context'

export function useAuthSessionReady(expectedUserId = null) {
  const authState = useAuthState()

  return useMemo(() => {
    const userId = authState?.session?.user?.id || authState?.user?.id || null

    if (!expectedUserId) {
      return Boolean(authState?.isReady)
    }

    if (!authState?.isReady) {
      return false
    }

    if (!userId) {
      return false
    }

    return String(userId) === String(expectedUserId)
  }, [authState, expectedUserId])
}
