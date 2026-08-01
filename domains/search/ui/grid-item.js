'use client';

import Link from 'next/link';
import { TMDB_IMG } from '@/shared/constants';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/shared/lib';
import {
  getPreferredSearchImageSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/ui/poster-overrides';
import AdaptiveImage from '@/ui/components/adaptive-image';
import Icon from '@/ui/primitives/icon';
import MediaCard from '@/domains/media/ui/components/media-card';
import { SEARCH_TYPES } from './constants';
import { getDetailPath, getImagePath, getItemTitle, getItemYear } from '@/domains/search/ui/search-data';
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
    <div className="center h-full w-full border border-black/5 bg-black/[0.03]">
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
        className={cn('w-full overflow-hidden border border-black/10')}
        imageSrc={imageSrc}
        imageAlt={title}
        imageSizes="(max-width: 1023px) 16.66vw, 8.33vw"
        fallbackIcon={
          item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'
        }
        fallbackContent={
          item.media_type === SEARCH_TYPES.USER ? (
            <UserAvatar item={item} title={title} />
          ) : (
            <div className="center h-full w-full border border-black/5 bg-black/[0.03] text-black/35">
              <Icon
                icon={
                  item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'
                }
                size={22}
              />
            </div>
          )
        }
        tooltipText={
          (item.media_type === SEARCH_TYPES.MOVIE || item.media_type === SEARCH_TYPES.TV) &&
          getItemYear(item)
            ? `${title} (${getItemYear(item)})`
            : title
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
