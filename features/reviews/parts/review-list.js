'use client';

import { motion } from 'framer-motion';

import { normalizeFeedbackText } from '@/core/utils';

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
    return <div className="text-error py-10 text-center text-sm leading-relaxed">{normalizeFeedbackText(loadError)}</div>;
  }

  if (sortedReviews.length === 0) {
    return <div className="py-4 text-center text-sm leading-relaxed text-black/70">No ratings or reviews yet</div>;
  }

  return (
    <div className="flex flex-col">
      {sortedReviews.map((review, index) => {
        const isOwnReview = review.user?.id === currentUserId;
        const mergedReview = isOwnReview ? mergeReviewUser(review, userProfile) : review;

        return (
          <motion.div
            key={review.docPath || review.id || `review-${index}`}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.976, filter: 'blur(7px)' }}
            whileInView={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              transitionEnd: {
                filter: 'none',
                transform: 'none',
                willChange: 'auto',
              },
            }}
            viewport={{ once: true, amount: 0, margin: '0px 0px 16% 0px' }}
            transition={{
              opacity: {
                delay: index < 6 ? index * 0.02 : 0,
                duration: 0.44,
                ease: [0.22, 1, 0.36, 1],
              },
              filter: {
                delay: index < 6 ? index * 0.02 : 0,
                duration: 0.34,
                ease: [0.22, 1, 0.36, 1],
              },
              scale: {
                delay: index < 6 ? index * 0.02 : 0,
                duration: 0.46,
                ease: [0.22, 1, 0.36, 1],
              },
              y: {
                type: 'spring',
                stiffness: 132,
                damping: 24,
                mass: 1,
                delay: index < 6 ? index * 0.02 : 0,
              },
            }}
            style={{ willChange: 'transform, opacity, filter' }}
          >
            <ReviewCard
              className={sortedReviews[0] === review ? 'pt-0 pb-6' : ''}
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
