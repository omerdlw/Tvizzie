'use client';

import { useEffect, useState } from 'react';
import { useSurfaceHeader } from '@/core/modules/nav';
import { useToast } from '@/core/modules/notification';
import {
  getReviewMinLength,
  getReviewValidationError,
  upsertListReview,
  upsertMediaReview,
} from '@/core/services/media/reviews';
import RatingSelector from '@/features/reviews/parts/rating-selector';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/features/navigation/actions/model';
import { Textarea } from '@/ui/elements';
import Icon from '@/ui/icon';
import { cn } from '@/core/utils';

const REVIEW_MIN_LENGTH = getReviewMinLength();
const FORM_ID = 'review-editor-surface-form';

function buildReviewDocPath(subject = {}, userId) {
  if (subject?.subjectType === 'list') {
    return `users/${subject.subjectOwnerId}/lists/${subject.subjectId}/reviews/${userId}`;
  }
  return `media_items/${subject.subjectKey}/reviews/${userId}`;
}

function isRatingOnlyReview({ rating, reviewText }) {
  return rating !== null && !reviewText.trim();
}

function getPrimaryActionLabel({ hasExistingReview, isList = false, rating, reviewText }) {
  if (isList) {
    return hasExistingReview ? 'Update Comment' : 'Publish Comment';
  }
  const isRatingOnly = isRatingOnlyReview({
    rating,
    reviewText,
  });
  if (hasExistingReview) return isRatingOnly ? 'Update Rating' : 'Update Review';
  return isRatingOnly ? 'Save Rating' : 'Publish Review';
}

function resolveListContext(data = {}, review = null) {
  const listId = data?.listId || data?.list?.id || review?.subjectId || null;
  const ownerId =
    data?.ownerId ||
    data?.list?.ownerId ||
    data?.list?.ownerSnapshot?.id ||
    review?.subjectOwnerId ||
    null;
  if (!listId || !ownerId) return null;
  const title = data?.list?.title || review?.subjectTitle || 'Untitled List';
  const slug = data?.list?.slug || review?.subjectSlug || listId;
  const ownerUsername = data?.list?.ownerSnapshot?.username || review?.subjectOwnerUsername || null;
  return {
    listId,
    ownerId,
    subjectTitle: title,
    subjectType: 'list',
    list: {
      id: listId,
      title,
      slug,
      coverUrl: data?.list?.coverUrl || data?.list?.posterPath || review?.subjectPoster || null,
      previewItems: Array.isArray(data?.list?.previewItems)
        ? data.list.previewItems
        : Array.isArray(review?.subjectPreviewItems)
          ? review.subjectPreviewItems
          : [],
      ownerSnapshot: {
        id: ownerId,
        username: ownerUsername,
      },
    },
  };
}

function resolveMediaContext(data = {}, review = null) {
  const media = data?.media
    ? {
        entityId: data.media.entityId || data.media.id,
        entityType: data.media.entityType || data.media.type,
        posterPath: data.media.posterPath || data.media.poster_path || null,
        title: data.media.title || data.media.name || review?.subjectTitle || 'Untitled',
      }
    : review
      ? {
          entityId: review.subjectId,
          entityType: review.subjectType,
          posterPath: review.subjectPoster || null,
          title: review.subjectTitle || 'Untitled',
        }
      : null;
  if (!media?.entityId || !media?.entityType) return null;
  return {
    media,
    subjectTitle: media.title || review?.subjectTitle || 'this title',
    subjectType: 'media',
  };
}

function resolveSubjectContext(data = {}, review = null) {
  const isList =
    review?.subjectType === 'list' || Boolean(data?.listId || data?.ownerId || data?.list);
  return isList ? resolveListContext(data, review) : resolveMediaContext(data, review);
}

