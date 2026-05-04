'use client';

import { cn, normalizeFeedbackText } from '@/core/utils';
import { SkeletonBlock, SkeletonCircle, SkeletonLine } from '@/ui/skeletons/primitives';

import { mergeReviewUser } from '../utils';
import ReviewCard from './review-card';

const SKELETON_STAR_ITEMS = [0, 1, 2, 3, 4];
const SKELETON_REVIEW_ITEMS = [0, 1, 2, 3];

function ReviewListSkeletonMeta() {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <div className="flex items-center gap-1">
        {SKELETON_STAR_ITEMS.map((item) => (
          <SkeletonBlock key={item} className="size-3" />
        ))}
      </div>
      <SkeletonCircle className="size-1" soft />
      <SkeletonLine className="w-24" size="sm" />
      <SkeletonCircle className="size-1" soft />
      <SkeletonLine className="w-20" size="sm" soft />
    </div>
  );
}

function ReviewListSkeletonItem({ index, isAccountVariant, isLast }) {
  return (
    <div
      className={cn(
        'relative',
        isAccountVariant ? 'py-4 sm:py-5' : 'p-5',
        isAccountVariant && cn('account-review-list-item'),
        !isLast && 'border-b border-white/10',
        !isAccountVariant && !isLast && ''
      )}
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <SkeletonBlock className={cn('shrink-0', isAccountVariant ? 'h-24 w-16 sm:h-28 sm:w-20' : 'size-14')} />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {isAccountVariant && <SkeletonLine className="w-48 max-w-full" size="lg" />}

          <ReviewListSkeletonMeta />

          <div className="flex flex-col gap-2">
            <SkeletonLine className={cn('max-w-full', index % 2 === 0 ? 'w-full' : 'w-11/12')} size="md" />
            <SkeletonLine className={cn('max-w-xl', index % 2 === 0 ? 'w-2/3' : 'w-4/5')} size="md" soft />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <SkeletonCircle className="size-4" soft />
            <SkeletonLine className="w-16" size="sm" soft />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewListSkeleton({ displayVariant, showTopBorder }) {
  const isAccountVariant = displayVariant === 'account';

  return (
    <div
      className={cn(
        'flex flex-col',
        isAccountVariant && cn('account-review-list-frame'),
        !isAccountVariant && showTopBorder && 'border-t border-white/10'
      )}
      role="status"
      aria-label="Loading reviews"
    >
      <span className="sr-only">Loading reviews</span>
      {SKELETON_REVIEW_ITEMS.map((item, index) => (
        <ReviewListSkeletonItem
          key={item}
          index={index}
          isAccountVariant={isAccountVariant}
          isLast={index === SKELETON_REVIEW_ITEMS.length - 1}
        />
      ))}
    </div>
  );
}

export default function ReviewList({
  currentUserId,
  displayVariant = 'media',
  emptyMessage = 'No written reviews yet',
  isLoading,
  likedMediaKeys = null,
  loadError,
  onDeleteRequest,
  onEdit,
  onLike,
  rewatchMediaKeys = null,
  showOwnActions = true,
  showTopBorder = true,
  showSubject = false,
  sortedReviews,
  userProfile,
  watchedMediaKeys = null,
}) {
  const isAccountVariant = displayVariant === 'account';

  if (isLoading) {
    return <ReviewListSkeleton displayVariant={displayVariant} showTopBorder={showTopBorder} />;
  }

  if (loadError) {
    return (
      <div className="text-error py-10 text-center text-sm leading-relaxed">{normalizeFeedbackText(loadError)}</div>
    );
  }

  if (sortedReviews.length === 0) {
    return (
      <div
        className={cn(
          cn('py-10 text-center text-sm leading-relaxed text-white-muted'),
          !isAccountVariant && showTopBorder && cn('border-grid-line border-y')
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col',
        isAccountVariant && cn('account-review-list-frame'),
        !isAccountVariant && showTopBorder && 'border-t border-white/10'
      )}
    >
      {sortedReviews.map((review, index) => {
        const isOwnReview = review.user?.id === currentUserId;
        const mergedReview = isOwnReview ? mergeReviewUser(review, userProfile) : review;

        return (
          <div
            key={review.docPath || review.id || `review-${index}`}
            className={cn(
              'relative',
              isAccountVariant && cn('account-review-list-item'),
              index < sortedReviews.length - 1 && 'border-b border-white/10',
              !isAccountVariant && index < sortedReviews.length - 1 && ''
            )}
          >
            <ReviewCard
              className="!border-b-0"
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
          </div>
        );
      })}
    </div>
  );
}
