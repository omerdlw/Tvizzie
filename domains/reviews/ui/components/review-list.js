'use client';

import { motion } from 'framer-motion';
import { normalizeFeedbackText } from '@/shared/utils';
import { mergeReviewUser } from '../../shared/review-data';
import ReviewCard from './review-card';
import { getListCardProps, TIMELINES } from '@/app/(account)/motion';
import { ReviewCardsSkeletonList } from '@/domains/account/ui/skeletons/account-section-skeletons';

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
        const isFirst = index === 0;
        const isLast = index === sortedReviews.length - 1;

        return (
          <motion.div
            key={key}
            initial={motionProps.initial}
            animate={motionProps.animate}
            whileInView={motionProps.whileInView}
            viewport={motionProps.viewport}
            transition={motionProps.transition}
            style={{ willChange: 'transform, opacity, filter' }}
          >
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
          </motion.div>
        );
      })}
    </div>
  );
}
