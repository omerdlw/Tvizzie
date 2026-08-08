'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import ReviewList from '@/domains/reviews/ui/components/review-list';
import { Button } from '@/ui/primitives';
import { AccountInlineSectionState, AccountInlineSectionLoading } from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
import { actionButtonVariants } from '@/app/(account)/motion';
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
      .filter(Boolean),
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
      .filter(Boolean),
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
      .filter(Boolean),
  );
}
export default function AccountReviewsOverview({
  currentUserId = null,
  emptyMessage = 'No reviews yet',
  hasMore = false,
  icon = 'solar:chat-round-bold',
  isInitialSection = false,
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
  const resolvedSummaryLabel =
    summaryLabel === null ? `${listedReviewCount} Reviews` : summaryLabel;
  const likedMediaKeys = useMemo(() => buildLikedMediaKeySet(likes), [likes]);
  const watchedMediaKeys = useMemo(() => buildWatchedMediaKeySet(watchedItems), [watchedItems]);
  const rewatchMediaKeys = useMemo(() => buildRewatchMediaKeySet(watchedItems), [watchedItems]);
  return (
    <AccountSectionLayout
      icon={icon}
      isInitialSection={isInitialSection}
      showSeeMore={showSeeMore}
      summaryLabel={resolvedSummaryLabel}
      title={title}
      titleHref={titleHref}
    >
      {isLoading && listedReviewCount === 0 ? (
        <AccountInlineSectionLoading variant="review" />
      ) : listedReviewCount === 0 && loadError ? (
        <AccountInlineSectionState>{loadError}</AccountInlineSectionState>
      ) : listedReviewCount === 0 ? (
        <AccountInlineSectionState>{emptyMessage}</AccountInlineSectionState>
      ) : (
        <div>
          <ReviewList
            currentUserId={currentUserId}
            displayVariant="account"
            isInitialSection={isInitialSection}
            isLoading={false}
            loadError={null}
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
        </div>
      )}

      {hasMore && typeof onLoadMore === 'function' ? (
        <motion.div
          className="flex justify-center"
          initial={actionButtonVariants.initial}
          animate={actionButtonVariants.animate}
          transition={actionButtonVariants.transition}
        >
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="rounded-xl border border-black/10 bg-white/50 px-6 py-3 text-xs font-semibold tracking-widest text-black/70 uppercase"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </motion.div>
      ) : null}
    </AccountSectionLayout>
  );
}
