'use client';

/**
 * Media Reviews - Reviews List View Component
 * Path: features/media-reviews/parts/review-list.js
 */

import { motion } from 'framer-motion';
import { normalizeFeedbackText } from '@/shared/utils';
import { mergeReviewUser } from '../ui/review-data';
import ReviewCard from './review-card';
import { getListCardProps, TIMELINES } from '@/app/(account)/motion';

export default function ReviewList({
  baseDelay = TIMELINES.CARD_BASE_DELAY,
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
}) {
  if (isLoading) {
    return <div className="py-10 text-center text-sm text-black/70">Loading reviews</div>;
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
      <div className="py-4 text-center text-sm leading-relaxed text-black/70">
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
        const motionProps = getListCardProps(index, baseDelay, isInitialSection);

        return (
          <motion.div
            key={key}
            initial={motionProps.initial}
            animate={isInitialSection ? motionProps.animate : undefined}
            whileInView={!isInitialSection ? motionProps.whileInView : undefined}
            viewport={!isInitialSection ? motionProps.viewport : undefined}
            transition={motionProps.transition}
            style={{ willChange: 'transform, opacity, filter' }}
          >
            <ReviewCard
              className={index === 0 ? 'pt-0 pb-6' : ''}
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
          </motion.div>
        );
      })}
    </div>
  );
}
