'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  REVIEW_FILTER_QUERY_KEYS,
  applyReviewFilters,
  buildCollectionBasePath,
  buildMediaKeySet,
  buildManagedQueryString,
  collectReviewYears,
  hasActiveReviewFilters,
  parsePageFromSearch,
  parseReviewFilters,
  toReviewQueryValues,
} from '@/domains/account/ui/filters/filtering';
import { AccountReviewFilterBar } from '@/domains/account/ui/filters/content-filter-primitives';
import AccountPagination from '@/domains/account/ui/components/account-pagination';
import {
  ACCOUNT_EMPTY_SECTION_CLASS,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import ReviewList from '@/domains/reviews/ui/components/review-list';
import { Button } from '@/ui/primitives';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
import { FilterBarSkeleton } from '@/domains/account/ui/skeletons/account-section-skeletons';
const REVIEW_ITEMS_PER_PAGE = 36;

export default function AccountReviewsFeed({
  baseDelay = 0,
  currentUserId = null,
  emptyMessage = 'No reviews yet',
  enablePagination = false,
  hasMore = false,
  icon = 'solar:chat-round-bold',
  isInitialSection = true,
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
    setViewState((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = buildManagedQueryString(new URLSearchParams(window.location.search), {
      managedKeys: REVIEW_FILTER_QUERY_KEYS,
      resetPage: false,
      values: toReviewQueryValues(viewState.filters),
    });
    const params = new URLSearchParams(qs);
    if (enablePagination && viewState.page > 1) params.set('page', String(viewState.page));
    else params.delete('page');
    const newUrl = params.toString()
      ? `${collectionRootPath}?${params.toString()}`
      : collectionRootPath;
    if (window.location.pathname + window.location.search !== newUrl) {
      window.history.replaceState({}, '', newUrl);
    }
  }, [viewState, collectionRootPath, enablePagination]);

  const filteredReviews = useMemo(
    () => applyReviewFilters(items, viewState.filters),
    [items, viewState.filters],
  );
  const safePageSize = Math.max(
    1,
    Number.parseInt(String(paginationPageSize), 10) || REVIEW_ITEMS_PER_PAGE,
  );
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
    [watchedItems],
  );
  const yearOptions = useMemo(() => collectReviewYears(items), [items]);
  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
      toolbar={
        isLoading && listedReviewCount === 0 ? (
          <FilterBarSkeleton />
        ) : listedReviewCount > 0 || hasFilters ? (
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
        ) : null
      }
    >
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
          isInitialSection={isInitialSection}
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
          accountMotion
        />
      )}

      {!enablePagination && hasMore && onLoadMore && (
        <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="border border-white/10 bg-black/50 px-6 py-3 text-xs font-semibold tracking-widest text-white/70 uppercase"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </div>
      )}

      {enablePagination && filteredReviews.length > 0 && (
        <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
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
        </div>
      )}
    </AccountSectionLayout>
  );
}
