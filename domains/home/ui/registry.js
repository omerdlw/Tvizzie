'use client';

import SearchAction from '@/domains/shell/navigation/actions/search-action';
import { createRouteRegistry } from '@/modules/registry';

const HomeRegistry = createRouteRegistry({
  displayName: 'HomeRegistry',
  resolveConfig: ({ backgroundImage = null, isLoading = false }) => ({
    nav: {
      action: <SearchAction />,
    },
    loading: { isLoading },
  }),
});

export default HomeRegistry;