function buildUpdatedReview({
  review = null,
  savedSubject = {},
  user = null,
  content = '',
  isSpoiler = false,
  rating = null,
}) {
  const nowIso = new Date().toISOString();
  const reviewUserId = user?.id || review?.reviewUserId || review?.user?.id || null;
  const nextSubject = {
    subjectHref: savedSubject.subjectHref || review?.subjectHref || null,
    subjectId: savedSubject.subjectId || review?.subjectId || null,
    subjectKey: savedSubject.subjectKey || review?.subjectKey || null,
    subjectOwnerId: savedSubject.subjectOwnerId || review?.subjectOwnerId || null,
    subjectOwnerUsername: savedSubject.subjectOwnerUsername || review?.subjectOwnerUsername || null,
    subjectPreviewItems: Array.isArray(savedSubject.subjectPreviewItems)
      ? savedSubject.subjectPreviewItems
      : Array.isArray(review?.subjectPreviewItems)
        ? review.subjectPreviewItems
        : [],
    subjectPoster: savedSubject.subjectPoster || review?.subjectPoster || null,
    subjectSlug: savedSubject.subjectSlug || review?.subjectSlug || null,
    subjectTitle: savedSubject.subjectTitle || review?.subjectTitle || 'Untitled',
    subjectType: savedSubject.subjectType || review?.subjectType || null,
  };
  const docPath =
    review?.docPath || (reviewUserId ? buildReviewDocPath(nextSubject, reviewUserId) : null);
  const resolvedRating = nextSubject.subjectType === 'list' ? null : rating;
  return {
    ...review,
    ...nextSubject,
    content,
    isSpoiler,
    rating: resolvedRating,
    createdAt: review?.createdAt || nowIso,
    updatedAt: nowIso,
    docPath,
    id: review?.id || (docPath && reviewUserId ? `${docPath}:${reviewUserId}` : null),
    likes: Array.isArray(review?.likes) ? review.likes : [],
    mediaKey: nextSubject.subjectKey || review?.mediaKey || null,
    reviewUserId,
    user: {
      ...(review?.user || {}),
      id: reviewUserId,
      avatarUrl: user?.avatarUrl || user?.photoURL || review?.user?.avatarUrl || null,
      email: user?.email || review?.user?.email || null,
      name:
        user?.displayName || user?.name || review?.user?.name || user?.email || 'Anonymous User',
      username: user?.username || review?.user?.username || null,
    },
  };
}

export function createReviewEditorSurfaceEntry(data = {}, config = {}) {
  return {
    component: ReviewEditorSurface,
    props: { data },
    expandHorizontal: true,
    width: 640,
    ...config,
  };
}

