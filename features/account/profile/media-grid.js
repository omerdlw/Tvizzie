'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import MediaCard from '@/features/shared/media-card';
import { MEDIA_CARD_DESTRUCTIVE_ACTION_TONE_CLASS, TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import { cn } from '@/core/utils';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import AccountSectionLayout from './section-wrapper';

const ITEMS_PER_PAGE = 36;

function getMediaType(item) {
  const explicitType = item?.media_type || item?.entityType;

  if (explicitType === 'movie') {
    return explicitType;
  }

  return null;
}

function getMediaTitle(item) {
  return item?.title || item?.original_title || 'Untitled';
}

function getMediaYear(item) {
  return item?.release_date?.slice?.(0, 4) || null;
}

function getMediaPoster(item) {
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }

  if (item?.poster_path) {
    return `${TMDB_IMG}/w342${item.poster_path}`;
  }

  return null;
}

export function AccountProfileMediaActions({
  extraActions = [],
  media,
  onRemoveItem = null,
  removeLabel = 'Remove item',
  userId = null,
}) {
  const { openModal } = useModal();
  const [isRemoving, setIsRemoving] = useState(false);

  const handleOpenListPicker = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!userId || !media) {
        return;
      }

      openModal('LIST_PICKER_MODAL', 'center', {
        data: {
          media,
          userId,
        },
      });
    },
    [media, openModal, userId]
  );

  const handleRemove = useCallback(
    async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isRemoving || typeof onRemoveItem !== 'function') {
        return;
      }

      setIsRemoving(true);

      try {
        await onRemoveItem(media);
      } finally {
        setIsRemoving(false);
      }
    },
    [isRemoving, media, onRemoveItem]
  );

  return (
    <div className="absolute inset-x-0 top-0 flex justify-end gap-2 p-2">
      {extraActions.map((action, index) => (
        <button
          key={`${action.label || action.icon || 'media-action'}-${index}`}
          type="button"
          aria-label={action.label}
          className="center size-8 rounded-[8px] border border-black/15 bg-white/90 text-black backdrop-blur-lg transition disabled:cursor-default"
          disabled={Boolean(action.disabled)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            action.onClick?.(media);
          }}
        >
          <Icon icon={action.icon} size={12} />
        </button>
      ))}

      {userId ? (
        <button
          type="button"
          aria-label="Add to list"
          className="center size-8 rounded-[8px] border border-black/15 bg-white/90 text-black backdrop-blur-lg transition disabled:cursor-default"
          onClick={handleOpenListPicker}
        >
          <Icon icon="solar:list-check-minimalistic-bold" size={12} />
        </button>
      ) : null}

      {typeof onRemoveItem === 'function' ? (
        <Button
          variant="destructive-icon"
          className={`center size-8 rounded-[8px] ${MEDIA_CARD_DESTRUCTIVE_ACTION_TONE_CLASS} backdrop-blur-lg disabled:cursor-default`}
          aria-label={removeLabel}
          disabled={isRemoving}
          onClick={handleRemove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} className={isRemoving ? 'animate-pulse' : ''} />
        </Button>
      ) : null}
    </div>
  );
}

export function buildAccountCollectionPageHref(basePath, pageNumber) {
  if (!basePath) {
    return '';
  }

  if (basePath.includes('?')) {
    const [pathname, search = ''] = basePath.split('?');
    const params = new URLSearchParams(search);

    if (pageNumber <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(pageNumber));
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  if (pageNumber <= 1) {
    return basePath;
  }

  return `${basePath}/page/${pageNumber}`;
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push('start-ellipsis');
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push('end-ellipsis');
  }

  items.push(totalPages);

  return items;
}

export default function AccountMediaGridPage({
  currentPage = 1,
  emptyMessage = 'No items yet',
  icon = 'solar:heart-bold',
  items = [],
  pageBasePath,
  renderHeaderAction = null,
  renderOverlay = null,
  title,
}) {
  const router = useRouter();

  const cards = useMemo(() => {
    return items
      .map((item) => {
        const mediaType = getMediaType(item);
        const detailId = item?.entityId || item?.id;

        if (!detailId || mediaType !== 'movie') {
          return null;
        }

        const mediaTitle = getMediaTitle(item);
        const year = getMediaYear(item);

        return {
          href: `/${mediaType}/${detailId}`,
          id: item?.mediaKey || `${mediaType}-${detailId}`,
          imageAlt: mediaTitle,
          imageSrc: getMediaPoster(item),
          item,
          tooltipText: year ? `${mediaTitle} (${year})` : mediaTitle,
        };
      })
      .filter(Boolean);
  }, [items]);

  const totalPages = cards.length ? Math.ceil(cards.length / ITEMS_PER_PAGE) : 0;
  const activePage = totalPages ? Math.min(currentPage, totalPages) : 1;
  const pageStart = (activePage - 1) * ITEMS_PER_PAGE;
  const visibleCards = cards.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const paginationItems = getPaginationItems(activePage, totalPages);

  useEffect(() => {
    if (!totalPages || currentPage <= totalPages || !pageBasePath) {
      return;
    }

    router.replace(buildAccountCollectionPageHref(pageBasePath, totalPages));
  }, [currentPage, pageBasePath, router, totalPages]);

  return (
    <AccountSectionLayout
      icon={icon}
      summaryLabel={
        cards.length === 0
          ? '0 items'
          : `${pageStart + 1}-${Math.min(pageStart + ITEMS_PER_PAGE, cards.length)} of ${cards.length}`
      }
      title={title}
      action={typeof renderHeaderAction === 'function' ? renderHeaderAction() : null}
    >
      {cards.length === 0 ? (
        <div className="border border-black/15 bg-white/40 p-4 text-sm text-black/70 backdrop-blur-sm">
          {emptyMessage}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {visibleCards.map((card, index) => (
              <MediaCard
                key={`${card.id}-${pageStart + index}`}
                href={card.href}
                className="w-full"
                imageSrc={card.imageSrc}
                imageAlt={card.imageAlt}
                imageSizes="(max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                topOverlay={typeof renderOverlay === 'function' ? renderOverlay(card.item) : null}
                tooltipText={card.tooltipText}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {activePage > 1 ? (
                <Link
                  href={buildAccountCollectionPageHref(pageBasePath, activePage - 1)}
                  className="center size-12 border border-black/15 bg-white/50 text-xs font-semibold text-black/70 transition"
                >
                  <Icon size={16} icon="solar:skip-previous-bold" />
                </Link>
              ) : null}

              {paginationItems.map((item, index) =>
                typeof item === 'number' ? (
                  <Link
                    key={item}
                    href={buildAccountCollectionPageHref(pageBasePath, item)}
                    aria-current={item === activePage ? 'page' : undefined}
                    className={cn(
                      'center size-12 border text-xs font-semibold transition',
                      item === activePage
                        ? 'border-black/30 bg-white/90 text-black shadow-sm'
                        : 'border-black/15 bg-white/50 text-black/70'
                    )}
                  >
                    {item}
                  </Link>
                ) : (
                  <span key={`${item}-${index}`} className="text-xs">
                    ...
                  </span>
                )
              )}

              {activePage < totalPages ? (
                <Link
                  href={buildAccountCollectionPageHref(pageBasePath, activePage + 1)}
                  className="center size-12 border border-black/15 bg-white/50 text-xs font-semibold text-black/70 transition"
                >
                  <Icon size={16} icon="solar:skip-next-bold" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </AccountSectionLayout>
  );
}
