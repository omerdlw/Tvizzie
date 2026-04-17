'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';

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
import { AccountReviewFilterBar } from '@/features/account/shared/content-filters';
import AccountPagination from '@/features/account/shared/pagination';
import ReviewList from '@/features/reviews/parts/review-list';
import { Button } from '@/ui/elements';
import AccountSectionLayout from '../shared/section-wrapper';

const REVIEW_ITEMS_PER_PAGE = 36;
const EMPTY_STATE_CLASS = 'border border-black/10 p-4 text-sm text-black/70 backdrop-blur-sm';

function resolveMediaKey(item) {
  if (item?.mediaKey) {
    return item.mediaKey;
  }

  const entityType = item?.entityType || item?.media_type || null;
  const entityId = String(item?.entityId || item?.id || '').trim();

  if (!entityType || !entityId) {
    return null;
  }

  return `${entityType}_${entityId}`;
}

function buildMediaKeySet(items = [], shouldInclude = () => true) {
  return new Set(
    items
      .filter((item) => shouldInclude(item))
      .map((item) => resolveMediaKey(item))
      .filter(Boolean)
  );
}

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
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString?.() || '';
  const reduceMotion = useReducedMotion();
  const listedReviewCount = Array.isArray(items) ? items.length : 0;
  const collectionRootPath = useMemo(() => buildCollectionBasePath(pathname), [pathname]);
  const initialReviewFilters = useMemo(
    () => parseReviewFilters(new URLSearchParams(searchParamsKey)),
    [searchParamsKey]
  );
  const initialPage = useMemo(() => parsePageFromSearch(new URLSearchParams(searchParamsKey)), [searchParamsKey]);
  const [reviewFilters, setReviewFilters] = useState(initialReviewFilters);
  const [activePage, setActivePage] = useState(initialPage);
  const yearOptions = useMemo(() => collectReviewYears(items), [items]);
  const filteredReviews = useMemo(() => applyReviewFilters(items, reviewFilters), [items, reviewFilters]);
  const filteredReviewCount = filteredReviews.length;
  const safePageSize = Math.max(1, Number.parseInt(String(paginationPageSize), 10) || REVIEW_ITEMS_PER_PAGE);
  const hasFilters = hasActiveReviewFilters(reviewFilters);
  const totalPages = filteredReviewCount > 0 ? Math.ceil(filteredReviewCount / safePageSize) : 1;
  const resolvedPage = enablePagination ? Math.min(activePage, totalPages) : 1;
  const pageStart = enablePagination ? (resolvedPage - 1) * safePageSize : 0;
  const visibleReviews = useMemo(
    () => (enablePagination ? filteredReviews.slice(pageStart, pageStart + safePageSize) : filteredReviews),
    [enablePagination, filteredReviews, pageStart, safePageSize]
  );
  const resolvedSummaryLabel = useMemo(() => {
    if (!hasFilters) {
      return summaryLabel === null ? `${listedReviewCount} Reviews` : summaryLabel;
    }

    return `${filteredReviewCount} of ${listedReviewCount} shown`;
  }, [filteredReviewCount, hasFilters, listedReviewCount, summaryLabel]);
  const likedMediaKeys = useMemo(() => buildMediaKeySet(likes), [likes]);
  const watchedMediaKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const rewatchMediaKeys = useMemo(
    () => buildMediaKeySet(watchedItems, (item) => Number(item?.watchCount || 0) > 1),
    [watchedItems]
  );

  useEffect(() => {
    setReviewFilters(initialReviewFilters);
    setActivePage(initialPage);
  }, [initialPage, initialReviewFilters]);

  const updateUrl = useCallback(
    (nextFilters, nextPage) => {
      if (typeof window === 'undefined') {
        return;
      }

      const queryString = buildManagedQueryString(new URLSearchParams(window.location.search), {
        managedKeys: REVIEW_FILTER_QUERY_KEYS,
        resetPage: false,
        values: toReviewQueryValues(nextFilters),
      });
      const params = new URLSearchParams(queryString);

      if (enablePagination && nextPage > 1) {
        params.set('page', String(nextPage));
      } else {
        params.delete('page');
      }

      const nextQuery = params.toString();
      window.history.replaceState({}, '', nextQuery ? `${collectionRootPath}?${nextQuery}` : collectionRootPath);
    },
    [collectionRootPath, enablePagination]
  );

  useEffect(() => {
    if (!enablePagination || activePage <= totalPages) {
      return;
    }

    setActivePage(totalPages);
    updateUrl(reviewFilters, totalPages);
  }, [activePage, enablePagination, reviewFilters, totalPages, updateUrl]);

  const updateFilters = useCallback(
    (updates = {}) => {
      const nextFilters = {
        ...reviewFilters,
        ...updates,
      };
      setReviewFilters(nextFilters);
      setActivePage(1);
      updateUrl(nextFilters, 1);
    },
    [reviewFilters, updateUrl]
  );

  const resetFilters = useCallback(() => {
    const defaultFilters = parseReviewFilters(new URLSearchParams());
    setReviewFilters(defaultFilters);
    setActivePage(1);
    updateUrl(defaultFilters, 1);
  }, [updateUrl]);

  const handlePageChange = useCallback(
    (nextPage) => {
      setActivePage(nextPage);
      updateUrl(reviewFilters, nextPage);
    },
    [reviewFilters, updateUrl]
  );

  return (
    <AccountSectionLayout
      icon={icon}
      showHeader={showHeader}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {listedReviewCount > 0 || hasFilters ? (
        <AccountReviewFilterBar
          filters={reviewFilters}
          yearOptions={yearOptions}
          onChange={updateFilters}
          onReset={hasFilters ? resetFilters : null}
        />
      ) : null}

      {filteredReviewCount === 0 && !isLoading && !loadError ? (
        <motion.div
          className={EMPTY_STATE_CLASS}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.16 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {hasFilters ? 'No reviews match the current filters' : emptyMessage}
        </motion.div>
      ) : filteredReviewCount === 0 && !isLoading && loadError ? (
        <motion.div
          className={EMPTY_STATE_CLASS}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.16 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {loadError}
        </motion.div>
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

      {!enablePagination && hasMore && typeof onLoadMore === 'function' ? (
        <motion.div
          className="flex justify-center"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.16 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="border border-black/20 bg-white/65 px-6 py-3 text-xs font-semibold tracking-widest text-black/70 uppercase backdrop-blur-sm transition"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </motion.div>
      ) : null}

      {enablePagination && filteredReviewCount > 0 ? (
        <div>
          <AccountPagination
            className="w-full"
            currentPage={resolvedPage}
            onPageChange={handlePageChange}
            totalPages={totalPages}
          />
        </div>
      ) : null}
    </AccountSectionLayout>
  );
}
