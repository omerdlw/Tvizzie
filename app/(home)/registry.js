'use client';

import SearchAction from '@/domains/search/ui/components/search-action';
import { createRouteRegistry } from '@/modules/registry/route-registry';
import { HOME_BACKGROUND_ANIMATION } from '@/domains/home/ui/motion';

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
            animation: HOME_BACKGROUND_ANIMATION,
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
            animation: HOME_BACKGROUND_ANIMATION,
          },
        }),
    loading: { isLoading },
  }),
});
