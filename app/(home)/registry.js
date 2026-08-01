'use client';

import SearchAction from '@/features/navigation/actions/search-action';
import { createRouteRegistry } from '@/features/app-shell/route-registry-factory';
import { MEDIA_BACKGROUND_ANIMATION } from '@/features/media/motion';

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
