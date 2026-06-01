'use client';

import { useMemo } from 'react';

import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import AccountInlineSectionState from '@/features/account/components/section-state';
import AccountSectionLayout from '@/features/account/components/section-wrapper';

const OVERVIEW_ROW_CARD_LIMIT = 6;

function getWatchedType(item) {
  const explicitType = item?.media_type || item?.entityType;

  if (explicitType === 'movie' || explicitType === 'tv') {
    return explicitType;
  }

  return null;
}

function getWatchedTitle(item) {
  return item?.title || item?.original_title || item?.name || item?.original_name || 'Untitled';
}

function getWatchedYear(item) {
  return item?.release_date?.slice?.(0, 4) || item?.first_air_date?.slice?.(0, 4) || null;
}

function getWatchedPoster(item) {
  const mediaType = item?.media_type || item?.entityType;
  const preferredPoster = mediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
  if (preferredPoster) {
    return preferredPoster;
  }

  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

export default function AccountWatchedOverview({
  emptyMessage = 'No watched titles yet',
  icon = 'solar:eye-bold',
  items = [],
  renderOverlay = null,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Watched',
  titleHref = null,
  username,
}) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const cards = useMemo(
    () =>
      items
        .map((item) => {
          const mediaType = getWatchedType(item);
          const detailId = item?.entityId || item?.id;

          if (!detailId || !mediaType) {
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
    [items, posterPreferenceVersion]
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
        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
          {cards.slice(0, OVERVIEW_ROW_CARD_LIMIT).map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className="flex h-full min-w-0 flex-col"
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
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      )}
    </AccountSectionLayout>
  );
}
