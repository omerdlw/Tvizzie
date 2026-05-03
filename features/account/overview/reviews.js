'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import ReviewList from '@/features/reviews/parts/review-list';
import { Button } from '@/ui/elements';
import AccountSectionLayout from '../shared/section-wrapper';

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
      title={title}
      titleHref={titleHref}
    >
      {listedReviewCount === 0 && !isLoading && !loadError ? (
        <motion.div
          className="rounded border border-white/15 bg-black/40 p-4 text-sm text-white/70"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {emptyMessage}
        </motion.div>
      ) : listedReviewCount === 0 && !isLoading && loadError ? (
        <motion.div
          className="rounded border border-white/15 bg-black/40 p-4 text-sm text-white/70"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {loadError}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        >
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
        </motion.div>
      )}

      {hasMore && typeof onLoadMore === 'function' ? (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="rounded border border-white/10 bg-black/50 px-6 py-3 text-xs font-semibold tracking-widest text-white/70 uppercase transition"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </motion.div>
      ) : null}
    </AccountSectionLayout>
  );
}
