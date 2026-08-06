'use client';

import { useEffect, useMemo, useState } from 'react';
import AccountPagination from '@/domains/account/ui/components/account-pagination';
import { AccountInlineSectionState } from '@/domains/account/ui/sections/account-section';
import { AccountReviewFilterBar } from '@/domains/account/ui/filters/content-filter-primitives';
import ReviewAuthFallback from '@/domains/reviews/ui/components/review-auth-fallback';
import ReviewHeader from '@/domains/reviews/ui/components/review-header';
import ReviewList from '@/domains/reviews/ui/components/review-list';
import { LIST_COMMENT_SORT_OPTIONS, REVIEW_ITEMS_PER_PAGE } from './list-detail-config';





export default function ListDetailCommentsSection({
  auth,
  filteredReviews = [],
  hasReviewFilters = false,
  isOwner = false,
  list,
  onDeleteRequest,
  onEditReview,
  onLikeReview,
  onOpenReviewComposer,
  onResetReviewFilters,
  onSignIn,
  onUpdateReviewFilters,
  ownReview = null,
  reviewFilters,
  reviewYearOptions = [],
  reviews = [],
  userProfile,
}) {
  const [currentReviewPage, setCurrentReviewPage] = useState(1);

  
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEW_ITEMS_PER_PAGE));
  const safeCurrentReviewPage = Math.min(currentReviewPage, totalReviewPages);
  const reviewPageStart = (safeCurrentReviewPage - 1) * REVIEW_ITEMS_PER_PAGE;
  const visibleReviews = useMemo(
    () => filteredReviews.slice(reviewPageStart, reviewPageStart + REVIEW_ITEMS_PER_PAGE),
    [filteredReviews, reviewPageStart],
  );
  const hasListReviews = reviews.length > 0;

  
  useEffect(() => {
    setCurrentReviewPage(1);
  }, [list?.id, reviewFilters]);
  return (
    <CommentsView
      auth={auth}
      filteredReviews={filteredReviews}
      hasReviewFilters={hasReviewFilters}
      isOwner={isOwner}
      list={list}
      onDeleteRequest={onDeleteRequest}
      onEditReview={onEditReview}
      onLikeReview={onLikeReview}
      onOpenReviewComposer={onOpenReviewComposer}
      onResetReviewFilters={onResetReviewFilters}
      onSignIn={onSignIn}
      onUpdateReviewFilters={onUpdateReviewFilters}
      ownReview={ownReview}
      reviewFilters={reviewFilters}
      reviewYearOptions={reviewYearOptions}
      reviews={reviews}
      userProfile={userProfile}
      safeCurrentReviewPage={safeCurrentReviewPage}
      totalReviewPages={totalReviewPages}
      visibleReviews={visibleReviews}
      hasListReviews={hasListReviews}
      setCurrentReviewPage={setCurrentReviewPage}
    />
  );
}





function CommentsView({
  auth,
  filteredReviews,
  hasReviewFilters,
  isOwner,
  list,
  onDeleteRequest,
  onEditReview,
  onLikeReview,
  onOpenReviewComposer,
  onResetReviewFilters,
  onSignIn,
  onUpdateReviewFilters,
  ownReview,
  reviewFilters,
  reviewYearOptions,
  reviews,
  userProfile,
  safeCurrentReviewPage,
  totalReviewPages,
  visibleReviews,
  hasListReviews,
  setCurrentReviewPage,
}) {
  return (
    <div className="relative flex w-full flex-col gap-4">
      <ReviewHeader
        itemLabel="comment"
        showRatingSummary={false}
        title="Comments"
        totalReviews={reviews.length}
      />

      {!auth?.user && (
        <ReviewAuthFallback mode="comment" onSignIn={onSignIn} title={list?.title} />
      )}

      {hasListReviews && (
        <AccountReviewFilterBar
          className="border-b-0 pb-0"
          filters={reviewFilters}
          showRatingFilter={false}
          sortOptions={LIST_COMMENT_SORT_OPTIONS}
          visibilityOptions={[]}
          yearOptions={reviewYearOptions}
          onChange={onUpdateReviewFilters}
          onReset={hasReviewFilters ? onResetReviewFilters : null}
        />
      )}

      {hasListReviews && hasReviewFilters && (
        <p className="-mt-1 text-xs font-semibold tracking-widest text-black/50 uppercase">
          {filteredReviews.length} of {reviews.length} comments shown
        </p>
      )}

      {visibleReviews.length === 0 ? (
        <AccountInlineSectionState>
          {hasReviewFilters && reviews.length > 0
            ? 'No comments match the current filters.'
            : 'No comments yet'}
        </AccountInlineSectionState>
      ) : (
        <ReviewList
          currentUserId={auth.user?.id || null}
          isLoading={false}
          loadError={null}
          onDeleteRequest={onDeleteRequest}
          onEdit={onEditReview}
          onLike={onLikeReview}
          sortedReviews={visibleReviews}
          userProfile={userProfile}
        />
      )}

      {totalReviewPages > 1 && (
        <div className="mt-4">
          <AccountPagination
            className="w-full"
            currentPage={safeCurrentReviewPage}
            totalPages={totalReviewPages}
            onPageChange={setCurrentReviewPage}
            prevAriaLabel="Go to previous review page"
            nextAriaLabel="Go to next review page"
          />
        </div>
      )}
    </div>
  );
}
