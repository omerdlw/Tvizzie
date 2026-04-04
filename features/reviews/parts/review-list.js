'use client';

import { mergeReviewUser } from '../utils';
import ReviewCard from './review-card';

export default function ReviewList({
  currentUserId,
  displayVariant = 'media',
  isLoading,
  likedMediaKeys = null,
  loadError,
  onDeleteRequest,
  onEdit,
  onLike,
  rewatchMediaKeys = null,
  showOwnActions = true,
  showSubject = false,
  sortedReviews,
  userProfile,
  watchedMediaKeys = null,
}) {
  if (isLoading) {
    return <div className="py-10 text-center text-sm text-black/70">Loading reviews</div>;
  }

  if (loadError) {
    return <div className="py-10 text-center text-sm leading-relaxed text-[#7f1d1d]">{loadError}</div>;
  }

  if (sortedReviews.length === 0) {
    return <div className="py-10 text-center text-sm leading-relaxed text-black/70">No ratings or reviews yet</div>;
  }

  return (
    <div className="flex flex-col">
      {sortedReviews.map((review, index) => {
        const isOwnReview = review.user?.id === currentUserId;
        const mergedReview = isOwnReview ? mergeReviewUser(review, userProfile) : review;

        return (
          <ReviewCard
            key={review.docPath || review.id || `review-${index}`}
            className={sortedReviews[0] === review ? 'pt-0 pb-6 sm:pt-0 sm:pb-7' : ''}
            review={mergedReview}
            currentUserId={currentUserId}
            displayVariant={displayVariant}
            isOwnReview={showOwnActions && isOwnReview}
            likedMediaKeys={likedMediaKeys}
            onLike={() => onLike(review)}
            onEdit={() => onEdit(review)}
            onDeleteRequest={() => onDeleteRequest(review)}
            rewatchMediaKeys={rewatchMediaKeys}
            showSubject={showSubject}
            watchedMediaKeys={watchedMediaKeys}
          />
        );
      })}
    </div>
  );
}
