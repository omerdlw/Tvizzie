'use client';

import { useRegistry } from '@/core/modules/registry';

export default function AuthRouteRegistry({ authIsReady, description, icon, title }) {
  useRegistry({
    nav: {
      title,
      description,
      icon,
      action: null,
    },
    loading: { isLoading: !authIsReady },
  });

  return null;
}
