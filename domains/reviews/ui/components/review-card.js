'use client';

/**
 * Media Reviews - Single Review Card Component
 * Path: features/media-reviews/parts/review-card.js
 */

import { useState } from 'react';
import Link from 'next/link';
import { TMDB_IMG } from '@/shared/constants';
import { canUseNextImageOptimization, cn, formatDate, resolveImageQuality } from '@/shared/utils';
import { getUserAvatarUrl } from '@/domains/account/utils';
import { isTitleMediaType, normalizeMediaType } from '@/domains/media/utils';
import {
  getPreferredMoviePosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/ui/poster-overrides';
import { Button } from '@/ui/primitives';
import AdaptiveImage from '@/ui/primitives/adaptive-image';
import Icon from '@/ui/primitives/icon';
import ListPreviewComposition from '@/domains/media/ui/components/media-list-preview';
import RatingStars from './rating-stars';

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================

function getReviewPosterSrc(review) {
  if (review?.subjectType === 'movie') {
    const preferred = getPreferredMoviePosterSrc(
      { id: review?.subjectId, poster_path: review?.subjectPoster },
      'w342',
    );
    if (preferred) return preferred;
  }
  const poster = String(review?.subjectPoster || '').trim();
  if (!poster) return null;
  if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
  if (poster.startsWith('/')) return `${TMDB_IMG}/w342${poster}`;
  return poster;
}

function getReviewLikeText(likesCount) {
  if (!likesCount) return 'Like';
  return likesCount === 1 ? '1 like' : `${likesCount} likes`;
}

function getAccountActivityLabel(review, { hasRating, hasText }) {
  if (review.subjectType === 'list') return hasText ? 'List comment' : 'List note';
  if (hasText) return 'Watched';
  if (hasRating) return 'Rated';
  return 'Logged';
}

function getFeedActivityLabel(review, { hasRating, hasText }) {
  if (review.subjectType === 'list') return hasText ? 'List comment by' : 'List note by';
  if (hasText) return 'Review by';
  if (hasRating) return 'Rated by';
  return 'Logged by';
}

function appendQueryParam(href, key, value) {
  const safeHref = String(href || '').trim();
  const safeValue = String(value || '').trim();
  if (!safeHref || !safeValue) return safeHref;

  const [pathPart, hashPart = ''] = safeHref.split('#');
  const [pathname, search = ''] = pathPart.split('?');
  const params = new URLSearchParams(search);
  params.set(key, safeValue);

  const query = params.toString();
  const withQuery = query ? `${pathname}?${query}` : pathname;
  return hashPart ? `${withQuery}#${hashPart}` : withQuery;
}

function resolveMediaReviewsHref(review) {
  const subjectId = String(review?.subjectId || '').trim();
  const rawHref = String(review?.subjectHref || '').trim();
  const explicitType = normalizeMediaType(review?.subjectType);

  const rawMatch = rawHref.match(/^\/(movie|tv)\/([^/?#]+)([?#].*)?$/);
  const rawReviewsMatch = rawHref.match(/^\/(movie|tv)\/[^/?#]+\/reviews(?:[?#].*)?$/);

  const subjectType = isTitleMediaType(explicitType) ? explicitType : rawMatch?.[1] || null;

  let baseHref = '';
  if (subjectId && subjectType) {
    baseHref = `/${subjectType}/${subjectId}/reviews`;
  } else if (rawHref) {
    if (rawReviewsMatch) {
      baseHref = rawHref;
    } else if (rawMatch) {
      baseHref = `/${rawMatch[1]}/${rawMatch[2]}/reviews${rawMatch[3] || ''}`;
    }
  }

  if (!baseHref) return rawHref || null;

  const reviewUser = String(
    review?.user?.username || review?.user?.id || review?.reviewUserId || '',
  ).trim();

  return appendQueryParam(baseHref, 'user', reviewUser);
}

function resolveSubjectHref(review, isAccountVariant) {
  const rawHref = String(review?.subjectHref || '').trim();
  if (!isAccountVariant) return rawHref || null;
  return isTitleMediaType(review?.subjectType) ? resolveMediaReviewsHref(review) : rawHref || null;
}

function isInteractiveTarget(target) {
  return Boolean(
    target instanceof Element &&
    target.closest('a, button, input, textarea, select, summary, [role="button"]'),
  );
}

// ==========================================
// 2. SUB-COMPONENTS
// ==========================================

function ReviewLikeButton({ disabled = false, hasLiked = false, likesCount = 0, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium disabled:cursor-default disabled:opacity-50',
        hasLiked ? 'text-error' : 'text-black/50 hover:text-black/70',
      )}
    >
      <Icon
        icon="solar:heart-bold"
        size={16}
        className={hasLiked ? 'text-error' : 'text-black/50'}
      />
      <span>{getReviewLikeText(likesCount)}</span>
    </button>
  );
}

function ReviewActions({ disabled, onDeleteRequest, onEdit, mobile = false, inline = false }) {
  return (
    <div
      className={cn(
        'shrink-0 items-center gap-2',
        mobile
          ? 'absolute top-0 right-0 flex sm:hidden'
          : inline
            ? 'flex sm:hidden'
            : 'hidden sm:flex',
      )}
    >
      <button
        disabled={disabled}
        className="bg-primary/30 hover:bg-primary/60 flex size-8 items-center justify-center rounded-xl border border-black/5 text-black/70 hover:border-black/10 hover:text-black"
        title="Edit Review"
        onClick={onEdit}
        type="button"
      >
        <Icon icon="solar:pen-bold" size={16} />
      </button>
      <Button
        variant="destructive"
        disabled={disabled}
        className="size-8 rounded-xl"
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
    ? 'relative h-24 w-16 shrink-0 overflow-hidden sm:h-28 sm:w-[72px] rounded-xl border border-black/10'
    : 'relative size-10 sm:size-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-primary/30';

  return (
    <div className={wrapperClass}>
      {isAccountVariant && isListSubject ? (
        <ListPreviewComposition
          className="rounded-xl"
          emptyIcon="solar:list-broken"
          items={previewItems}
        />
      ) : src ? (
        <AdaptiveImage
          className="rounded-xl object-cover"
          src={src}
          alt={alt}
          fill
          sizes={isAccountVariant ? '(max-width: 640px) 64px, 72px' : '48px'}
          quality={resolveImageQuality(isAccountVariant ? 'poster' : 'feature')}
          decoding="async"
          unoptimized={!canUseNextImageOptimization(src)}
          wrapperClassName="h-full w-full rounded-xl"
        />
      ) : (
        <div className="bg-primary/30 flex h-full w-full items-center justify-center rounded-xl border border-black/5">
          <Icon
            icon={isAccountVariant ? 'solar:clapperboard-play-bold' : 'solar:user-bold'}
            size={isAccountVariant ? 24 : 20}
          />
        </div>
      )}
    </div>
  );
}

function SpoilerNotice({ compact = false, onReveal }) {
  return (
    <button
      type="button"
      onClick={onReveal}
      className={cn(
        'group bg-primary inline-flex w-full items-center justify-between gap-3 rounded-xl border border-black/10 p-3 text-left transition-all duration-150 ease-in-out hover:border-black/15 hover:bg-black/5',
        compact ? 'mt-2' : 'mt-2.5',
      )}
      aria-label="Show spoiler review"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wider text-black/50 uppercase group-hover:text-black/70">
          Spoiler warning
        </span>
        <span className="block text-sm leading-6 text-black/70 group-hover:text-black">
          This review contains spoilers. Click to show the full review.
        </span>
      </span>

      <span className="text-info shrink-0 p-2 text-xs font-semibold tracking-wide uppercase transition-all duration-150 ease-in-out group-hover:text-black">
        Show
      </span>
    </button>
  );
}

// ==========================================
// 3. MAIN COMPONENT
// ==========================================

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

  // Variant & State Computations
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

  const displayName =
    review.user?.displayName || review.user?.name || review.user?.email || 'Anonymous User';
  const username = review.user?.username;
  const timestamp = review.updatedAt || review.createdAt;
  const formattedDate = timestamp ? formatDate(timestamp) : 'Just now';

  const accountHref = `/account/${username || review.user?.id || review.id}`;
  const visualSrc = isSubjectCardVariant
    ? getReviewPosterSrc(review)
    : getUserAvatarUrl(review.user);
  const subjectHref = resolveSubjectHref(review, isSubjectCardVariant);
  const previewItems = Array.isArray(review.subjectPreviewItems) ? review.subjectPreviewItems : [];

  const reviewSubjectKey = review.subjectKey || review.mediaKey || null;
  const hasLikedSubject = Boolean(
    review.subjectType !== 'list' && reviewSubjectKey && likedMediaKeys?.has?.(reviewSubjectKey),
  );
  const hasWatchedSubject = Boolean(
    review.subjectType !== 'list' && reviewSubjectKey && watchedMediaKeys?.has?.(reviewSubjectKey),
  );
  const isRewatch = Boolean(
    review.subjectType !== 'list' && reviewSubjectKey && rewatchMediaKeys?.has?.(reviewSubjectKey),
  );

  const revealSpoiler = () => setIsSpoilerVisible(true);

  const handleCardClick = (event) => {
    if (!isSpoilerHidden || isInteractiveTarget(event.target)) return;
    revealSpoiler();
  };

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        'relative border-b border-black/10 py-3.5 last:border-b-0 sm:py-4',
        isSpoilerHidden && 'cursor-pointer',
        className,
      )}
    >
      <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
        {/* Visual Element */}
        <div className="relative shrink-0">
          <ReviewVisual
            alt={isSubjectCardVariant ? review.subjectTitle || 'Poster' : displayName}
            isAccountVariant={isSubjectCardVariant}
            isListSubject={review.subjectType === 'list'}
            previewItems={previewItems}
            src={visualSrc}
          />
          {isAccountVariant && isOwnReview && (
            <ReviewActions mobile onDeleteRequest={onDeleteRequest} onEdit={onEdit} />
          )}
        </div>

        {/* Content Body */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-1',
            isSubjectCardVariant && 'self-stretch',
          )}
        >
          {isSubjectCardVariant ? (
            /* Subject Card Mode (Account/Activity) */
            <>
              {!isActivityVariant ? (
                <>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {showSubject && subjectHref && review.subjectTitle && (
                        <Link
                          href={subjectHref}
                          className="line-clamp-2 block min-w-0 text-lg font-semibold tracking-tight sm:text-xl"
                        >
                          {review.subjectTitle}
                        </Link>
                      )}
                    </div>
                    {isOwnReview && (
                      <ReviewActions onDeleteRequest={onDeleteRequest} onEdit={onEdit} />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-black/70">
                    {hasRating && <RatingStars rating={resolvedRating} />}
                    {hasLikedSubject && (
                      <Icon icon="solar:heart-bold" size={16} className="text-error" />
                    )}
                    {hasWatchedSubject && isRewatch && (
                      <Icon icon="solar:refresh-bold" size={16} className="text-success" />
                    )}
                    <span>{activityLabel}</span>
                    <span className="text-xs sm:text-sm">{formattedDate}</span>
                  </div>
                </>
              ) : hasRating ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-black/70">
                  <RatingStars rating={resolvedRating} />
                </div>
              ) : null}

              {hasText &&
                (isSpoilerHidden ? (
                  <SpoilerNotice compact onReveal={revealSpoiler} />
                ) : (
                  <p
                    className={cn(
                      'min-w-0 text-sm leading-6 [overflow-wrap:anywhere] break-words',
                      isActivityVariant ? 'line-clamp-3' : 'line-clamp-2',
                    )}
                  >
                    {review.content}
                  </p>
                ))}

              {!hasText && hasRating && !isActivityVariant && (
                <p className="min-w-0 text-sm leading-6">- Rated without review</p>
              )}

              {!isSpoilerHidden && !isActivityVariant && (
                <ReviewLikeButton
                  disabled={isLikeDisabled}
                  hasLiked={hasLiked}
                  likesCount={likesCount}
                  onClick={onLike}
                />
              )}
            </>
          ) : (
            /* Media Review Mode (Standard) */
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {/* Mobile Header */}
                <div className="flex flex-col gap-0.5 sm:hidden">
                  <div className="flex items-center gap-1.5 text-xs text-black/50">
                    {hasRating && <RatingStars rating={resolvedRating} />}
                    {hasRating && <span className="text-black/30">-</span>}
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-black/80">
                    <span className="text-black/60">{activityLabel}</span>
                    <Link href={accountHref} className="font-semibold text-black hover:underline">
                      {displayName}
                    </Link>
                  </div>
                </div>

                {/* Desktop Header */}
                <div className="hidden text-sm text-black/70 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2.5">
                  {hasRating && <RatingStars rating={resolvedRating} />}
                  <span className="text-black/60">{activityLabel}</span>
                  <Link href={accountHref} className="font-semibold text-black hover:underline">
                    {displayName}
                  </Link>
                  <span className="text-black/30">•</span>
                  <span className="text-xs text-black/50">{formattedDate}</span>
                </div>

                {/* Content Body */}
                {hasText ? (
                  isSpoilerHidden ? (
                    <SpoilerNotice onReveal={revealSpoiler} />
                  ) : (
                    <p className="text-sm leading-normal [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-black/80">
                      {review.content}
                    </p>
                  )
                ) : (
                  hasRating && (
                    <p className="text-xs text-black/50 sm:text-sm">- Rated without review</p>
                  )
                )}

                {/* Subject Link */}
                {showSubject && subjectHref && review.subjectTitle && (
                  <Link
                    href={subjectHref}
                    className="text-info inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase hover:underline"
                  >
                    <Icon
                      icon={
                        review.subjectType === 'list'
                          ? 'solar:list-broken'
                          : 'solar:clapperboard-play-bold'
                      }
                      size={14}
                    />
                    <span>
                      {review.subjectType === 'list' && review.subjectOwnerUsername ? (
                        <>
                          <span>{review.subjectOwnerUsername}&apos;s list:</span>{' '}
                          {review.subjectTitle}
                        </>
                      ) : (
                        review.subjectTitle
                      )}
                    </span>
                  </Link>
                )}

                {/* Like Button */}
                {!isSpoilerHidden && (
                  <ReviewLikeButton
                    disabled={isLikeDisabled}
                    hasLiked={hasLiked}
                    likesCount={likesCount}
                    onClick={onLike}
                  />
                )}
              </div>

              {isOwnReview && <ReviewActions onDeleteRequest={onDeleteRequest} onEdit={onEdit} />}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
