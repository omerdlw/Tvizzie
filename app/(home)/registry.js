'use client';

import SearchAction from '@/features/navigation/actions/search-action';
import { useRegistry } from '@/core/modules/registry';

export default function Registry({ backgroundImage = null, isLoading = false }) {
  useRegistry({
    nav: {
      action: <SearchAction />,
    },
    ...(backgroundImage
      ? {
          background: {
            image: backgroundImage,
            overlay: true,
            overlayOpacity: 0.42,
            overlayColor: 'var(--white)',
            noiseStyle: {
              opacity: 0.11,
            },
            imageStyle: {
              opacity: 0.98,
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
  });

  return null;
}
