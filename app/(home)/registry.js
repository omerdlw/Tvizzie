'use client';

import SearchAction from '@/domains/search/ui/nav-actions/search-action';
import { createRouteRegistry } from '@/modules/registry/route-registry';

export default createRouteRegistry({
  displayName: 'HomeRegistry',
  resolveConfig: ({ backgroundImage = null, isLoading = false }) => ({
    nav: {
      action: <SearchAction />,
    },
    ...(backgroundImage
      ? {
          background: {
            image: backgroundImage,
            overlay: true,
          },
        }
      : {
          background: {
            image: null,
            video: null,
          },
        }),
    loading: { isLoading },
  }),
});
