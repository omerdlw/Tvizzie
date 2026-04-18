'use client';

import { useMemo } from 'react';

import MediaCard from '@/features/shared/media-card';
import { TMDB_IMG } from '@/core/constants';
import { cn } from '@/core/utils';
import AccountSectionLayout from '../shared/section-wrapper';

const OVERVIEW_ROW_CARD_LIMIT = 6;

function getWatchedType(item) {
  const explicitType = item?.media_type || item?.entityType;

  if (explicitType === 'movie') {
    return explicitType;
  }

  return null;
}

function getWatchedTitle(item) {
  return item?.title || item?.original_title || 'Untitled';
}

function getWatchedYear(item) {
  return item?.release_date?.slice?.(0, 4) || null;
}

function getWatchedPoster(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

export default function AccountWatchedOverview({
  emptyMessage = 'No watched films yet',
  icon = 'solar:eye-bold',
  items = [],
  renderOverlay = null,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Watched',
  titleHref = null,
  username,
}) {
  const cards = useMemo(
    () =>
      items
        .map((item) => {
          const mediaType = getWatchedType(item);
          const detailId = item?.entityId || item?.id;

          if (!detailId || mediaType !== 'movie') {
            return null;
          }

          const watchedTitle = getWatchedTitle(item);
          const year = getWatchedYear(item);

          return {
            href: `/${mediaType}/${detailId}`,
            id: item?.mediaKey || `${mediaType}-${detailId}`,
            imageAlt: watchedTitle,
            imageSrc: getWatchedPoster(item),
            item,
            tooltipText: year ? `${watchedTitle} (${year})` : watchedTitle,
          };
        })
        .filter(Boolean),
    [items]
  );

  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={summaryLabel}
      title={title}
      titleHref={titleHref || (username ? `/account/${username}/watched` : null)}
    >
      {cards.length > 0 ? (
        <div className="flex gap-3 overflow-hidden">
          {cards.slice(0, OVERVIEW_ROW_CARD_LIMIT).map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className={cn(
                'flex h-full shrink-0 basis-[calc((100%-24px)/3)] flex-col lg:basis-[calc((100%-60px)/6)]',
                index >= 3 && 'hidden lg:block'
              )}
            >
              <MediaCard
                href={card.href}
                className="w-full md:w-full lg:w-full"
                imageSrc={card.imageSrc}
                imageAlt={card.imageAlt}
                imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                topOverlay={typeof renderOverlay === 'function' ? renderOverlay(card.item) : null}
                tooltipText={card.tooltipText}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-primary rounded-[10px] border border-black/5 p-3 text-black/50">{emptyMessage}</div>
      )}
    </AccountSectionLayout>
  );
}
