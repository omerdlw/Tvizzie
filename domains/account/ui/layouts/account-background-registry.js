'use client';

import { useMemo } from 'react';
import { useRegistry } from '@/modules/registry';
import { resolveVersionedImageUrl } from '@/shared/utils';

/**
 * Registers the account background image exactly once at the stable layout level.
 * This component lives inside ProfileLayout (the [username]/layout.js shell),
 * which never unmounts during tab navigation — so the background stays perfectly
 * still across all account sub-page transitions.
 */
export default function AccountBackgroundRegistry({ bannerUrl = null }) {
  const heroBannerSrc = useMemo(
    () =>
      resolveVersionedImageUrl(String(bannerUrl || ''))
        .trim()
        .replace(/^(null|undefined)$/i, '') || null,
    [bannerUrl],
  );

  const backgroundConfig = useMemo(
    () =>
      heroBannerSrc
        ? {
            image: heroBannerSrc,
            overlay: true,
            overlayOpacity: 0,
            overlayColor: 'var(--white)',
            noiseStyle: { opacity: 0.2 },
            animation: false,
          }
        : {
            image: null,
            video: null,
            overlay: false,
            overlayOpacity: 0,
            noiseStyle: { opacity: 0 },
            animation: false,
          },
    [heroBannerSrc],
  );

  useRegistry({ background: backgroundConfig });

  return null;
}
