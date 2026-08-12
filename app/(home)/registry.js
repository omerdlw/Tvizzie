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
            noiseStyle: {
              opacity: 0.2,
            },
          },
        }
      : {
          background: {
            image: null,
            video: null,
            overlay: false,
            overlayOpacity: 0,
            noiseStyle: {
              opacity: 0,
            },
          },
        }),
    loading: { isLoading },
  }),
});
