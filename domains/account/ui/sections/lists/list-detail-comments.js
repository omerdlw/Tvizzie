'use client';

import { useEffect, useMemo, useState } from 'react';
import AccountPagination from '@/domains/account/ui/components/account-pagination';
import {
  AccountInlineSectionState,
  ACCOUNT_SECTION_PAGINATION_CLASS,
} from '@/domains/account/ui/sections/account-section';
import ReviewList from '@/domains/reviews/ui/components/review-list';
import {
  ReviewCardsSkeletonList,
} from '@/domains/account/ui/skeletons';
import { REVIEW_ITEMS_PER_PAGE } from './list-detail-config';

export default function ListDetailCommentsSection({
  auth,
  filteredReviews = [],
  isLoading = false,
  list,
  onDeleteRequest,
  onEditReview,
  onLikeReview,
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
  useEffect(() => {
    setCurrentReviewPage(1);
  }, [filteredReviews, list?.id]);
  return (
    <CommentsView
      auth={auth}
      filteredReviews={filteredReviews}
      isLoading={isLoading}
      list={list}
      onDeleteRequest={onDeleteRequest}
      onEditReview={onEditReview}
      onLikeReview={onLikeReview}
      reviews={reviews}
      userProfile={userProfile}
      safeCurrentReviewPage={safeCurrentReviewPage}
      totalReviewPages={totalReviewPages}
      visibleReviews={visibleReviews}
      setCurrentReviewPage={setCurrentReviewPage}
    />
  );
}

function CommentsView({
  auth,
  filteredReviews,
  isLoading = false,
  list,
  onDeleteRequest,
  onEditReview,
  onLikeReview,
  reviews,
  userProfile,
  safeCurrentReviewPage,
  totalReviewPages,
  visibleReviews,
  setCurrentReviewPage,
}) {
  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-col gap-4 p-6">
        {isLoading && visibleReviews.length === 0 ? (
          <ReviewCardsSkeletonList count={3} />
        ) : visibleReviews.length === 0 ? (
          <AccountInlineSectionState>
            {reviews.length > 0 ? 'No comments match the current filters.' : 'No comments yet'}
          </AccountInlineSectionState>
        ) : (
          <ReviewList
            currentUserId={auth.user?.id || null}
            displayVariant="list-detail"
            isLoading={false}
            loadError={null}
            onDeleteRequest={onDeleteRequest}
            onEdit={onEditReview}
            onLike={onLikeReview}
            showSubject={false}
            sortedReviews={visibleReviews}
            userProfile={userProfile}
            accountMotion
          />
        )}

        {totalReviewPages > 1 && (
          <div className={ACCOUNT_SECTION_PAGINATION_CLASS}>
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
    </div>
  );
}
