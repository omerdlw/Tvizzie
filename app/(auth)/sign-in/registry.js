'use client'

import AuthGoogleAction from '@/features/navigation/actions/auth-google-action'
import { useRegistry } from '@/modules/registry'

export default function Registry({
  authIsReady,
  isGoogleSubmitting,
  isResetMode,
  onGoogleSignIn,
}) {
  useRegistry({
    nav: {
      title: 'Sign In',
      description: isResetMode ? 'Reset your password' : 'Access your account',
      icon: 'solar:user-circle-bold',
      action: !isResetMode ? (
        <AuthGoogleAction
          isLoading={isGoogleSubmitting}
          onClick={onGoogleSignIn}
        />
      ) : null,
    },
    loading: { isLoading: !authIsReady },
  })

  return null
}