export default function ReviewEditorSurface({ close, data }) {
  const toast = useToast();
  const setHeader = useSurfaceHeader();

  const { onSuccess, review = null, user = null } = data || {};
  const hasExistingReview = Boolean(review);
  const subjectContext = resolveSubjectContext(data, review);
  const isListSubject = subjectContext?.subjectType === 'list';
  const initialRating = isListSubject ? null : (review?.rating ?? null);

  const [reviewText, setReviewText] = useState(review?.content || '');
  const [rating, setRating] = useState(initialRating);
  const [isSpoiler, setIsSpoiler] = useState(Boolean(review?.isSpoiler));
  const [isSaving, setIsSaving] = useState(false);

  const trimmedText = reviewText.trim();
  const hasText = Boolean(trimmedText);
  const trimmedTextLength = trimmedText.length;
  const modalSubjectTitle = subjectContext?.subjectTitle || review?.subjectTitle || 'this title';

  const validationError = getReviewValidationError({
    content: reviewText,
    rating,
    allowRating: !isListSubject,
    requireText: isListSubject,
    textLabel: isListSubject ? 'comment' : 'review',
  });

  useEffect(() => {
    if (setHeader) {
      setHeader({
        icon: 'solar:pen-new-square-bold',
        title: hasExistingReview
          ? isListSubject
            ? 'Edit Comment'
            : 'Edit Review'
          : isListSubject
            ? 'Add Comment'
            : 'Add Review',
        description: modalSubjectTitle,
      });
    }
  }, [setHeader, hasExistingReview, isListSubject, modalSubjectTitle]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!user?.id) {
      toast.error('You need to sign in before posting a review');
      return;
    }
    if (!subjectContext) {
      toast.error('Review subject could not be resolved');
      return;
    }
    const content = trimmedText;
    const spoiler = content ? isSpoiler : false;
    const savedRating = isListSubject ? null : rating;
    setIsSaving(true);
    try {
      const savedSubject =
        subjectContext.subjectType === 'list'
          ? await upsertListReview({
              content,
              isSpoiler: spoiler,
              list: subjectContext.list,
              listId: subjectContext.listId,
              ownerId: subjectContext.ownerId,
              rating: null,
              user,
            })
          : await upsertMediaReview({
              content,
              isSpoiler: spoiler,
              media: subjectContext.media,
              rating: savedRating,
              user,
            });
      const nextReview = buildUpdatedReview({
        review,
        savedSubject,
        user,
        content,
        isSpoiler: spoiler,
        rating: savedRating,
      });
      onSuccess?.(nextReview);
      close?.(nextReview);
    } catch (error) {
      toast.error(error?.message || 'Review could not be saved');
    } finally {
      setIsSaving(false);
    }
  }

  function handleTextChange(event) {
    const value = event.target.value;
    setReviewText(value);
    if (!value.trim()) setIsSpoiler(false);
  }

  function handleSpoilerToggle() {
    if (!hasText) return;
    setIsSpoiler((current) => !current);
  }

  return (
    <form id={FORM_ID} onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      {!isListSubject && (
        <div className="flex w-full items-center justify-center border-b border-black/5 pb-3">
          <RatingSelector value={rating} onChange={setRating} />
        </div>
      )}

      <div className="relative w-full">
        <Textarea
          maxLength={800}
          value={reviewText}
          placeholder={
            isListSubject
              ? `Share your thoughts on ${modalSubjectTitle}`
              : `Add your thoughts about ${modalSubjectTitle} (optional)`
          }
          onChange={handleTextChange}
          className={{
            wrapper:
              'flex border border-black/10 rounded-2xl bg-black/5 pb-7',
            textarea:
              'min-h-[130px] w-full resize-none p-3.5 text-sm leading-normal outline-none placeholder:text-black/40 bg-transparent',
          }}
        />
        <div className="pointer-events-none absolute bottom-2.5 right-3.5 flex items-center gap-2 text-[11px] font-medium text-black/40 select-none">
          {validationError ? (
            <span className="text-error/80 font-normal">{validationError}</span>
          ) : hasText ? (
            <span>{trimmedTextLength} chars</span>
          ) : null}
        </div>
      </div>

      <SpoilerToggle
        disabled={!hasText}
        checked={isSpoiler}
        invalid={Boolean(validationError)}
        onClick={handleSpoilerToggle}
      />

      <div className={NAV_ACTION_STYLES.row}>
          <button
            type="button"
            onClick={() => close?.(null)}
            className={getNavActionClass({
              isActive: false,
              className: 'flex-1',
            })}
          >
            <Icon icon="solar:close-circle-bold" size={NAV_ACTION_STYLES.icon} />
            <span>Cancel</span>
          </button>

          <button
            type="submit"
            form={FORM_ID}
            disabled={isSaving || Boolean(validationError)}
            className={getNavActionClass({
              isActive: true,
              className: 'flex-1 disabled:opacity-40 disabled:cursor-not-allowed',
            })}
          >
            <Icon
              icon={isSaving ? 'solar:spinner-bold-duotone' : 'solar:pen-new-square-bold'}
              size={NAV_ACTION_STYLES.icon}
              className={isSaving ? 'animate-spin' : ''}
            />
            <span>
              {isSaving
                ? 'Saving...'
                : getPrimaryActionLabel({
                    hasExistingReview,
                    isList: isListSubject,
                    rating,
                    reviewText,
                  })}
            </span>
          </button>
        </div>
    </form>
  );
}

function SpoilerToggle({ disabled, checked, invalid, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!disabled && checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border p-3 text-left',
        disabled && 'cursor-not-allowed border-black/10 text-black/40 bg-black/5',
        !disabled && checked && 'bg-error/10 text-error hover:bg-error/20 border-error/30',
        !disabled && !checked && 'bg-black/5 border-black/10 hover:bg-black/10',
        invalid && 'border-t',
      )}
    >
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider">Contains spoilers</div>
        <div className="text-[11px] text-black/60">
          {disabled
            ? 'Spoiler option unlocks after writing review text'
            : 'Hide this review behind a spoiler warning'}
        </div>
      </div>

      <span
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-px',
          checked && !disabled ? 'border-error bg-error' : 'border-black/10 bg-black/10',
        )}
      >
        <span
          className={cn(
            'size-4 rounded-full bg-white shadow-xs',
            checked && !disabled ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}
