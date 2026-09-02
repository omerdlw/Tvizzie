'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MediaCard from '@/ui/components/media-card';
import { TMDB_IMG } from '@/shared';
import { useModal } from '@/modules/modal';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/ui/class-names';
import AccountPagination from './account-pagination';
import {
  buildAccountCollectionPageHref,
  formatPaginationSummaryLabel,
} from '@/domains/account/utils/formatting';
import { AccountInlineSectionState } from '../sections/account-section';
import AccountSectionLayout from '../sections/account-section';
import { MediaCardsSkeletonGrid } from '../skeletons';
import { useNavigationActions } from '@/modules/nav';
import { useAuth } from '@/modules/auth';
import { createListPickerSurfaceEntry } from '@/domains/shell/navigation/surfaces/list-picker-surface';
import { createListItemPayload } from '@/domains/account/utils/media-card';
const ITEMS_PER_PAGE = 36;

function createPosterSource(item, mediaType) {
  const normalizedMediaType = String(mediaType || '')
    .trim()
    .toLowerCase();
  const preferredPoster =
    normalizedMediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
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

export function getListItemKey(item) {
  if (!item) return '';
  if (item.mediaKey) return String(item.mediaKey);
  if (item.media_key) return String(item.media_key);
  const type = String(item.entityType || item.media_type || item.type || 'movie').toLowerCase();
  const id = String(item.entityId || item.id || '').replace(/^(movie|tv)[_-]/, '');
  if (id) return `${type}_${id}`;
  return String(item.id || '');
}

export function ProfileMediaActions({
  item,
  extraActions = [],
  isRemoving = false,
  onRemoveItem = null,
  removeLabel = 'Remove item',
  currentUserId = null,
}) {
  const { openSurface } = useNavigationActions();
  const auth = useAuth();
  const resolvedCurrentUserId = currentUserId || auth.user?.id || null;

  const handleRemove = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (typeof onRemoveItem === 'function') {
      onRemoveItem(item);
    }
  };

  const handleAddToList = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (resolvedCurrentUserId && item) {
      const resolvedMedia = createListItemPayload(item);
      openSurface(
        createListPickerSurfaceEntry({ userId: resolvedCurrentUserId, media: resolvedMedia }),
      );
    }
  };

  return (
    <div
      className="flex items-center gap-1 transition-all duration-300 ease-in-out opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onMouseUp={(event) => {
        event.stopPropagation();
      }}
    >
      {extraActions.map((action, index) => {
        if (action.node) {
          return <div key={action.key || `extra-action-${index}`}>{action.node}</div>;
        }
        return (
          <Button
            key={action.key || `extra-action-${index}`}
            type="button"
            aria-label={action.label}
            title={action.label}
            disabled={action.disabled}
            className="center size-7 rounded-full text-white/70 transition-colors bg-black/60 hover:bg-black/80 backdrop-blur-sm hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              action.onClick?.(item);
            }}
          >
            <Icon icon={action.icon} size={14} />
          </Button>
        );
      })}

      {resolvedCurrentUserId && item && (
        <Button
          type="button"
          aria-label="Add to list"
          title="Add to list"
          className="center size-7 rounded-full text-white/70 transition-colors bg-black/60 hover:bg-black/80 backdrop-blur-sm hover:text-white"
          onClick={handleAddToList}
        >
          <Icon icon="solar:list-broken" size={14} />
        </Button>
      )}
      {typeof onRemoveItem === 'function' && (
        <Button
          type="button"
          aria-label={removeLabel}
          title={removeLabel}
          disabled={isRemoving}
          className="center size-7 rounded-full text-error/70 transition-colors bg-black/60 hover:bg-black/80 backdrop-blur-sm hover:text-error"
          onClick={handleRemove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={14} />
        </Button>
      )}
    </div>
  );
}

