'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import ListPreviewComposition from '@/features/shared/list-preview-composition';
import { TMDB_IMG } from '@/core/constants';
import { canUseNextImageOptimization, cn, formatDate, getUserAvatarUrl } from '@/core/utils';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

import RatingStars from './rating-stars';

function getReviewPosterSrc(review) {
  const poster = String(review?.subjectPoster || '').trim();

  if (!poster) return null;
  if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
  if (poster.startsWith('/')) return `${TMDB_IMG}/w342${poster}`;

  return poster;
}

function getReviewLikeText(likesCount) {
  if (likesCount === 0) return 'Like';
  if (likesCount === 1) return '1 like';
  return `${likesCount} likes`;
}

function getAccountActivityLabel(review, { hasRating, hasText }) {
  if (review.subjectType === 'list') {
    return hasText ? 'List review' : 'List note';
  }

  if (hasText) {
    return 'Watched';
  }

  if (hasRating) {
    return 'Rated';
  }

  return 'Logged';
}

function getFeedActivityLabel(review, { hasRating, hasText }) {
  if (review.subjectType === 'list') {
    return hasText ? 'List review by' : 'List note by';
  }

  if (hasText) {
    return 'Review by';
  }

  if (hasRating) {
    return 'Rated by';
  }

  return 'Logged by';
}

function ReviewLikeButton({ disabled = false, hasLiked = false, likesCount = 0, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-50',
        hasLiked ? 'text-[#be123c]' : 'text-black/60 hover:text-black/80'
      )}
    >
      <Icon icon="solar:heart-bold" size={17} className={hasLiked ? 'text-[#be123c]' : 'text-black/65'} />
      <span>{getReviewLikeText(likesCount)}</span>
    </button>
  );
}

function ReviewActions({ disabled, onEdit, onDeleteRequest, mobile = false, inline = false }) {
  return (
    <div
      className={cn(
        'shrink-0 items-center gap-2',
        mobile ? 'absolute top-0 right-0 flex sm:hidden' : inline ? 'flex sm:hidden' : 'hidden sm:flex'
      )}
    >
      <button
        disabled={disabled}
        className="bg-primary/40 hover:bg-primary/70 flex size-8 items-center justify-center rounded-[12px] border border-black/10 text-black/70 transition-colors hover:border-black/20"
        title="Edit Review"
        onClick={onEdit}
        type="button"
      >
        <Icon icon="solar:pen-bold" size={16} />
      </button>
      <Button
        variant="destructive-icon"
        disabled={disabled}
        className="size-8 rounded-[12px]"
        onClick={onDeleteRequest}
        title="Delete Review"
        type="button"
      >
        <Icon icon="solar:trash-bin-trash-bold" size={16} />
      </Button>
    </div>
  );
}

function ReviewVisual({ alt, isAccountVariant, isListSubject = false, previewItems = [], src }) {
  const wrapperClass = isAccountVariant
    ? 'relative h-24 w-16 shrink-0 overflow-hidden rounded-[12px] sm:h-28 sm:w-[72px]'
    : 'relative size-14 shrink-0 overflow-hidden rounded-[12px] border border-black/10 bg-primary/30';

  return (
    <div className={wrapperClass}>
      {isAccountVariant && isListSubject ? (
        <ListPreviewComposition className="" emptyIcon="solar:list-broken" items={previewItems} />
      ) : src ? (
        <Image
          className={cn('object-cover', !isAccountVariant && 'rounded-[12px]')}
          src={src}
          alt={alt}
          fill
          sizes={isAccountVariant ? '(max-width: 640px) 64px, 72px' : '56px'}
          quality={isAccountVariant ? 78 : 82}
          unoptimized={!canUseNextImageOptimization(src)}
        />
      ) : (
        <div className="bg-primary/40 flex h-full w-full items-center justify-center rounded-[inherit] border border-black/10 text-[#475569]">
          <Icon
            icon={isAccountVariant ? 'solar:clapperboard-play-bold' : 'solar:user-bold'}
            size={isAccountVariant ? 24 : 20}
          />
        </div>
      )}
    </div>
  );
}

function isInteractiveTarget(target) {
  return Boolean(
    target instanceof Element && target.closest('a, button, input, textarea, select, summary, [role="button"]')
  );
}

