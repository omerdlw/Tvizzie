'use client';

import { useRegistry } from '@/core/modules/registry';

export default function Registry({ authIsReady }) {
  useRegistry({
    nav: {
      title: 'Sign Up',
      description: 'Create your account',
      icon: 'solar:user-plus-bold',
      action: null,
    },
    loading: { isLoading: !authIsReady },
  });

  return null;
}
