'use client';

import SearchAction from '@/features/navigation/actions/search-action';
import { useRegistry } from '@/core/modules/registry';

const HOME_BACKGROUND_ANIMATION = Object.freeze({
  exitDurationFactor: 0.42,
  transition: {
    duration: 1.15,
    delay: 0.08,
    ease: [0.23, 1, 0.32, 1],
  },
  initial: {
    opacity: 0,
    scale: 1.06,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transitionEnd: {
      transform: 'none',
      willChange: 'auto',
    },
  },
  exit: {
    opacity: 0,
    scale: 1.03,
  },
});

export default function Registry({ backgroundImage = null, isLoading = false }) {
  useRegistry({
    nav: {
      action: <SearchAction />,
    },
    ...(backgroundImage
      ? {
          background: {
            animation: HOME_BACKGROUND_ANIMATION,
            image: backgroundImage,
            overlay: true,
            overlayOpacity: 0.42,
            overlayColor: '#faf9f5',
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
