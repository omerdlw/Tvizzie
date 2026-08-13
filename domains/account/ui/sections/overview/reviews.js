'use client';

import { useMemo } from 'react';
import ReviewList from '@/domains/reviews/ui/components/review-list';
import { Button } from '@/ui/primitives';
import {
  AccountInlineSectionState,
  AccountInlineSectionLoading,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import AccountSectionLayout from '@/domains/account/ui/sections/account-section';
import { buildMediaKeySet } from '@/domains/account/ui/filters/filtering';
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
  const likedMediaKeys = useMemo(() => buildMediaKeySet(likes), [likes]);
  const watchedMediaKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
  const rewatchMediaKeys = useMemo(
    () => buildMediaKeySet(watchedItems, (item) => Number(item?.watchCount || 0) > 1),
    [watchedItems],
  );
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
          accountMotion
        />
      )}

      {hasMore && typeof onLoadMore === 'function' ? (
        <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="border border-black/10 bg-white/50 px-6 py-3 text-xs font-semibold tracking-widest text-black/70 uppercase"
          >
            {isLoadingMore ? 'Loading' : 'Load More'}
          </Button>
        </div>
      ) : null}
    </AccountSectionLayout>
  );
}
