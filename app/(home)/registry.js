'use client';

import SearchAction from '@/features/navigation/actions/search-action';
import { createRouteRegistry } from '@/features/app-shell/route-registry-factory';

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
