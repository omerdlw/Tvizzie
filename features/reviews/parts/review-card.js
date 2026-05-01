'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import ListPreviewComposition from '@/ui/media/list-preview-composition';
import { TMDB_IMG } from '@/core/constants';
import {
  canUseNextImageOptimization,
  cn,
  formatDate,
  getUserAvatarFallbackUrl,
  getUserAvatarUrl,
  resolveImageQuality,
} from '@/core/utils';
import { getPreferredMoviePosterSrc, usePosterPreferenceVersion } from '@/features/media/poster-overrides';
import AdaptiveImage from '@/ui/elements/adaptive-image';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

import RatingStars from './rating-stars';

function getReviewPosterSrc(review) {
  if (review?.subjectType === 'movie') {
    const preferredPoster = getPreferredMoviePosterSrc(
      {
        id: review?.subjectId,
        poster_path: review?.subjectPoster,
      },
      'w342'
    );

    if (preferredPoster) {
      return preferredPoster;
    }
  }

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
    return hasText ? 'List comment' : 'List note';
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
    return hasText ? 'List comment by' : 'List note by';
  }

  if (hasText) {
    return 'Review by';
  }

  if (hasRating) {
    return 'Rated by';
  }

  return 'Logged by';
}

function appendQueryParam(href, key, value) {
  const safeHref = String(href || '').trim();
  const safeValue = String(value || '').trim();

  if (!safeHref || !safeValue) {
    return safeHref;
  }

  const [pathPart, hashPart = ''] = safeHref.split('#');
  const [pathname, search = ''] = pathPart.split('?');
  const params = new URLSearchParams(search);

  params.set(key, safeValue);

  const query = params.toString();
  const withQuery = query ? `${pathname}?${query}` : pathname;

  return hashPart ? `${withQuery}#${hashPart}` : withQuery;
}

