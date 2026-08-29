'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TMDB_IMG } from '@/shared';
import { canUseNextImageOptimization, resolveImageQuality } from '@/shared';
import { cn } from '@/ui/class-names';
import { formatDate } from '@/shared';
import { getUserAvatarUrl } from '@/domains/account/utils/avatar';
import { isTitleMediaType, normalizeMediaType } from '@/domains/media/utils/media-key';
import {
  getPreferredMediaPosterSrc,
  usePosterPreferenceVersion,
} from '@/domains/media/utils/poster-preferences';
import { Button } from '@/ui/primitives';
import AdaptiveImage from '@/ui/components/adaptive-image';
import Icon from '@/ui/primitives/icon';
import ListPreviewComposition from '@/domains/media/ui/components/list-preview-composition';
import RatingStars from './rating-stars';

function formatLetterboxdDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = date.getDate();
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function getReviewPosterSrc(review) {
  if (isTitleMediaType(review?.subjectType)) {
    const preferred = getPreferredMediaPosterSrc(
      {
        entityType: review.subjectType,
        id: review.subjectId,
        poster_path: review.subjectPoster,
      },
      'w342',
      review.subjectType,
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

function ReviewLikeButton({ disabled = false, hasLiked = false, likesCount = 0, onClick }) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async (e) => {
    if (disabled || isPending) return;
    setIsPending(true);
    try {
      await onClick?.(e);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button
      disabled={disabled || isPending}
      onClick={handleClick}
      type="button"
      className={cn(
        'inline-flex w-fit cursor-pointer items-center justify-start gap-1.5 self-start pt-0 text-xs font-medium transition-colors duration-200 disabled:cursor-default disabled:opacity-50',
        hasLiked ? 'text-error' : 'text-white/40 hover:text-white/70',
      )}
    >
      <Icon
        icon="solar:heart-bold"
        size={14}
        className={cn(
          'transition-transform duration-300',
          hasLiked ? 'text-error scale-110' : 'text-white/40',
        )}
      />
      <span className="tabular-nums">{getReviewLikeText(likesCount)}</span>
    </Button>
  );
}

function ReviewActions({ disabled, onDeleteRequest, onEdit, mobile = false, inline = false }) {
  return (
    <div
      className={cn(
        'shrink-0 items-center gap-2.5',
        mobile
          ? 'absolute top-0 right-0 flex sm:hidden'
          : inline
            ? 'flex sm:hidden'
            : 'hidden sm:flex',
      )}
    >
      <Button
        disabled={disabled}
        className="center size-8 cursor-pointer rounded-[12px] bg-white/5 text-white/70 ring-1 ring-white/5 transition-colors duration-300 ease-out ring-inset hover:bg-white/10 hover:text-white"
        title="Edit Review"
        onClick={onEdit}
        type="button"
      >
        <Icon icon="solar:pen-bold" size={16} />
      </Button>
      <Button
        className="center hover:text-error size-8 cursor-pointer rounded-[12px] bg-white/5 text-white/70 ring-1 ring-white/5 transition-colors duration-300 ease-out ring-inset hover:bg-white/10"
        disabled={disabled}
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
  if (isAccountVariant && isListSubject) {
    return (
      <ListPreviewComposition className="shrink-0" fallbackPoster={src} items={previewItems} />
    );
  }

  const wrapperClass = isAccountVariant
    ? 'relative h-24 w-16 shrink-0 overflow-hidden rounded-[20px] sm:h-28 sm:w-[72px]'
    : 'relative size-9 sm:size-10 shrink-0 overflow-hidden rounded-[20px]';

  return (
    <div className={wrapperClass}>
      {src ? (
        <AdaptiveImage
          src={src}
          alt={alt}
          fill
          sizes={isAccountVariant ? '(max-width: 640px) 64px, 72px' : '40px'}
          quality={resolveImageQuality(isAccountVariant ? 'poster' : 'feature')}
          decoding="async"
          unoptimized={!canUseNextImageOptimization(src)}
          className={'rounded-[20px] object-cover'}
          wrapperClassName={'size-full rounded-[20px]'}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-white/5 ring-1 ring-white/5 ring-inset',
            isAccountVariant ? 'rounded-[20px]' : 'rounded-full',
          )}
        >
          <Icon
            icon={isAccountVariant ? 'solar:clapperboard-play-bold' : 'solar:user-bold'}
            size={isAccountVariant ? 24 : 18}
          />
        </div>
      )}
    </div>
  );
}

function SpoilerNotice({ compact = false, onReveal }) {
  return (
    <Button
      type="button"
      onClick={onReveal}
      className={cn(
        'group inline-flex w-full items-center justify-between gap-3 rounded-[20px] bg-white/5 p-3 text-left ring-1 ring-white/5 ring-inset hover:bg-white/10',
        compact ? 'mt-2' : 'mt-2.5',
      )}
      aria-label="Show spoiler review"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-white/40 uppercase group-hover:text-white/70">
          Spoiler warning
        </span>
        <span className="block text-sm leading-6 text-white/70 group-hover:text-white">
          This review contains spoilers. Click to show the full review.
        </span>
      </span>

      <span className="text-info shrink-0 p-2 text-xs font-semibold uppercase">Show</span>
    </Button>
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
  removeBottomPadding = false,
  removeTopPadding = false,
  showSubject = false,
  watchedMediaKeys = null,
}) {
  usePosterPreferenceVersion();
  const [isSpoilerVisible, setIsSpoilerVisible] = useState(false);

  const isAccountVariant = displayVariant === 'account';
  const isActivityVariant = displayVariant === 'activity';
  const isSubjectCardVariant = isAccountVariant || isActivityVariant;
  const isRecentMediaVariant = displayVariant === 'media-recent';
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

  const letterboxdDate = timestamp ? formatLetterboxdDate(timestamp) : 'Just now';

  const accountHref = `/account/${username || review.user?.id || review.id}`;
  const visualSrc = isSubjectCardVariant
    ? getReviewPosterSrc(review)
    : getUserAvatarUrl(review.user);
  const subjectHref = resolveSubjectHref(review, isSubjectCardVariant);
  const previewItems = Array.isArray(review.subjectPreviewItems) ? review.subjectPreviewItems : [];

  const reviewSubjectKey = review.subjectKey || review.mediaKey || null;
  const isListSubject = review.subjectType === 'list';
  const hasLikedSubject = Boolean(
    review.isLiked ||
    review.hasLiked ||
    review.is_liked ||
    review.userLiked ||
    review.payload?.isLiked ||
    review.payload?.is_liked ||
    (likedMediaKeys &&
      ((reviewSubjectKey && likedMediaKeys.has(reviewSubjectKey)) ||
        (review.subjectId &&
          (likedMediaKeys.has(String(review.subjectId)) ||
            likedMediaKeys.has(`list_${review.subjectId}`) ||
            likedMediaKeys.has(`list:${review.subjectId}`))) ||
        (review.subjectSlug && likedMediaKeys.has(String(review.subjectSlug))))),
  );
  const hasWatchedSubject = Boolean(
    !isListSubject && reviewSubjectKey && watchedMediaKeys?.has?.(reviewSubjectKey),
  );

  const revealSpoiler = () => setIsSpoilerVisible(true);

  const handleCardClick = (event) => {
    if (!isSpoilerHidden || isInteractiveTarget(event.target)) return;
    revealSpoiler();
  };

  return (
    <article
      onClick={handleCardClick}
      data-review-card={isRecentMediaVariant ? 'recent-media' : undefined}
      className={cn(
        'relative border-b border-white/10 transition-colors duration-300 ease-out last:border-b-0',
        removeTopPadding ? 'pt-1 sm:pt-1.5' : 'pt-3.5 sm:pt-4',
        removeBottomPadding ? 'pb-1 sm:pb-1.5' : 'pb-3.5 sm:pb-4',
        isSpoilerHidden && 'cursor-pointer',
        className,
      )}
    >
      <div
        className={cn(
          'relative min-w-0 items-start',
          isRecentMediaVariant
            ? 'grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-3.5'
            : 'flex gap-3 sm:gap-3.5',
        )}
      >
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

        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col gap-1 sm:gap-1.5',
            isSubjectCardVariant && 'self-stretch',
          )}
        >
          {isSubjectCardVariant ? (
            <>
              {!isActivityVariant ? (
                <>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {showSubject && subjectHref && review.subjectTitle && (
                        <Link
                          href={subjectHref}
                          className="line-clamp-2 block min-w-0 text-lg font-semibold sm:text-xl"
                        >
                          {review.subjectTitle}
                        </Link>
                      )}
                    </div>
                    {isOwnReview && (
                      <ReviewActions onDeleteRequest={onDeleteRequest} onEdit={onEdit} />
                    )}
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5 text-sm text-white/70">
                    <span className="text-white/40">Review by</span>
                    <Link
                      href={accountHref}
                      className="truncate font-semibold text-white hover:underline"
                    >
                      {displayName}
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/70">
                    {hasRating && <RatingStars rating={resolvedRating} />}
                    {hasLikedSubject && (
                      <Icon icon="solar:heart-bold" size={16} className="text-warning" />
                    )}
                    <span>{activityLabel}</span>
                    <span className="text-xs sm:text-sm">{formattedDate}</span>
                  </div>
                </>
              ) : hasRating ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-white/70">
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
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {displayVariant === 'media-recent' ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-snug text-white/70">
                    <span className="text-white/40">Review by</span>
                    <Link href={accountHref} className="font-semibold text-white hover:underline">
                      {displayName}
                    </Link>
                    {hasRating && <RatingStars rating={resolvedRating} />}
                    {hasLikedSubject && (
                      <Icon icon="solar:heart-bold" size={16} className="text-warning" />
                    )}
                  </div>
                ) : isListSubject || displayVariant === 'list-detail' ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-white/70">
                    <Link href={accountHref} className="font-semibold text-white hover:underline">
                      {displayName}
                    </Link>
                    <span className="text-white/40">•</span>
                    <span className="text-xs text-white/40 sm:text-sm">{formattedDate}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-white/70">
                    {hasRating && <RatingStars rating={resolvedRating} />}
                    {hasLikedSubject && (
                      <Icon icon="solar:heart-bold" size={16} className="text-warning" />
                    )}
                    <span className="text-white/40">Watched by</span>
                    <Link href={accountHref} className="font-semibold text-white hover:underline">
                      {displayName}
                    </Link>
                    <span className="text-xs text-white/40 sm:text-sm">{letterboxdDate}</span>
                  </div>
                )}

                {hasText ? (
                  isSpoilerHidden ? (
                    <SpoilerNotice onReveal={revealSpoiler} />
                  ) : (
                    <p className="text-sm leading-normal [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-white/70">
                      {review.content}
                    </p>
                  )
                ) : (
                  hasRating && (
                    <p className="text-xs text-white/40 sm:text-sm">- Rated without review</p>
                  )
                )}

                {showSubject && subjectHref && review.subjectTitle && (
                  <Link
                    href={subjectHref}
                    className="text-info inline-flex items-center gap-1.5 text-xs font-semibold uppercase hover:underline"
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
