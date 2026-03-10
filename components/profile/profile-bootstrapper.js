'use client'

import { useEffect, useRef } from 'react'

import { useAuth } from '@/modules/auth'
import { ensureUserProfile } from '@/services/profile.service'

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

    ensureUserProfile(auth.user).catch((error) => {
      console.error('[Profile] Failed to bootstrap user profile:', error)
      bootstrappedUserRef.current = null
    })
  }, [auth.isReady, auth.user])

  return null
}
