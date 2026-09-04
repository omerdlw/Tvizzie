'use client';

import { normalizeFeedbackText } from '@/shared';
import { mergeReviewUser } from '@/domains/reviews/utils/formatting';
import ReviewCard from './review-card';

function ReviewCardsSkeletonList({ count = 4 }) {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex gap-3.5 border-b border-white/5 py-4 last:border-b-0">
          <div className="skeleton-block aspect-2/3 w-16 shrink-0 rounded-[12px] sm:w-[72px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-1">
            <div className="skeleton-block h-3 w-2/5 rounded-full" />
            <div className="skeleton-block-soft h-3 w-3/5 rounded-full" />
            <div className="skeleton-block-soft h-3 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReviewList({
  baseDelay = 0,
  currentUserId,
  displayVariant = 'media',
  isInitialSection = true,
  isLoading,
  likedMediaKeys = null,
  loadError,
  onDeleteRequest,
  onEdit,
  onLike,
  showOwnActions = true,
  showSubject = false,
  sortedReviews = [],
  userProfile,
  watchedMediaKeys = null,
  motionStage = null,
  motionDeferred = false,
  accountMotion = false,
}) {
  if (isLoading) {
    return <ReviewCardsSkeletonList count={4} />;
  }

  if (loadError) {
    return (
      <div className="text-error py-10 text-center text-sm leading-relaxed">
        {normalizeFeedbackText(loadError)}
      </div>
    );
  }

  if (sortedReviews.length === 0) {
    return (
      <div className="py-4 text-center text-sm leading-relaxed text-white/70">
        No ratings or reviews yet
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {sortedReviews.map((review, index) => {
        const isOwnReview = review.user?.id === currentUserId;
        const mergedReview = isOwnReview ? mergeReviewUser(review, userProfile) : review;
        const key = review.docPath || review.id || `review-${index}`;
        const isFirst = index === 0;
        const isLast = index === sortedReviews.length - 1;

        return (
          <div key={key}>
            <ReviewCard
              review={mergedReview}
              currentUserId={currentUserId}
              displayVariant={displayVariant}
              removeBottomPadding={isLast}
              removeTopPadding={isFirst}
              isOwnReview={showOwnActions && isOwnReview}
              likedMediaKeys={likedMediaKeys}
              onLike={() => onLike(review)}
              onEdit={() => onEdit(review)}
              onDeleteRequest={() => onDeleteRequest(review)}
              showSubject={showSubject}
              watchedMediaKeys={watchedMediaKeys}
            />
          </div>
        );
      })}
    </div>
  );
}
