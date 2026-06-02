'use client';

import { useMemo, useState } from 'react';

import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import AccountInlineSectionState from '@/features/account/components/section-state';
import AccountSectionLayout from '@/features/account/components/section-wrapper';

const OVERVIEW_ROW_CARD_LIMIT = 6;

function getWatchlistType(item) {
  const explicitType = item?.media_type || item?.entityType;

  if (explicitType === 'movie' || explicitType === 'tv') {
    return explicitType;
  }

  return null;
}

function getWatchlistTitle(item) {
  return item?.title || item?.original_title || item?.name || item?.original_name || 'Untitled';
}

function getWatchlistYear(item) {
  return item?.release_date?.slice?.(0, 4) || item?.first_air_date?.slice?.(0, 4) || null;
}

function getWatchlistPoster(item) {
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

export default function AccountWatchlistOverview({
  emptyMessage = 'Watchlist empty',
  icon = 'solar:bookmark-bold',
  isOwner = false,
  items = [],
  onRemoveItem,
  renderOverlay = null,
  showSeeMore = false,
  summaryLabel = null,
  title = 'Watchlist',
  titleHref = null,
  username,
}) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const [pendingItemId, setPendingItemId] = useState(null);

  const cards = useMemo(
    () =>
      items
        .map((item) => {
          const mediaType = getWatchlistType(item);
          const detailId = item?.entityId || item?.id;

          if (!detailId || !mediaType) {
            return null;
          }

          const title = getWatchlistTitle(item);
          const year = getWatchlistYear(item);

          return {
            href: `/${mediaType}/${detailId}`,
            id: item?.mediaKey || `${mediaType}-${detailId}`,
            imageAlt: title,
            imageSrc: getWatchlistPoster(item),
            item,
            tooltipText: year ? `${title} (${year})` : title,
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
      titleHref={titleHref || (username ? `/account/${username}/watchlist` : null)}
    >
      {cards.length > 0 ? (
        <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
          {cards.slice(0, OVERVIEW_ROW_CARD_LIMIT).map((card, index) => (
            <div key={`${card.id}-${index}`} className="flex h-full min-w-0 flex-col">
              <MediaCard
                href={card.href}
                className="w-full md:w-full lg:w-full"
                imageSrc={card.imageSrc}
                imageAlt={card.imageAlt}
                imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                topOverlay={
                  typeof renderOverlay === 'function' ? (
                    renderOverlay(card.item)
                  ) : isOwner && typeof onRemoveItem === 'function' ? (
                    <div className="absolute inset-x-0 top-0 flex justify-end p-2">
                      <Button
                        variant="destructive-icon"
                        className={
                          'text-error hover:border-error hover:bg-error border border-black/15 bg-white hover:text-white'
                        }
                        aria-label={`Remove ${card.imageAlt} from ${title.toLowerCase()}`}
                        disabled={pendingItemId === card.id}
                        onClick={async (event) => {
                          event.preventDefault();
                          event.stopPropagation();

                          if (pendingItemId === card.id) {
                            return;
                          }

                          setPendingItemId(card.id);

                          try {
                            await onRemoveItem(card.item);
                          } finally {
                            setPendingItemId((currentId) => (currentId === card.id ? null : currentId));
                          }
                        }}
                      >
                        <Icon
                          icon="solar:trash-bin-trash-bold"
                          size={16}
                          className={pendingItemId === card.id ? 'animate-pulse' : ''}
                        />
                      </Button>
                    </div>
                  ) : null
                }
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
