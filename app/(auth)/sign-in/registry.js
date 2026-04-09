'use client';

import { useRegistry } from '@/core/modules/registry';

export default function Registry({ authIsReady, isResetMode }) {
  useRegistry({
    nav: {
      title: 'Sign In',
      description: isResetMode ? 'Reset your password' : 'Access your account',
      icon: 'solar:user-circle-bold',
      action: null,
    },
    loading: { isLoading: !authIsReady },
  });

  return null;
}
