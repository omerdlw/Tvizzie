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
const noop = () => {};

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
  likedLists = [],
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
  const likedMediaKeys = useMemo(() => {
    const set = buildMediaKeySet(likes);
    const listSet = buildMediaKeySet(likedLists);
    listSet.forEach((key) => set.add(key));
    return set;
  }, [likes, likedLists]);
  const watchedMediaKeys = useMemo(() => buildMediaKeySet(watchedItems), [watchedItems]);
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
          onDeleteRequest={onDeleteRequest || noop}
          onEdit={onEdit || noop}
          onLike={onLike}
          likedMediaKeys={likedMediaKeys}
          showOwnActions={showOwnActions}
          showSubject={true}
          sortedReviews={items}
          userProfile={userProfile}
          watchedMediaKeys={watchedMediaKeys}
          accountMotion
        />
      )}

      {hasMore && typeof onLoadMore === 'function' ? (
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl ring-1 ring-inset ring-white/5 bg-white/5 px-4 text-xs font-semibold uppercase text-white/70 hover:ring-white/10 hover:bg-white/10 hover:text-white transition-colors"
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      ) : null}
    </AccountSectionLayout>
  );
}
