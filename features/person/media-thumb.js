'use client';

import { useState } from 'react';

import { TMDB_IMG } from '@/core/constants';
import { canUseNextImageOptimization, cn, resolveImageQuality } from '@/core/utils';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';

function resolvePosterSrc(poster) {
  const value = String(poster || '').trim();

  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${TMDB_IMG}/w185${value}`;
  }

  return value;
}

export default function MediaThumb({ poster, alt, className = '' }) {
  const [hasError, setHasError] = useState(false);
  const src = hasError ? null : resolvePosterSrc(poster);
  const shouldOptimize = canUseNextImageOptimization(src);

  return (
    <div className={cn('relative aspect-2/3 w-16 shrink-0 overflow-hidden sm:w-20', className)}>
      {src ? (
        <AdaptiveImage
          fill
          sizes="(max-width: 640px) 64px, 80px"
          src={src}
          alt={alt || 'Poster'}
          quality={resolveImageQuality('thumbnail')}
          decoding="async"
          unoptimized={!shouldOptimize}
          className="object-cover"
          onError={() => setHasError(true)}
          wrapperClassName="h-full w-full"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Icon icon="solar:clapperboard-bold" size={18} className="text-black/50" />
        </div>
      )}
    </div>
  );
}