function resolveMovieReviewsHref(review) {
  const subjectId = String(review?.subjectId || '').trim();
  const rawSubjectHref = String(review?.subjectHref || '').trim();
  let baseHref = '';

  if (subjectId) {
    baseHref = `/movie/${subjectId}/reviews`;
  } else if (rawSubjectHref) {
    if (/^\/movie\/[^/?#]+\/reviews(?:[?#].*)?$/.test(rawSubjectHref)) {
      baseHref = rawSubjectHref;
    } else {
      const movieMatch = rawSubjectHref.match(/^\/movie\/([^/?#]+)([?#].*)?$/);

      if (movieMatch) {
        const movieId = movieMatch[1];
        const suffix = movieMatch[2] || '';
        baseHref = `/movie/${movieId}/reviews${suffix}`;
      }
    }
  }

  if (!baseHref) {
    return rawSubjectHref || null;
  }

  const reviewUser = String(review?.user?.username || review?.user?.id || review?.reviewUserId || '').trim();

  return appendQueryParam(baseHref, 'user', reviewUser);
}

function resolveSubjectHref(review, isAccountVariant) {
  const rawSubjectHref = String(review?.subjectHref || '').trim();

  if (!isAccountVariant) {
    return rawSubjectHref || null;
  }

  if (review?.subjectType === 'movie') {
    return resolveMovieReviewsHref(review);
  }

  return rawSubjectHref || null;
}

function ReviewLikeButton({ disabled = false, hasLiked = false, likesCount = 0, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-50',
        hasLiked ? 'text-error' : 'text-black/50 hover:text-black/70'
      )}
    >
      <Icon icon="solar:heart-bold" size={16} className={hasLiked ? 'text-error' : 'text-black/50'} />
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
        className="bg-primary/30 hover:bg-primary/60 flex size-8 items-center justify-center border border-black/10 text-black/70 transition-colors hover:border-black/15 hover:text-black"
        title="Edit Review"
        onClick={onEdit}
        type="button"
      >
        <Icon icon="solar:pen-bold" size={16} />
      </button>
      <Button
        variant="destructive"
        disabled={disabled}
        className="size-8"
        onClick={onDeleteRequest}
        title="Delete Review"
        type="button"
      >
        <Icon icon="solar:trash-bin-trash-bold" size={16} />
      </Button>
    </div>
  );
}

function ReviewVisual({ alt, fallbackSrc = null, isAccountVariant, isListSubject = false, previewItems = [], src }) {
  const [resolvedSrc, setResolvedSrc] = useState(src || null);

  useEffect(() => {
    setResolvedSrc(src || null);
  }, [src]);

  const wrapperClass = isAccountVariant
    ? 'relative h-24 w-16 shrink-0 overflow-hidden sm:h-28 sm:w-[72px] '
    : 'relative size-14 shrink-0 overflow-hidden border border-black/10 bg-primary/30 ';

  const handleImageError = () => {
    if (fallbackSrc && resolvedSrc !== fallbackSrc) {
      setResolvedSrc(fallbackSrc);
      return;
    }

    setResolvedSrc(null);
  };

  return (
    <div className={wrapperClass}>
      {isAccountVariant && isListSubject ? (
        <ListPreviewComposition className="" emptyIcon="solar:list-broken" items={previewItems} />
      ) : resolvedSrc ? (
        <AdaptiveImage
          className={cn('object-cover', !isAccountVariant && '')}
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={isAccountVariant ? '(max-width: 640px) 64px, 72px' : '56px'}
          quality={resolveImageQuality(isAccountVariant ? 'poster' : 'feature')}
          decoding="async"
          onError={handleImageError}
          unoptimized={!canUseNextImageOptimization(resolvedSrc)}
          wrapperClassName="h-full w-full"
        />
      ) : (
        <div className="bg-primary/40 flex h-full w-full items-center justify-center border border-black/10 text-black/60">
          <Icon
            icon={isAccountVariant ? 'solar:clapperboard-play-bold' : 'solar:user-bold'}
            size={isAccountVariant ? 24 : 20}
          />
        </div>
      )}
    </div>
  );
}

function ReviewMetaSeparator() {
  return (
    <span className="text-black/35" aria-hidden="true">
      •
    </span>
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
        'group bg-primary inline-flex w-full items-center justify-between gap-3 border border-black/10 p-3 text-left transition-all hover:border-black/15 hover:bg-black/5',
        compact ? 'mt-2' : 'mt-2.5'
      )}
      aria-label="Show spoiler review"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold tracking-wider text-black/50 uppercase transition-colors group-hover:text-black/70">
          Spoiler warning
        </span>
        <span className="block text-sm leading-6 text-black/70 transition-colors group-hover:text-black">
          This review contains spoilers. Click to show the full review.
        </span>
      </span>

      <span className="text-info group-hover:bg-primary shrink-0 p-2 text-[11px] font-semibold tracking-wide uppercase transition-all group-hover:text-black">
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
        'relative border-b border-black/10 last:border-b-0',
        isAccountVariant ? 'py-4 sm:py-5' : 'p-5',
        isSpoilerHidden && 'cursor-pointer',
        className
      )}
    >
      <div className="relative transition-all duration-[300ms]">
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

          <div className={contentClass}>
            {isSubjectCardVariant ? (
              <>
                {!isActivityVariant ? (
                  <>
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {showSubject && subjectHref && review.subjectTitle && (
                          <Link
                            href={subjectHref}
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

                      {isOwnReview && (
                        <ReviewActions disabled={false} onEdit={onEdit} onDeleteRequest={onDeleteRequest} />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-black/70">
                      {hasRating && <RatingStars rating={resolvedRating} />}
                      {hasRating && <ReviewMetaSeparator />}
                      <span className="inline-flex items-center gap-1.5">
                        {hasLikedSubject && <Icon icon="solar:heart-bold" size={16} className="text-error" />}
                        {hasWatchedSubject && isRewatch && (
                          <Icon icon="solar:refresh-bold" size={16} className="text-success" />
                        )}
                        <span>{activityLabel}</span>
                      </span>
                      <ReviewMetaSeparator />
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
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-black/70 sm:text-sm">
                      {hasRating && <RatingStars rating={resolvedRating} />}
                      {hasRating && <ReviewMetaSeparator />}
                      <span className="inline-flex items-center gap-1.5">
                        <span>{activityLabel}</span>
                        <Link href={accountHref} className="font-semibold text-black transition-colors">
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

                    {showSubject && subjectHref && review.subjectTitle && (
                      <Link
                        href={subjectHref}
                        className="text-info mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase transition"
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
