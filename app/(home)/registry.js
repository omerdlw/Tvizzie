'use client';

import SearchAction from '@/features/navigation/actions/search-action';
import { useRegistry } from '@/core/modules/registry';

export default function Registry({ isLoading = false }) {
  useRegistry({
    nav: {
      action: <SearchAction />,
    },
    loading: { isLoading },
  });

  return null;
}
