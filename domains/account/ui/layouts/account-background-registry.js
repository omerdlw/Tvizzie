'use client';

import { useMemo } from 'react';
import { usePageRegistry } from '@/modules/registry';
import { resolveVersionedImageUrl } from '@/shared';

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
            leftGradient: 3,
            rightGradient: 3,
          }
        : null,
    [heroBannerSrc],
  );

  usePageRegistry({ background: backgroundConfig });

  return null;
}