function SpoilerNotice({ compact = false, onReveal }) {
  return (
    <button
      type="button"
      onClick={onReveal}
      className={cn(
        'group bg-primary inline-flex w-full items-center justify-between gap-3 rounded-[12px] border border-black/10 px-4 py-3 text-left transition-all hover:border-black/15 hover:bg-black/5',
        compact ? 'mt-2' : 'mt-2.5'
      )}
      aria-label="Show spoiler review"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wider text-black/50 uppercase transition-colors group-hover:text-black/70">
          Spoiler warning
        </span>
        <span className="mt-1 block text-sm leading-6 text-black/70 transition-colors group-hover:text-black">
          This review contains spoilers. Click to show the full review.
        </span>
      </span>

      <span className="shrink-0 rounded-lg bg-black/5 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-black/70 uppercase transition-all group-hover:bg-black/10 group-hover:text-black">
        Show
      </span>
    </button>
  );
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
  const [isSpoilerVisible, setIsSpoilerVisible] = useState(false);

  const isAccountVariant = displayVariant === 'account';
  const isSpoiler = Boolean(review.isSpoiler);
  const isSpoilerHidden = isSpoiler && !isSpoilerVisible;
  const hasLiked = currentUserId ? review.likes?.includes(currentUserId) : false;
  const likesCount = review.likes?.length || 0;
  const hasRating = Number.isFinite(review.rating);
  const hasText = Boolean(review.content?.trim());
  const isLikeDisabled = currentUserId && review.user?.id === currentUserId;
  const activityLabel = isAccountVariant
    ? getAccountActivityLabel(review, { hasRating, hasText })
    : getFeedActivityLabel(review, { hasRating, hasText });
  const displayName = review.user?.displayName || review.user?.name || review.user?.email || 'Anonymous User';
  const username = review.user?.username;
  const timestamp = review.updatedAt || review.createdAt;
  const formattedDate = timestamp ? formatDate(timestamp) : 'Just now';
  const accountHref = `/account/${username || review.user?.id || review.id}`;
  const visualSrc = isAccountVariant ? getReviewPosterSrc(review) : getUserAvatarUrl(review.user);
  const previewItems = Array.isArray(review.subjectPreviewItems) ? review.subjectPreviewItems : [];
  const reviewSubjectKey = review.subjectKey || review.mediaKey || null;
  const hasLikedSubject = Boolean(
    review.subjectType !== 'list' && reviewSubjectKey && likedMediaKeys?.has?.(reviewSubjectKey)
  );
  const hasWatchedSubject = Boolean(
    review.subjectType !== 'list' && reviewSubjectKey && watchedMediaKeys?.has?.(reviewSubjectKey)
  );
  const isRewatch = Boolean(
    review.subjectType !== 'list' && reviewSubjectKey && rewatchMediaKeys?.has?.(reviewSubjectKey)
  );
  const contentClass = cn('flex min-w-0 flex-1 flex-col', isAccountVariant ? 'gap-1.5 self-stretch' : 'gap-2');
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
        'relative border-b border-black/10 last:border-b-0',
        isAccountVariant ? 'py-4 sm:py-5' : 'py-4 sm:py-5',
        isSpoilerHidden && 'cursor-pointer',
        className
      )}
    >
      <div className="relative transition-all duration-(--motion-duration-normal)">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <ReviewVisual
              alt={isAccountVariant ? review.subjectTitle || 'Poster' : displayName}
              isAccountVariant={isAccountVariant}
              isListSubject={review.subjectType === 'list'}
              previewItems={previewItems}
              src={visualSrc}
            />

            {isAccountVariant && isOwnReview && (
              <ReviewActions mobile disabled={false} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />
            )}
          </div>

          <div className={contentClass}>
            {isAccountVariant ? (
              <>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {showSubject && review.subjectHref && review.subjectTitle && (
                      <Link
                        href={review.subjectHref}
                        className="block min-w-0 text-lg font-semibold tracking-tight transition sm:text-xl"
                        style={{
                          display: '-webkit-box',
                          overflow: 'hidden',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                        }}
                      >
                        {review.subjectTitle}
                      </Link>
                    )}
                  </div>

                  {isOwnReview && <ReviewActions disabled={false} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-black/70">
                  {hasRating && <RatingStars rating={review.rating} />}
                  {hasLikedSubject && <Icon icon="solar:heart-bold" size={16} className="text-[#be123c]" />}
                  {hasWatchedSubject && isRewatch && (
                    <Icon icon="solar:refresh-bold" size={16} className="text-[#15803d]" />
                  )}
                  <span>{activityLabel}</span>
                  <span className="text-xs text-[#475569] sm:text-sm">{formattedDate}</span>
                </div>

                {hasText &&
                  (isSpoilerHidden ? (
                    <SpoilerNotice compact onReveal={revealSpoiler} />
                  ) : (
                    <p
                      className="min-w-0 text-sm leading-6 [overflow-wrap:anywhere] break-words"
                      style={{
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 2,
                      }}
                    >
                      {review.content}
                    </p>
                  ))}

                {!hasText && hasRating && (
                  <p className="min-w-0 text-sm leading-6 text-[#475569] italic">Rated without review</p>
                )}

                {!isSpoilerHidden && (
                  <ReviewLikeButton
                    disabled={isLikeDisabled}
                    hasLiked={hasLiked}
                    likesCount={likesCount}
                    onClick={onLike}
                  />
                )}
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-black/70 sm:text-sm">
                      {hasRating && <RatingStars rating={review.rating} />}
                      <span>{activityLabel}</span>
                      <Link href={accountHref} className="font-semibold transition-colors">
                        {displayName}
                      </Link>
                      <span className="text-[#475569]">{formattedDate}</span>
                    </div>

                    {hasText ? (
                      isSpoilerHidden ? (
                        <SpoilerNotice onReveal={revealSpoiler} />
                      ) : (
                        <p className="mt-1.5 text-sm leading-[1.6] [overflow-wrap:anywhere] break-words whitespace-pre-wrap sm:text-[15px] sm:leading-[1.65]">
                          {review.content}
                        </p>
                      )
                    ) : (
                      <p className="mt-1.5 text-sm leading-6 text-[#475569] italic">
                        {hasRating ? 'Rated without review' : 'Logged without review'}
                      </p>
                    )}

                    {showSubject && review.subjectHref && review.subjectTitle && (
                      <Link
                        href={review.subjectHref}
                        className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-[#1d4ed8] uppercase transition"
                      >
                        <Icon
                          icon={review.subjectType === 'list' ? 'solar:list-broken' : 'solar:clapperboard-play-bold'}
                          size={14}
                        />
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
                    )}
                  </div>

                  {isOwnReview && <ReviewActions disabled={false} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />}
                </div>

                {!isSpoilerHidden && (
                  <ReviewLikeButton
                    disabled={isLikeDisabled}
                    hasLiked={hasLiked}
                    likesCount={likesCount}
                    onClick={onLike}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
