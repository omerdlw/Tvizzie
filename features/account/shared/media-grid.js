'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

import MediaCard from '@/features/shared/media-card';
import { MEDIA_CARD_DESTRUCTIVE_ACTION_TONE_CLASS, TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import AccountPagination from './pagination';
import { buildAccountCollectionPageHref, formatPaginationSummaryLabel } from '../utils';
import AccountInlineSectionState from './section-state';
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

export function ProfileMediaActions({
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
    <div className="absolute inset-x-0 top-0 flex justify-end gap-2 p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
      {extraActions.map((action, index) => (
        <button
          key={`${action.label || action.icon || 'media-action'}-${index}`}
          type="button"
          aria-label={action.label}
          className="center size-8 rounded-[10px] border border-black/15 bg-white text-black transition disabled:cursor-default"
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
          className="center size-8 rounded-[10px] border border-black/15 bg-white text-black transition disabled:cursor-default"
          onClick={handleOpenListPicker}
        >
          <Icon icon="solar:list-check-minimalistic-bold" size={12} />
        </button>
      ) : null}

      {typeof onRemoveItem === 'function' ? (
        <Button
          variant="destructive-icon"
          className={`center size-8 ${MEDIA_CARD_DESTRUCTIVE_ACTION_TONE_CLASS} rounded-[10px] disabled:cursor-default`}
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

export default function AccountMediaGridPage({
  currentPage = 1,
  emptyMessage = 'No items yet',
  icon = 'solar:heart-bold',
  items = [],
  onPageChange = null,
  pageBasePath,
  renderHeaderAction = null,
  renderOverlay = null,
  showHeader = true,
  toolbar = null,
  title,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQueryPagination = typeof pageBasePath === 'string' && pageBasePath.includes('?');
  const requestedQueryPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const canControlPagination = typeof onPageChange === 'function';
  const resolvedCurrentPage = canControlPagination
    ? currentPage
    : isQueryPagination && Number.isFinite(requestedQueryPage) && requestedQueryPage > 0
      ? requestedQueryPage
      : currentPage;

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
  const activePage = totalPages ? Math.min(resolvedCurrentPage, totalPages) : 1;
  const pageStart = (activePage - 1) * ITEMS_PER_PAGE;
  const visibleCards = cards.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const paginationSummaryLabel = formatPaginationSummaryLabel({
    pageSize: ITEMS_PER_PAGE,
    startIndex: pageStart,
    totalCount: cards.length,
  });

  useEffect(() => {
    if (!totalPages || resolvedCurrentPage <= totalPages || !pageBasePath) {
      return;
    }

    if (canControlPagination) {
      onPageChange(totalPages);
      return;
    }

    router.replace(buildAccountCollectionPageHref(pageBasePath, totalPages));
  }, [canControlPagination, onPageChange, pageBasePath, resolvedCurrentPage, router, totalPages]);

  return (
    <AccountSectionLayout
      icon={icon}
      showHeader={showHeader}
      summaryLabel={showHeader ? paginationSummaryLabel : null}
      title={title}
      action={typeof renderHeaderAction === 'function' ? renderHeaderAction() : null}
    >
      {toolbar}

      {cards.length === 0 ? (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {visibleCards.map((card, index) => (
              <motion.div
                key={`${card.id}-${pageStart + index}`}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.986 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0, margin: '0px 0px 14% 0px' }}
                transition={{
                  delay: index < 6 ? index * 0.018 : 0,
                  duration: 0.34,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <MediaCard
                  href={card.href}
                  className="w-full"
                  imageSrc={card.imageSrc}
                  imageAlt={card.imageAlt}
                  imageSizes="(max-width: 419px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                  topOverlay={typeof renderOverlay === 'function' ? renderOverlay(card.item) : null}
                  tooltipText={card.tooltipText}
                />
              </motion.div>
            ))}
          </div>

          {totalPages > 1 ? (
            <motion.div
              key={`media-grid-pagination-${activePage}-${totalPages}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <AccountPagination
                className="w-full"
                currentPage={activePage}
                onPageChange={canControlPagination ? onPageChange : null}
                totalPages={totalPages}
                getPageHref={canControlPagination ? null : (page) => buildAccountCollectionPageHref(pageBasePath, page)}
              />
            </motion.div>
          ) : null}
        </>
      )}
    </AccountSectionLayout>
  );
}
