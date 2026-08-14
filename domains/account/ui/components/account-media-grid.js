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
import { AccountReveal } from '@/app/(account)/motion';
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
  extraActions = [],
  isRemoving = false,
  onRemoveItem = null,
  removeLabel = 'Remove item',
}) {
  const handleRemove = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (typeof onRemoveItem === 'function') {
      onRemoveItem();
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {extraActions.map((action, index) => (
        <div key={action.key || `extra-action-${index}`}>{action.node}</div>
      ))}
      {typeof onRemoveItem === 'function' && (
        <Button
          variant="destructive-icon"
          className="center text-error hover:border-error hover:bg-error size-8 border border-white/15 bg-black hover:text-black disabled:cursor-default"
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
                <AccountReveal
                  key={`${card.id}-${pageStart + index}`}
                  deferred
                  interactive
                  itemIndex={index}
                  stage="item.media"
                >
                  <MediaCard
                    href={card.href}
                    className="w-full"
                    imageSrc={card.imageSrc}
                    imageAlt={card.imageAlt}
                    imageSizes="(max-width: 419px) 50vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 16vw"
                    topOverlay={
                      typeof renderOverlay === 'function' ? renderOverlay(card.item) : null
                    }
                    tooltipText={card.tooltipText}
                  />
                </AccountReveal>
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
