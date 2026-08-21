'use client';

import SearchAction from '@/domains/shell/navigation/actions/search-action';
import { createRouteRegistry } from '@/modules/registry/route-registry';

const HomeRegistry = createRouteRegistry({
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

export default HomeRegistry;
