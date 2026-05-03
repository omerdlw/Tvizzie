'use client';

import Link from 'next/link';

import { TMDB_IMG } from '@/core/constants';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { getPreferredSearchImageSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import Icon from '@/ui/icon';
import MediaCard from '@/ui/media/media-card';

import { SEARCH_TYPES } from './constants';
import { getDetailPath, getImagePath, getItemTitle, getItemYear } from '@/features/search/utils';

function getImageSrc(item) {
  if (item.media_type === SEARCH_TYPES.USER) {
    return null;
  }

  const preferredImageSrc = getPreferredSearchImageSrc(item, 'w342');
  if (preferredImageSrc) {
    return preferredImageSrc;
  }

  const imagePath = getImagePath(item);

  return imagePath ? `${TMDB_IMG}/w342${imagePath}` : null;
}

function UserAvatar({ item, title }) {
  const fallbackSrc = getUserAvatarFallbackUrl(item);
  const avatarSrc = getUserAvatarUrl(item) || fallbackSrc;

  return (
    <div className="center h-full w-full rounded border border-white/10 bg-white/10">
      <AdaptiveImage
        mode="img"
        className="h-full w-full object-cover"
        src={avatarSrc}
        alt={title}
        loading="lazy"
        decoding="async"
        onError={(event) => applyAvatarFallback(event, fallbackSrc)}
        wrapperClassName="h-full w-full"
      />
    </div>
  );
}

export default function SearchGridItem({ item, onSelect }) {
  usePosterPreferenceVersion();
  const title = getItemTitle(item);
  const detailPath = getDetailPath(item);
  const imageSrc = getImageSrc(item);
  const hasDetailPath = Boolean(detailPath);
  const cardContent = (
    <>
      <MediaCard
        className={cn('w-full overflow-hidden rounded border border-white/10 transition-transform duration-[200ms]')}
        imageSrc={imageSrc}
        imageAlt={title}
        imageSizes="(max-width: 1023px) 16.66vw, 8.33vw"
        fallbackIcon={item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'}
        fallbackContent={
          item.media_type === SEARCH_TYPES.USER ? (
            <UserAvatar item={item} title={title} />
          ) : (
            <div className="center h-full w-full rounded border border-white/10 bg-white/10 text-white/40">
              <Icon
                icon={item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'}
                size={22}
              />
            </div>
          )
        }
        tooltipText={
          item.media_type === SEARCH_TYPES.MOVIE && getItemYear(item) ? `${title} (${getItemYear(item)})` : title
        }
      />
    </>
  );

  if (!hasDetailPath) {
    return <div className="group flex h-full min-w-0 flex-col gap-2">{cardContent}</div>;
  }

  return (
    <Link
      href={detailPath}
      className="group flex h-full min-w-0 flex-col gap-2"
      onClick={(event) => {
        if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
          onSelect?.(item);
        }
      }}
    >
      {cardContent}
    </Link>
  );
}
