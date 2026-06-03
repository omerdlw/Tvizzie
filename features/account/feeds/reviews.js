'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  REVIEW_FILTER_QUERY_KEYS,
  applyReviewFilters,
  buildCollectionBasePath,
  buildManagedQueryString,
  collectReviewYears,
  hasActiveReviewFilters,
  parsePageFromSearch,
  parseReviewFilters,
  toReviewQueryValues,
} from '@/features/account/filtering';
import { AccountReviewFilterBar } from '@/features/account/filters/content-filter-primitives';
import AccountPagination from '@/features/account/components/pagination';
import { ACCOUNT_EMPTY_SECTION_CLASS } from '@/features/account/components/section-state';
import ReviewList from '@/features/reviews/parts/review-list';
import { Button } from '@/ui/elements';
import AccountSectionLayout from '@/features/account/components/section-wrapper';
const REVIEW_ITEMS_PER_PAGE = 36;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function resolveMediaKey(item) {
  if (item?.mediaKey) return item.mediaKey;
  const entityType = item?.entityType || item?.media_type || null;
  const entityId = String(item?.entityId || item?.id || '').trim();
  return entityType && entityId ? `${entityType}_${entityId}` : null;
}
function buildMediaKeySet(items = [], shouldInclude = () => true) {
  return new Set(items.filter(shouldInclude).map(resolveMediaKey).filter(Boolean));
}

// --------------------------------------------------
// COMPONENT LOGIC & VIEW
// --------------------------------------------------

export default function AccountReviewsFeed({
  currentUserId = null,
  emptyMessage = 'No reviews yet',
  enablePagination = false,
  hasMore = false,
  icon = 'solar:chat-round-bold',
  isLoading = false,
  isLoadingMore = false,
  items = [],
  loadError = null,
  likes = [],
  onDeleteRequest = null,
  onEdit = null,
  onLike,
  onLoadMore = null,
  paginationPageSize = REVIEW_ITEMS_PER_PAGE,
  showHeader = true,
  showOwnActions = false,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
  userProfile = null,
  watchedItems = [],
}) {
  const pathname = usePathname();
  const searchString = useSearchParams()?.toString?.() || '';
  const collectionRootPath = buildCollectionBasePath(pathname);
  const listedReviewCount = Array.isArray(items) ? items.length : 0;

  // URL ve State Senkronizasyonu Birleştirildi
  const [viewState, setViewState] = useState({
    filters: parseReviewFilters(new URLSearchParams(searchString)),
    page: parsePageFromSearch(new URLSearchParams(searchString)),
  });
  useEffect(() => {
    setViewState({
      filters: parseReviewFilters(new URLSearchParams(searchString)),
      page: parsePageFromSearch(new URLSearchParams(searchString)),
    });
  }, [searchString]);
  const updateView = (updates) => {
    setViewState((prev) => {
      const next = {
        ...prev,
        ...updates,
      };
      if (typeof window !== 'undefined') {
        const qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
          managedKeys: REVIEW_FILTER_QUERY_KEYS,
          resetPage: false,
          values: toReviewQueryValues(next.filters),
        });
        const params = new URLSearchParams(qs);
        if (enablePagination && next.page > 1) params.set('page', String(next.page));
        else params.delete('page');
        window.history.replaceState(
          {},
          '',
          params.toString() ? `${collectionRootPath}?${params.toString()}` : collectionRootPath
        );
      }
      return next;
    });
  };

  // Derived Values
  const filteredReviews = useMemo(() => applyReviewFilters(items, viewState.filters), [items, viewState.filters]);
  const safePageSize = Math.max(1, Number.parseInt(String(paginationPageSize), 10) || REVIEW_ITEMS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / safePageSize));
  const resolvedPage = enablePagination ? Math.min(viewState.page, totalPages) : 1;
  const pageStart = enablePagination ? (resolvedPage - 1) * safePageSize : 0;
  const visibleReviews = enablePagination
    ? filteredReviews.slice(pageStart, pageStart + safePageSize)
    : filteredReviews;
  const hasFilters = hasActiveReviewFilters(viewState.filters);
  const resolvedSummaryLabel = hasFilters
    ? `${filteredReviews.length} of ${listedReviewCount} shown`
    : (summaryLabel ?? `${listedReviewCount} Reviews`);
  const likedMediaKeys = useMemo(() => buildMediaKeySet(likes), [likes]);
  const watchedMediaKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const rewatchMediaKeys = useMemo(
    () => buildMediaKeySet(watchedItems, (item) => Number(item?.watchCount || 0) > 1),
    [watchedItems]
  );
  const yearOptions = useMemo(() => collectReviewYears(items), [items]);
  return (
    <AccountSectionLayout
      icon={icon}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {(listedReviewCount > 0 || hasFilters) && (
        <AccountReviewFilterBar
          filters={viewState.filters}
          yearOptions={yearOptions}
          onChange={(filters) =>
            updateView({
              filters: {
                ...viewState.filters,
                ...filters,
              },
              page: 1,
            })
          }
          onReset={
            hasFilters
              ? () =>
                  updateView({
                    filters: parseReviewFilters(new URLSearchParams()),
                    page: 1,
                  })
              : null
          }
        />
      )}

      {filteredReviews.length === 0 && !isLoading && !loadError ? (
        <div className={ACCOUNT_EMPTY_SECTION_CLASS}>
          {hasFilters ? 'No reviews match the current filters' : emptyMessage}
        </div>
      ) : filteredReviews.length === 0 && !isLoading && loadError ? (
        <div className={ACCOUNT_EMPTY_SECTION_CLASS}>{loadError}</div>
      ) : (
        <ReviewList
          currentUserId={currentUserId}
          displayVariant="account"
          isLoading={isLoading && listedReviewCount === 0}
          loadError={listedReviewCount === 0 ? loadError : null}
          onDeleteRequest={onDeleteRequest || (() => {})}
          onEdit={onEdit || (() => {})}
          onLike={onLike}
          likedMediaKeys={likedMediaKeys}
          rewatchMediaKeys={rewatchMediaKeys}
          showOwnActions={showOwnActions}
          showSubject={true}
          sortedReviews={visibleReviews}
          userProfile={userProfile}
          watchedMediaKeys={watchedMediaKeys}
        />
      )}

      {!enablePagination && hasMore && onLoadMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="border border-black/10 bg-white/50 px-6 py-3 text-xs font-semibold tracking-widest text-black/70 uppercase"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </div>
      )}

      {enablePagination && filteredReviews.length > 0 && (
        <AccountPagination
          className="w-full"
          currentPage={resolvedPage}
          onPageChange={(page) =>
            updateView({
              page,
            })
          }
          totalPages={totalPages}
        />
      )}
    </AccountSectionLayout>
  );
}
