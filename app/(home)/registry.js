'use client';

import SearchAction from '@/features/navigation/actions/search-action';
import { DURATION, EASING, TMDB_IMG } from '@/core/constants';
import { useRegistry } from '@/core/modules/registry';

export default function Registry({ heroBackdropPath, isLoading = false }) {
  useRegistry({
    nav: {
      action: <SearchAction />,
    },
    loading: { isLoading },
    ...(heroBackdropPath
      ? {
          background: {
            animation: {
              transition: {
                duration: DURATION.HERO,
                ease: EASING.STANDARD,
              },
              initial: {},
              animate: {},
              exit: {},
            },
            image: `${TMDB_IMG}/w1280${heroBackdropPath}`,
            overlay: true,
            overlayOpacity: 0.7,
          },
        }
      : {}),
  });

  return null;
}
