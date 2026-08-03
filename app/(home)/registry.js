'use client';

import SearchAction from '@/domains/search/ui/navigation/search-action';
import { createRouteRegistry } from '@/modules/registry/route-registry';
import { MEDIA_BACKGROUND_ANIMATION } from '@/app/(media)/motion';

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
            animation: MEDIA_BACKGROUND_ANIMATION,
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
            animation: MEDIA_BACKGROUND_ANIMATION,
          },
        }),
    loading: { isLoading },
  }),
});

