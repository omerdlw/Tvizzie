'use client';

import Link from 'next/link';

import MediaCard from '@/features/shared/media-card';
import { TMDB_IMG } from '@/core/constants';
import { applyAvatarFallback, cn, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import Icon from '@/ui/icon';

import { SEARCH_TYPES } from '../constants';
import { getDetailPath, getImagePath, getItemDirector, getItemTitle, getItemYear } from '../utils';

function getPrimaryMeta(item) {
  if (item.media_type === SEARCH_TYPES.USER) {
    return item.username ? `@${item.username}` : 'USER';
  }

  if (item.media_type === SEARCH_TYPES.PERSON) {
    return item.known_for_department || 'PERSON';
  }

  return getItemYear(item) || 'MOVIE';
}

function getSecondaryMeta(item) {
  if (item.media_type === SEARCH_TYPES.MOVIE) {
    return getItemDirector(item);
  }

  if (item.media_type === SEARCH_TYPES.PERSON) {
    return item.known_for?.[0]?.title || item.known_for?.[0]?.name || null;
  }

  if (item.media_type === SEARCH_TYPES.USER) {
    return item.displayName && item.username && item.displayName !== item.username ? item.displayName : null;
  }

  return null;
}

function getImageSrc(item) {
  if (item.media_type === SEARCH_TYPES.USER) {
    return null;
  }

  const imagePath = getImagePath(item);

  return imagePath ? `${TMDB_IMG}/w342${imagePath}` : null;
}

function UserAvatar({ item, title }) {
  const fallbackSrc = getUserAvatarFallbackUrl(item);
  const avatarSrc = getUserAvatarUrl(item) || fallbackSrc;

  return (
    <div className="center h-full w-full border border-black/5 bg-black/[0.03]">
      <img
        className="h-full w-full object-cover"
        src={avatarSrc}
        alt={title}
        onError={(event) => applyAvatarFallback(event, fallbackSrc)}
      />
    </div>
  );
}

export default function SearchGridItem({ item, onSelect }) {
  const title = getItemTitle(item);
  const detailPath = getDetailPath(item);
  const primaryMeta = getPrimaryMeta(item);
  const secondaryMeta = getSecondaryMeta(item);
  const imageSrc = getImageSrc(item);
  const hasDetailPath = Boolean(detailPath);
  const cardContent = (
    <>
      <MediaCard
        className={cn(
          'w-full overflow-hidden border border-black/10 transition-transform duration-(--motion-duration-fast)'
        )}
        imageSrc={imageSrc}
        imageAlt={title}
        imageSizes="(max-width: 1023px) 16.66vw, 8.33vw"
        fallbackIcon={item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'}
        fallbackContent={
          item.media_type === SEARCH_TYPES.USER ? (
            <UserAvatar item={item} title={title} />
          ) : (
            <div className="center h-full w-full border border-black/5 bg-black/[0.03] text-black/35">
              <Icon
                icon={item.media_type === SEARCH_TYPES.PERSON ? 'solar:user-bold' : 'solar:gallery-bold'}
                size={22}
              />
            </div>
          )
        }
        tooltipText={title}
      />

      <div className="min-w-0">
        <p className="truncate text-[12px] leading-tight font-semibold text-black">{title}</p>
        <p className="truncate text-[10px] font-medium text-black/65 uppercase">{primaryMeta}</p>
        {secondaryMeta ? <p className="truncate text-[10px] text-black/55">{secondaryMeta}</p> : null}
      </div>
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
