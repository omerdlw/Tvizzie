'use client'

import AuthGoogleAction from '@/features/navigation/actions/auth-google-action'
import { useRegistry } from '@/modules/registry'

export default function Registry({
  authIsReady,
  isGoogleSubmitting,
  onGoogleSignUp,
}) {
  useRegistry({
    nav: {
      title: 'Sign Up',
      description: 'Create your account',
      icon: 'solar:user-plus-bold',
      action: (
        <AuthGoogleAction
          isLoading={isGoogleSubmitting}
          onClick={onGoogleSignUp}
        />
      ),
    },
    loading: { isLoading: !authIsReady },
  })

  return null
}
