'use client';

import { useMemo } from 'react';

import ReviewList from '@/features/reviews/parts/review-list';
import { Button } from '@/ui/elements';
import AccountSectionLayout from '../profile/section-wrapper';

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

export default function AccountReviewsFeed({
  currentUserId = null,
  emptyMessage = 'No reviews yet',
  hasMore = false,
  icon = 'solar:chat-round-bold',
  isLoading = false,
  items = [],
  loadError = null,
  likes = [],
  onDeleteRequest = null,
  onEdit = null,
  onLike,
  onLoadMore = null,
  showOwnActions = false,
  showSeeMore = false,
  summaryLabel = null,
  title,
  titleHref = null,
  userProfile = null,
  watchedItems = [],
}) {
  const resolvedSummaryLabel = summaryLabel === null ? `${items.length} Content` : summaryLabel;
  const likedMediaKeys = useMemo(() => buildLikedMediaKeySet(likes), [likes]);
  const watchedMediaKeys = useMemo(() => buildWatchedMediaKeySet(watchedItems), [watchedItems]);
  const rewatchMediaKeys = useMemo(() => buildRewatchMediaKeySet(watchedItems), [watchedItems]);

  return (
    <AccountSectionLayout
      icon={icon}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {items.length === 0 && !isLoading && !loadError ? (
        <div className="border border-black/10 p-4 text-sm text-black/70 backdrop-blur-sm">{emptyMessage}</div>
      ) : items.length === 0 && !isLoading && loadError ? (
        <div className="border border-black/10 p-4 text-sm text-black/70 backdrop-blur-sm">{loadError}</div>
      ) : (
        <ReviewList
          currentUserId={currentUserId}
          displayVariant="account"
          isLoading={isLoading}
          loadError={loadError}
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
      )}

      {hasMore && typeof onLoadMore === 'function' ? (
        <div className="flex justify-center">
          <Button
            onClick={onLoadMore}
            className="border border-black/20 bg-white/65 px-6 py-3 text-xs font-semibold tracking-widest text-black/70 uppercase backdrop-blur-sm transition"
          >
            Load More
          </Button>
        </div>
      ) : null}
    </AccountSectionLayout>
  );
}
