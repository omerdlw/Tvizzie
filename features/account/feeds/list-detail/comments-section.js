'use client';

import { useEffect, useMemo, useState } from 'react';
import AccountPagination from '@/features/account/components/pagination';
import AccountInlineSectionState from '@/features/account/components/section-state';
import { AccountReviewFilterBar } from '@/features/account/filters/content-filter-primitives';
import { AuthGate } from '@/core/modules/auth';
import ReviewAuthFallback from '@/features/reviews/parts/review-auth-fallback';
import ReviewHeader from '@/features/reviews/parts/review-header';
import ReviewList from '@/features/reviews/parts/review-list';
import { Button } from '@/ui/elements';
import { LIST_COMMENT_SORT_OPTIONS, REVIEW_ITEMS_PER_PAGE } from './config';

// --------------------------------------------------
// COMPONENT LOGIC
// --------------------------------------------------

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
  userProfile
}) {
  const [currentReviewPage, setCurrentReviewPage] = useState(1);

  // Derived Values (Türetilmiş state'ler - useEffect zincirini kırar)
  const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / REVIEW_ITEMS_PER_PAGE));
  const safeCurrentReviewPage = Math.min(currentReviewPage, totalReviewPages);
  const reviewPageStart = (safeCurrentReviewPage - 1) * REVIEW_ITEMS_PER_PAGE;
  const visibleReviews = useMemo(() => filteredReviews.slice(reviewPageStart, reviewPageStart + REVIEW_ITEMS_PER_PAGE), [filteredReviews, reviewPageStart]);
  const hasListReviews = reviews.length > 0;

  // Sadece filtre veya liste değiştiğinde sayfayı başa sar
  useEffect(() => {
    setCurrentReviewPage(1);
  }, [list?.id, reviewFilters]);
  return <CommentsView auth={auth} filteredReviews={filteredReviews} hasReviewFilters={hasReviewFilters} isOwner={isOwner} list={list} onDeleteRequest={onDeleteRequest} onEditReview={onEditReview} onLikeReview={onLikeReview} onOpenReviewComposer={onOpenReviewComposer} onResetReviewFilters={onResetReviewFilters} onSignIn={onSignIn} onUpdateReviewFilters={onUpdateReviewFilters} ownReview={ownReview} reviewFilters={reviewFilters} reviewYearOptions={reviewYearOptions} reviews={reviews} userProfile={userProfile} safeCurrentReviewPage={safeCurrentReviewPage} totalReviewPages={totalReviewPages} visibleReviews={visibleReviews} hasListReviews={hasListReviews} setCurrentReviewPage={setCurrentReviewPage} />;
}

// --------------------------------------------------
// VIEW
// --------------------------------------------------

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
  setCurrentReviewPage
}) {
  return <>
      <ReviewHeader itemLabel="comment" showRatingSummary={false} title="Comments" totalReviews={reviews.length} />

      {hasListReviews && <AccountReviewFilterBar className="mb-2" filters={reviewFilters} showRatingFilter={false} sortOptions={LIST_COMMENT_SORT_OPTIONS} visibilityOptions={[]} yearOptions={reviewYearOptions} onChange={onUpdateReviewFilters} onReset={hasReviewFilters ? onResetReviewFilters : null} />}

      {hasListReviews && hasReviewFilters && <p className="text-xs font-semibold tracking-widest text-black/50 uppercase">
          {filteredReviews.length} of {reviews.length} comments shown
        </p>}

      {!isOwner && <AuthGate fallback={<ReviewAuthFallback mode="comment" onSignIn={onSignIn} title={list.title} />}>
          <div className="flex w-full flex-col items-start gap-3 border-y border-black/10 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{ownReview ? 'Update your comment' : 'Write a comment'}</p>
              <p className="text-xs text-black/70">
                {ownReview ? 'Open the comment composer to edit your text.' : 'Share your thoughts from the comment composer.'}
              </p>
            </div>
            <Button className="bg-primary/30 inline-flex w-full items-center justify-center gap-2 border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase hover:bg-black hover:text-white sm:w-auto sm:justify-between" type="button" onClick={onOpenReviewComposer}>
              {ownReview ? 'Edit Comment' : 'Add Comment'}
            </Button>
          </div>
        </AuthGate>}

      {visibleReviews.length === 0 ? <AccountInlineSectionState>
          {hasReviewFilters && reviews.length > 0 ? 'No comments match the current filters.' : 'No comments yet'}
        </AccountInlineSectionState> : <ReviewList currentUserId={auth.user?.id || null} isLoading={false} loadError={null} onDeleteRequest={onDeleteRequest} onEdit={onEditReview} onLike={onLikeReview} sortedReviews={visibleReviews} userProfile={userProfile} />}

      {totalReviewPages > 1 && <div className="mt-4">
          <AccountPagination className="w-full" currentPage={safeCurrentReviewPage} totalPages={totalReviewPages} onPageChange={setCurrentReviewPage} prevAriaLabel="Go to previous review page" nextAriaLabel="Go to next review page" />
        </div>}
    </>;
}
