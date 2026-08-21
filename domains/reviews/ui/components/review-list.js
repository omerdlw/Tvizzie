'use client';

import { normalizeFeedbackText } from '@/shared/feedback';
import { mergeReviewUser } from '@/domains/reviews/utils/formatting';
import ReviewCard from './review-card';
import { ReviewCardsSkeletonList } from '@/domains/account/ui/skeletons';

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
  rewatchMediaKeys = null,
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
              rewatchMediaKeys={rewatchMediaKeys}
              showSubject={showSubject}
              watchedMediaKeys={watchedMediaKeys}
            />
          </div>
        );
      })}
    </div>
  );
}
