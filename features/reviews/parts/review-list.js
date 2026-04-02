'use client'

import { mergeReviewUser } from '../utils'
import ReviewCard from './review-card'

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
    return <div className="py-10 text-center text-sm text-white">Loading reviews</div>
  }

  if (loadError) {
    return (
      <div className="py-10 text-center text-sm leading-relaxed text-white">
        {loadError}
      </div>
    )
  }

  if (sortedReviews.length === 0) {
    return (
      <div className="py-10 text-center text-sm leading-relaxed text-white">
        No ratings or reviews yet
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {sortedReviews.map((review, index) => {
        const isOwnReview = review.user?.id === currentUserId
        const mergedReview = isOwnReview
          ? mergeReviewUser(review, userProfile)
          : review

        return (
          <ReviewCard
            key={review.docPath || review.id || `review-${index}`}
            className={
              sortedReviews[0] === review ? 'pb-6 pt-0 sm:pb-7 sm:pt-0' : ''
            }
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
        )
      })}
    </div>
  )
}
