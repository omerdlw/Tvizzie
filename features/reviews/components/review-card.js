'use client';

import { useState } from 'react';

import { cn, formatDate, getUserAvatarFallbackUrl, getUserAvatarUrl } from '@/core/utils';
import { usePosterPreferenceVersion } from '@/features/media/poster-overrides';

import { ReviewActions, ReviewVisual } from './review-card-controls';
import { FeedReviewContent, SubjectReviewContent } from './review-card-content';
import {
  getAccountActivityLabel,
  getFeedActivityLabel,
  getReviewPosterSrc,
  isInteractiveTarget,
  resolveSubjectHref,
} from './review-card-utils';

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getSubjectKeyVariants(value) {
  const normalized = normalizeKey(value);

  if (!normalized) {
    return [];
  }

  const variants = new Set([normalized]);

  if (normalized.includes(':')) {
    variants.add(normalized.replace(/:/g, '_'));
  }

  if (normalized.includes('_')) {
    variants.add(normalized.replace(/_/g, ':'));
  }

  return [...variants];
}

export default function ReviewCard({
  className = '',
  review,
  currentUserId,
  displayVariant = 'media',
  isOwnReview = false,
  likedMediaKeys = null,
  onDeleteRequest,
  onEdit,
  onLike,
  rewatchMediaKeys = null,
  showSubject = false,
  watchedMediaKeys = null,
}) {
  usePosterPreferenceVersion();
  const [isSpoilerVisible, setIsSpoilerVisible] = useState(false);

  const isAccountVariant = displayVariant === 'account';
  const isActivityVariant = displayVariant === 'activity';
  const isSubjectCardVariant = isAccountVariant || isActivityVariant;
  const isSpoiler = Boolean(review.isSpoiler);
  const isSpoilerHidden = isSpoiler && !isSpoilerVisible;
  const hasLiked = currentUserId ? review.likes?.includes(currentUserId) : false;
  const likesCount = review.likes?.length || 0;
  const resolvedRating = Number(review.rating);
  const hasRating = review.subjectType !== 'list' && Number.isFinite(resolvedRating);
  const hasText = Boolean(review.content?.trim());
  const isLikeDisabled = currentUserId && review.user?.id === currentUserId;
  const activityLabel = isSubjectCardVariant
    ? getAccountActivityLabel(review, { hasRating, hasText })
    : getFeedActivityLabel(review, { hasRating, hasText });
  const displayName = review.user?.displayName || review.user?.name || review.user?.email || 'Anonymous User';
  const username = review.user?.username;
  const timestamp = review.updatedAt || review.createdAt;
  const formattedDate = timestamp ? formatDate(timestamp) : 'Just now';
  const accountHref = `/account/${username || review.user?.id || review.id}`;
  const visualSrc = isSubjectCardVariant ? getReviewPosterSrc(review) : getUserAvatarUrl(review.user);
  const visualFallbackSrc = isSubjectCardVariant ? null : getUserAvatarFallbackUrl(review.user);
  const subjectHref = resolveSubjectHref(review, isSubjectCardVariant);
  const previewItems = Array.isArray(review.subjectPreviewItems) ? review.subjectPreviewItems : [];
  const reviewSubjectKey =
    review.subjectKey ||
    review.mediaKey ||
    (review.subjectType && review.subjectId
      ? `${normalizeKey(review.subjectType)}_${normalizeKey(review.subjectId)}`
      : null);
  const hasLikedSubjectFromSet =
    review.subjectType !== 'list' &&
    getSubjectKeyVariants(reviewSubjectKey).some((keyVariant) => likedMediaKeys?.has?.(keyVariant));
  const hasLikedSubject = Boolean(hasLikedSubjectFromSet || review.authorHasLikedSubject);
  const hasWatchedSubject = Boolean(
    review.subjectType !== 'list' && reviewSubjectKey && watchedMediaKeys?.has?.(reviewSubjectKey)
  );
  const isRewatch = Boolean(
    review.subjectType !== 'list' && reviewSubjectKey && rewatchMediaKeys?.has?.(reviewSubjectKey)
  );
  const contentClass = cn('flex min-w-0 flex-1 flex-col', isSubjectCardVariant ? 'gap-1 self-stretch' : 'gap-1');
  const revealSpoiler = () => setIsSpoilerVisible(true);
  const handleCardClick = (event) => {
    if (!isSpoilerHidden || isInteractiveTarget(event.target)) {
      return;
    }

    revealSpoiler();
  };

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'relative border-b border-white/5 transition-[filter,color,background-color,border-color,opacity] [transition-duration:240ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)] hover:brightness-105 focus-within:brightness-105 last:border-b-0',
        isSubjectCardVariant && 'account-detail-full-width-item',
        isAccountVariant ? 'py-4' : 'p-5',
        isSpoilerHidden && 'cursor-pointer',
        className
      )}
    >
      <div className="relative">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <ReviewVisual
              alt={isSubjectCardVariant ? review.subjectTitle || 'Poster' : displayName}
              fallbackSrc={visualFallbackSrc}
              isAccountVariant={isSubjectCardVariant}
              isListSubject={review.subjectType === 'list'}
              previewItems={previewItems}
              src={visualSrc}
            />

            {isAccountVariant && isOwnReview && (
              <ReviewActions mobile disabled={false} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />
            )}
          </div>

          {isSubjectCardVariant ? (
            <SubjectReviewContent
              activityLabel={activityLabel}
              className={contentClass}
              formattedDate={formattedDate}
              hasLiked={hasLiked}
              hasLikedSubject={hasLikedSubject}
              hasRating={hasRating}
              hasText={hasText}
              hasWatchedSubject={hasWatchedSubject}
              isActivityVariant={isActivityVariant}
              isLikeDisabled={isLikeDisabled}
              isOwnReview={isOwnReview}
              isRewatch={isRewatch}
              isSpoilerHidden={isSpoilerHidden}
              likesCount={likesCount}
              onDeleteRequest={onDeleteRequest}
              onEdit={onEdit}
              onLike={onLike}
              resolvedRating={resolvedRating}
              revealSpoiler={revealSpoiler}
              review={review}
              showSubject={showSubject}
              subjectHref={subjectHref}
            />
          ) : (
            <FeedReviewContent
              accountHref={accountHref}
              activityLabel={activityLabel}
              className={contentClass}
              displayName={displayName}
              formattedDate={formattedDate}
              hasLiked={hasLiked}
              hasLikedSubject={hasLikedSubject}
              hasRating={hasRating}
              hasText={hasText}
              isLikeDisabled={isLikeDisabled}
              isOwnReview={isOwnReview}
              isSpoilerHidden={isSpoilerHidden}
              likesCount={likesCount}
              onDeleteRequest={onDeleteRequest}
              onEdit={onEdit}
              onLike={onLike}
              resolvedRating={resolvedRating}
              revealSpoiler={revealSpoiler}
              review={review}
              showSubject={showSubject}
              subjectHref={subjectHref}
            />
          )}
        </div>
      </div>
    </article>
  );
}
