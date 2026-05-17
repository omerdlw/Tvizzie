'use client';

import { useMemo } from 'react';

import ReviewList from '@/features/reviews/components/review-list';
import { Button } from '@/ui/elements';
import AccountSectionLayout, { AccountInlineSectionState } from '../../components/section-wrapper';
import { AccountMotionItem } from '@/app/(account)/account/motion';

function buildLikedMediaKeySet(items = []) {
  return new Set(
    items
      .map((item) => {
        if (item?.mediaKey) {
          return item.mediaKey;
        }

        const entityType = item?.entityType || item?.media_type || null;
        const entityId = String(item?.entityId || item?.id || '').trim();

        if (!entityType || !entityId) {
          return null;
        }

        return `${entityType}_${entityId}`;
      })
      .filter(Boolean)
  );
}

function buildWatchedMediaKeySet(items = []) {
  return new Set(
    items
      .map((item) => {
        if (item?.mediaKey) {
          return item.mediaKey;
        }

        const entityType = item?.entityType || item?.media_type || null;
        const entityId = String(item?.entityId || item?.id || '').trim();

        if (!entityType || !entityId) {
          return null;
        }

        return `${entityType}_${entityId}`;
      })
      .filter(Boolean)
  );
}

function buildRewatchMediaKeySet(items = []) {
  return new Set(
    items
      .filter((item) => Number(item?.watchCount || 0) > 1)
      .map((item) => {
        if (item?.mediaKey) {
          return item.mediaKey;
        }

        const entityType = item?.entityType || item?.media_type || null;
        const entityId = String(item?.entityId || item?.id || '').trim();

        if (!entityType || !entityId) {
          return null;
        }

        return `${entityType}_${entityId}`;
      })
      .filter(Boolean)
  );
}

export default function AccountReviewsOverview({
  currentUserId = null,
  emptyMessage = 'No reviews yet',
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
  revealIndex = 0,
  showOwnActions = false,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
  userProfile = null,
  watchedItems = [],
}) {
  const listedReviewCount = Array.isArray(items) ? items.length : 0;
  const resolvedSummaryLabel = summaryLabel === null ? `${listedReviewCount} Reviews` : summaryLabel;
  const likedMediaKeys = useMemo(() => buildLikedMediaKeySet(likes), [likes]);
  const watchedMediaKeys = useMemo(() => buildWatchedMediaKeySet(watchedItems), [watchedItems]);
  const rewatchMediaKeys = useMemo(() => buildRewatchMediaKeySet(watchedItems), [watchedItems]);

  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      revealIndex={revealIndex}
      title={title}
      titleHref={titleHref}
    >
      {listedReviewCount === 0 && !isLoading && !loadError ? (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      ) : listedReviewCount === 0 && !isLoading && loadError ? (
        <AccountInlineSectionState>{loadError}</AccountInlineSectionState>
      ) : (
        <AccountMotionItem index={0}>
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
            sortedReviews={items}
            userProfile={userProfile}
            watchedMediaKeys={watchedMediaKeys}
          />
        </AccountMotionItem>
      )}

      {hasMore && typeof onLoadMore === 'function' ? (
        <AccountMotionItem className="flex justify-center" index={1}>
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="border border-white/5 bg-black/50 px-6 py-3 text-xs font-semibold tracking-widest text-white/70 uppercase"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </AccountMotionItem>
      ) : null}
    </AccountSectionLayout>
  );
}
