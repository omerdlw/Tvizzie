import Link from 'next/link';

import { cn } from '@/core/utils';
import Icon from '@/ui/icon';

import RatingStars from './rating-stars';
import { ReviewActions, ReviewLikeButton, ReviewMetaSeparator, SpoilerNotice } from './review-card-controls';

export function SubjectReviewContent({
  activityLabel,
  className,
  formattedDate,
  hasLiked,
  hasLikedSubject,
  hasRating,
  hasText,
  hasWatchedSubject,
  isActivityVariant,
  isLikeDisabled,
  isOwnReview,
  isRewatch,
  isSpoilerHidden,
  likesCount,
  onDeleteRequest,
  onEdit,
  onLike,
  resolvedRating,
  revealSpoiler,
  review,
  showSubject,
  subjectHref,
}) {
  return (
    <div className={className}>
      {!isActivityVariant ? (
        <SubjectHeader
          activityLabel={activityLabel}
          formattedDate={formattedDate}
          hasLikedSubject={hasLikedSubject}
          hasRating={hasRating}
          hasWatchedSubject={hasWatchedSubject}
          isOwnReview={isOwnReview}
          isRewatch={isRewatch}
          onDeleteRequest={onDeleteRequest}
          onEdit={onEdit}
          resolvedRating={resolvedRating}
          review={review}
          showSubject={showSubject}
          subjectHref={subjectHref}
        />
      ) : hasRating ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/70">
          <RatingStars rating={resolvedRating} />
        </div>
      ) : null}

      {hasText ? (
        isSpoilerHidden ? (
          <SpoilerNotice compact onReveal={revealSpoiler} />
        ) : (
          <p
            className="min-w-0 text-sm leading-6 [overflow-wrap:anywhere] break-words"
            style={{
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: isActivityVariant ? 3 : 2,
            }}
          >
            {review.content}
          </p>
        )
      ) : (
        hasRating && !isActivityVariant && <p className="min-w-0 text-sm leading-6">- Rated without review</p>
      )}

      {!isSpoilerHidden && !isActivityVariant ? (
        <ReviewLikeButton disabled={isLikeDisabled} hasLiked={hasLiked} likesCount={likesCount} onClick={onLike} />
      ) : null}
    </div>
  );
}

function SubjectHeader({
  activityLabel,
  formattedDate,
  hasLikedSubject,
  hasRating,
  hasWatchedSubject,
  isOwnReview,
  isRewatch,
  onDeleteRequest,
  onEdit,
  resolvedRating,
  review,
  showSubject,
  subjectHref,
}) {
  return (
    <>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {showSubject && subjectHref && review.subjectTitle ? (
            <Link
              href={subjectHref}
              className="block min-w-0 text-lg font-semibold tracking-tight sm:text-xl"
              style={{
                display: '-webkit-box',
                overflow: 'hidden',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2,
              }}
            >
              {review.subjectTitle}
            </Link>
          ) : null}
        </div>

        {isOwnReview ? <ReviewActions disabled={false} onEdit={onEdit} onDeleteRequest={onDeleteRequest} /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-white/70">
        <div className="flex items-center gap-2">
          {hasRating ? <RatingStars rating={resolvedRating} /> : null}
          {hasLikedSubject ? <Icon icon="solar:heart-bold" size={16} className="text-error" /> : null}
        </div>
        {hasRating || hasLikedSubject ? <ReviewMetaSeparator /> : null}
        <span className="inline-flex items-center gap-1.5">
          {hasWatchedSubject && isRewatch ? (
            <Icon icon="solar:refresh-bold" size={16} className="text-success" />
          ) : null}
          <span>{activityLabel}</span>
        </span>
        <ReviewMetaSeparator />
        <span className="text-xs sm:text-sm">{formattedDate}</span>
      </div>
    </>
  );
}

export function FeedReviewContent({
  accountHref,
  activityLabel,
  className,
  displayName,
  formattedDate,
  hasLiked,
  hasLikedSubject,
  hasRating,
  hasText,
  isLikeDisabled,
  isOwnReview,
  isSpoilerHidden,
  likesCount,
  onDeleteRequest,
  onEdit,
  onLike,
  resolvedRating,
  revealSpoiler,
  review,
  showSubject,
  subjectHref,
}) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-white/70 sm:text-sm">
            <div className="flex items-center gap-2">
              {hasRating ? <RatingStars rating={resolvedRating} /> : null}
              {hasLikedSubject ? <Icon icon="solar:heart-bold" size={16} className="text-error" /> : null}
            </div>
            {hasRating || hasLikedSubject ? <ReviewMetaSeparator /> : null}
            <span className="inline-flex items-center gap-1.5">
              <span>{activityLabel}</span>
              <Link href={accountHref} className="font-semibold text-white">
                {displayName}
              </Link>
            </span>
            <ReviewMetaSeparator />
            <span>{formattedDate}</span>
          </div>

          {hasText ? (
            isSpoilerHidden ? (
              <SpoilerNotice onReveal={revealSpoiler} />
            ) : (
              <p className="movie-detail-reading-measure mt-1 text-sm leading-[1.6] [overflow-wrap:anywhere] break-words whitespace-pre-wrap sm:text-base sm:leading-[1.65]">
                {review.content}
              </p>
            )
          ) : (
            hasRating && <p className="mt-1 text-sm leading-6">- Rated without review</p>
          )}

          {showSubject && subjectHref && review.subjectTitle ? (
            <SubjectLink review={review} subjectHref={subjectHref} />
          ) : null}
        </div>

        {isOwnReview ? <ReviewActions disabled={false} onEdit={onEdit} onDeleteRequest={onDeleteRequest} /> : null}
      </div>

      {!isSpoilerHidden ? (
        <ReviewLikeButton disabled={isLikeDisabled} hasLiked={hasLiked} likesCount={likesCount} onClick={onLike} />
      ) : null}
    </div>
  );
}

function SubjectLink({ review, subjectHref }) {
  return (
    <Link
      href={subjectHref}
      className="text-info mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase"
    >
      <Icon icon={review.subjectType === 'list' ? 'solar:list-broken' : 'solar:clapperboard-play-bold'} size={14} />
      <span>
        {review.subjectType === 'list' && review.subjectOwnerUsername ? (
          <>
            <span>{review.subjectOwnerUsername}&apos;s list:</span> {review.subjectTitle}
          </>
        ) : (
          review.subjectTitle
        )}
      </span>
    </Link>
  );
}
