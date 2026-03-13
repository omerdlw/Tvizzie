'use client'

import { useEffect, useRef } from 'react'

import {
  clearPendingProfileBootstrap,
  getPendingProfileBootstrap,
} from '@/lib/auth/pending-profile.client'
import { useAuth } from '@/modules/auth'
import { ensureUserProfile } from '@/services/profile.service'

function isFreshEmailPasswordSession(user) {
  const providerIds = Array.isArray(user?.metadata?.providerIds)
    ? user.metadata.providerIds
    : []
  const createdAt = Date.parse(user?.metadata?.creationTime || '')
  const lastSignInAt = Date.parse(user?.metadata?.lastSignInTime || '')

  if (!providerIds.includes('password')) {
    return false
  }

  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) {
    return false
  }

  return Math.abs(lastSignInAt - createdAt) <= 60 * 1000
}

export default function ProfileBootstrapper() {
  const auth = useAuth()
  const bootstrappedUserRef = useRef(null)

  useEffect(() => {
    if (!auth.isReady || !auth.user?.id) {
      bootstrappedUserRef.current = null
      return
    }

    if (bootstrappedUserRef.current === auth.user.id) {
      return
    }

    bootstrappedUserRef.current = auth.user.id

    const pendingProfile = isFreshEmailPasswordSession(auth.user)
      ? getPendingProfileBootstrap(auth.user)
      : null

    ensureUserProfile(
      auth.user,
      pendingProfile
        ? {
            displayName: pendingProfile.displayName,
            username: pendingProfile.username,
          }
        : undefined
    )
      .then(() => {
        if (pendingProfile) {
          clearPendingProfileBootstrap()
        }
      })
      .catch((error) => {
        console.error('[Profile] Failed to bootstrap user profile:', error)
        bootstrappedUserRef.current = null
      })
  }, [auth.isReady, auth.user])

  return null
}
