'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MediaCard from '@/ui/media/media-card';
import { TMDB_IMG } from '@/core/constants';
import { useModal } from '@/core/modules/modal/context';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
import AccountPagination from './pagination';
import { buildAccountCollectionPageHref, formatPaginationSummaryLabel } from '../utils';
import AccountInlineSectionState from './section-state';
import AccountSectionLayout from './section-wrapper';

// --------------------------------------------------
// CONSTANTS & HELPERS
// --------------------------------------------------

const ITEMS_PER_PAGE = 36;
function createPosterSource(item, mediaType) {
  const normalizedMediaType = String(mediaType || '')
    .trim()
    .toLowerCase();
  const preferredPoster = normalizedMediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
  if (preferredPoster) {
    return preferredPoster;
  }
  if (item?.poster_path_full) {
    return item.poster_path_full;
  }
  const posterFilePath = item?.poster_path || item?.profile_path || null;
  return posterFilePath ? `${TMDB_IMG}/w342${posterFilePath}` : null;
}
function extractMediaDetails(item) {
  const explicitType = String(item?.media_type || item?.entityType || '')
    .trim()
    .toLowerCase();
  if (!explicitType) return null;
  const detailId = item?.entityId || item?.id;
  if (!detailId) return null;
  const title = item?.title || item?.name || item?.original_title || 'Untitled';
  const year = item?.release_date?.slice?.(0, 4) || item?.first_air_date?.slice?.(0, 4) || null;
  const poster = createPosterSource(item, explicitType);
  return {
    href: `/${explicitType}/${detailId}`,
    id: item?.mediaKey || `${explicitType}-${detailId}`,
    imageAlt: title,
    imageSrc: poster,
    item,
    tooltipText: year ? `${title}(${year})` : title,
  };
}

// --------------------------------------------------
// COMPONENTS (LOGIC & VIEW)
// --------------------------------------------------

export function ProfileMediaActions({
  extraActions = [],
  media,
  onRemoveItem = null,
  removeLabel = 'Remove item',
  userId = null,
}) {
  const { openModal } = useModal();
  const [isRemoving, setIsRemoving] = useState(false);
  const handleOpenListPicker = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (userId && media)
      openModal('LIST_PICKER_MODAL', 'center', {
        data: {
          media,
          userId,
        },
      });
  };
  const handleRemove = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isRemoving || typeof onRemoveItem !== 'function') return;
    setIsRemoving(true);
    try {
      await onRemoveItem(media);
    } finally {
      setIsRemoving(false);
    }
  };
  return (
    <div className="absolute inset-x-0 top-0 flex justify-end gap-2 p-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
      {extraActions.map((action, index) => (
        <button
          key={`${action.label || action.icon || 'media-action'}-${index}`}
          type="button"
          aria-label={action.label}
          className="center size-8 border border-black/15 bg-white text-black disabled:cursor-default"
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

      {userId && (
        <button
          type="button"
          aria-label="Add to list"
          className="center size-8 border border-black/15 bg-white text-black disabled:cursor-default"
          onClick={handleOpenListPicker}
        >
          <Icon icon="solar:list-check-minimalistic-bold" size={12} />
        </button>
      )}

      {typeof onRemoveItem === 'function' && (
        <Button
          variant="destructive-icon"
          className="center text-error hover:border-error hover:bg-error size-8 border border-black/15 bg-white hover:text-white disabled:cursor-default"
          aria-label={removeLabel}
          disabled={isRemoving}
          onClick={handleRemove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} className={isRemoving ? '' : ''} />
        </Button>
      )}
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
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pagination Logic
  const isQueryPagination = typeof pageBasePath === 'string' && pageBasePath.includes('?');
  const requestedQueryPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const canControlPagination = typeof onPageChange === 'function';
  const resolvedCurrentPage = canControlPagination
    ? currentPage
    : isQueryPagination && requestedQueryPage > 0
      ? requestedQueryPage
      : currentPage;
  const cards = useMemo(() => items.map(extractMediaDetails).filter(Boolean), [items, posterPreferenceVersion]);
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
    if (!totalPages || resolvedCurrentPage <= totalPages || !pageBasePath) return;
    if (canControlPagination) {
      onPageChange(totalPages);
    } else {
      router.replace(buildAccountCollectionPageHref(pageBasePath, totalPages));
    }
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
              <div key={`${card.id}-${pageStart + index}`}>
                <MediaCard
                  href={card.href}
                  className="w-full"
                  imageSrc={card.imageSrc}
                  imageAlt={card.imageAlt}
                  imageSizes="(max-width: 419px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                  topOverlay={typeof renderOverlay === 'function' ? renderOverlay(card.item) : null}
                  tooltipText={card.tooltipText}
                />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div key={`media-grid-pagination-${activePage}-${totalPages}`}>
              <AccountPagination
                className="w-full"
                currentPage={activePage}
                onPageChange={canControlPagination ? onPageChange : null}
                totalPages={totalPages}
                getPageHref={canControlPagination ? null : (page) => buildAccountCollectionPageHref(pageBasePath, page)}
              />
            </div>
          )}
        </>
      )}
    </AccountSectionLayout>
  );
}
