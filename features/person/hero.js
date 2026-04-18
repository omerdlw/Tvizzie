'use client';

import { useState } from 'react';

import Image from 'next/image';

import { TMDB_IMG } from '@/core/constants';
import { getImagePlaceholderDataUrl, resolveImageQuality } from '@/core/utils';
import Icon from '@/ui/icon';

function resolveProfileImage(path) {
  if (!path) return null;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMG}/h632${normalizedPath}`;
}

export default function PersonHero({ person, overline = null }) {
  const [hasError, setHasError] = useState(false);
  const imageSrc = resolveProfileImage(person?.profile_path);
  const hasImage = imageSrc && !hasError;

  return (
    <div className="flex flex-col items-center gap-6">
      {!overline && (
        <div className="relative h-86 w-64 overflow-hidden border border-[#0284c7] bg-[#dbeafe]">
          {hasImage ? (
            <Image
              src={imageSrc}
              alt={person.name}
              fill
              priority
              fetchPriority="high"
              className="object-cover"
              sizes="256px"
              quality={resolveImageQuality('hero')}
              decoding="async"
              placeholder="blur"
              blurDataURL={getImagePlaceholderDataUrl(`${person?.id || person?.name}-${imageSrc}`)}
              onError={() => setHasError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon icon="solar:user-bold" size={64} className="text-black/70" />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        {overline && <p className="mt-2 text-sm font-semibold tracking-widest text-black/70 uppercase">{overline}</p>}
        <h1 className="font-zuume text-5xl font-bold uppercase sm:text-6xl md:text-7xl lg:text-8xl">{person.name}</h1>
        {person.known_for_department && (
          <span className="border border-[#9333ea] bg-[#e9d5ff] px-3 py-1 text-[11px] font-semibold tracking-widest text-[#581c87] uppercase">
            {person.known_for_department}
          </span>
        )}
      </div>
    </div>
  );
}