export default function AccountMediaGridPage({
  baseDelay = 0,
  currentPage = 1,
  emptyMessage = 'No items yet',
  icon = 'solar:heart-bold',
  isInitialSection = true,
  isLoading = false,
  isSelectionMode = false,
  items = [],
  onPageChange = null,
  onToggleSelect = null,
  pageBasePath,
  renderHeaderAction = null,
  renderOverlay = null,
  selectedKeys = [],
  showHeader = true,
  showTopRule = true,
  toolbar = null,
  title,
}) {
  const posterPreferenceVersion = usePosterPreferenceVersion();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isQueryPagination = typeof pageBasePath === 'string' && pageBasePath.includes('?');
  const requestedQueryPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const canControlPagination = typeof onPageChange === 'function';
  const resolvedCurrentPage = canControlPagination
    ? currentPage
    : isQueryPagination && requestedQueryPage > 0
      ? requestedQueryPage
      : currentPage;
  const cards = useMemo(
    () => items.map(extractMediaDetails).filter(Boolean),
    [items, posterPreferenceVersion],
  );
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
      isInitialSection={isInitialSection}
      showHeader={showHeader}
      showTopRule={showTopRule}
      summaryLabel={showHeader ? paginationSummaryLabel : null}
      title={title}
      action={typeof renderHeaderAction === 'function' ? renderHeaderAction() : null}
      toolbar={toolbar}
    >
      {isLoading && cards.length === 0 ? (
        <MediaCardsSkeletonGrid />
      ) : cards.length === 0 ? (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {visibleCards.map((card, index) => {
              const cardKey = getListItemKey(card.item) || card.id;
              const isSelected =
                isSelectionMode &&
                (selectedKeys instanceof Set
                  ? selectedKeys.has(cardKey)
                  : Array.isArray(selectedKeys)
                    ? selectedKeys.includes(cardKey)
                    : false);

              const topOverlayNode = isSelectionMode ? (
                <div
                  className={cn(
                    'flex size-7 items-center justify-center rounded-xl ring-1 ring-inset shadow-lg transition-all duration-200',
                    isSelected
                      ? 'ring-info bg-info text-black font-bold scale-105 shadow-info/30'
                      : 'ring-white/15 bg-black/80 text-white/50 group-hover:ring-white/50 group-hover:text-white',
                  )}
                >
                  <Icon icon="material-symbols:check-rounded" size={18} />
                </div>
              ) : typeof renderOverlay === 'function' ? (
                renderOverlay(card.item)
              ) : null;

              const selectionOverlay =
                isSelectionMode && isSelected ? (
                  <div className="pointer-events-none absolute inset-0 z-10 rounded-[20px] bg-info/20 ring-2 ring-info ring-inset transition-colors" />
                ) : null;

              return (
                <MediaCard
                  key={`${card.id}-${pageStart + index}`}
                  href={isSelectionMode ? undefined : card.href}
                  onClick={
                    isSelectionMode
                      ? (event) => {
                          event?.preventDefault?.();
                          event?.stopPropagation?.();
                          onToggleSelect?.(card.item);
                        }
                      : undefined
                  }
                  className={cn(
                    'transition-all duration-200',
                    isSelectionMode && 'cursor-pointer select-none',
                    isSelected && 'scale-[0.98]',
                  )}
                  imageSrc={card.imageSrc}
                  imageAlt={card.imageAlt}
                  imageSizes="(max-width: 419px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                  overlay={selectionOverlay}
                  topOverlay={topOverlayNode}
                  tooltipText={isSelectionMode ? undefined : card.tooltipText}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <AccountPagination
                currentPage={activePage}
                totalPages={totalPages}
                onPageChange={canControlPagination ? onPageChange : null}
                getPageHref={
                  canControlPagination
                    ? null
                    : (page) => buildAccountCollectionPageHref(pageBasePath, page)
                }
              />
            </div>
          )}
        </>
      )}
    </AccountSectionLayout>
  );
}
