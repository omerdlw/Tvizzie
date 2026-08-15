'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MediaCard from '@/domains/media/ui/components/media-card';
import { TMDB_IMG } from '@/shared/constants';
import { useModal } from '@/modules/modal';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-overrides';
import { Button } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import AccountPagination from './account-pagination';
import {
  buildAccountCollectionPageHref,
  formatPaginationSummaryLabel,
} from '@/domains/account/utils';
import { AccountInlineSectionState } from '../sections/account-section';
import AccountSectionLayout, {
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '../sections/account-section';
import { MediaCardsSkeletonGrid } from '../skeletons/account-section-skeletons';
import { useNavigationActions } from '@/modules/nav';
import { useAuth } from '@/modules/auth';
import { createListPickerSurfaceEntry } from '@/domains/account/ui/nav-surfaces/list-picker-surface';
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
      className="pointer-events-auto absolute top-2 right-2 z-10 flex items-center gap-1.5 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100"
    >
      {extraActions.map((action, index) => {
        if (action.node) {
          return <div key={action.key || `extra-action-${index}`}>{action.node}</div>;
        }
        return (
          <button
            key={action.key || `extra-action-${index}`}
            type="button"
            aria-label={action.label}
            title={action.label}
            disabled={action.disabled}
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              action.onClick?.(item);
            }}
            className="center size-8 cursor-pointer bg-black/50 text-white/70 backdrop-blur-md transition-all duration-300 ease-in-out hover:bg-black/70 hover:text-white"
          >
            <Icon icon={action.icon} size={16} />
          </button>
        );
      })}

      {resolvedCurrentUserId && item && (
        <Button
          className="center size-8 cursor-pointer bg-black/50 text-white/70 backdrop-blur-md transition-all duration-300 ease-in-out hover:bg-black/70 hover:text-white"
          aria-label="Add to list"
          title="Add to list"
          onClick={handleAddToList}
        >
          <Icon icon="solar:list-broken" size={16} />
        </Button>
      )}
      {typeof onRemoveItem === 'function' && (
        <Button
          className="hover:text-error center size-8 cursor-pointer bg-black/50 text-white/70 backdrop-blur-md transition-all duration-300 ease-in-out hover:bg-black/70"
          aria-label={removeLabel}
          title={removeLabel}
          disabled={isRemoving}
          onClick={handleRemove}
        >
          <Icon icon="solar:trash-bin-trash-bold" size={16} />
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
  items = [],
  onPageChange = null,
  pageBasePath,
  renderHeaderAction = null,
  renderOverlay = null,
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
          <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {visibleCards.map((card, index) => {
              return (
                <MediaCard
                  key={`${card.id}-${pageStart + index}`}
                  href={card.href}
                  className="w-full"
                  imageSrc={card.imageSrc}
                  imageAlt={card.imageAlt}
                  imageSizes="(max-width: 419px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                  topOverlay={typeof renderOverlay === 'function' ? renderOverlay(card.item) : null}
                  tooltipText={card.tooltipText}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
              <AccountPagination
                currentPage={activePage}
                totalPages={totalPages}
                onPageChange={(page) => {
                  if (canControlPagination) {
                    onPageChange(page);
                  } else if (pageBasePath) {
                    router.push(buildAccountCollectionPageHref(pageBasePath, page));
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </AccountSectionLayout>
  );
}
