'use client';

import { useMemo, useState } from 'react';

import Container from '@/core/modules/modal/container';
import { useToast } from '@/core/modules/notification/hooks';
import {
  getReviewMinLength,
  getReviewValidationError,
  upsertListReview,
  upsertMediaReview,
} from '@/core/services/media/reviews.service';
import RatingSelector from '@/features/reviews/parts/rating-selector';
import { Button, Textarea } from '@/ui/elements';
import { cn } from '@/core/utils';

const REVIEW_MIN_LENGTH = getReviewMinLength();

const SECONDARY_BUTTON_CLASS =
  'h-8 shrink-0  border border-black/10 px-4 text-xs font-semibold tracking-wide uppercase text-black/70 transition hover:bg-black/5 hover:text-black';

const PRIMARY_BUTTON_CLASS =
  'h-8  border border-black bg-black px-4 text-xs font-semibold tracking-wide uppercase text-white transition hover:border-info hover:bg-info hover:text-primary disabled:cursor-not-allowed disabled:border-black/5 disabled:bg-black/10 disabled:text-black/50';

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

  const isRatingOnly = isRatingOnlyReview({ rating, reviewText });

  if (hasExistingReview) return isRatingOnly ? 'Update Rating' : 'Update Review';
  return isRatingOnly ? 'Save Rating' : 'Publish Review';
}

function resolveListContext(data = {}, review = null) {
  const listId = data?.listId || data?.list?.id || review?.subjectId || null;
  const ownerId =
    data?.ownerId || data?.list?.ownerId || data?.list?.ownerSnapshot?.id || review?.subjectOwnerId || null;

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
  const isList = review?.subjectType === 'list' || Boolean(data?.listId || data?.ownerId || data?.list);
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

  const docPath = review?.docPath || (reviewUserId ? buildReviewDocPath(nextSubject, reviewUserId) : null);
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
      name: user?.displayName || user?.name || review?.user?.name || user?.email || 'Anonymous User',
      username: user?.username || review?.user?.username || null,
    },
  };
}

function FooterMeta({ hasText, isList = false, trimmedTextLength, validationError }) {
  return (
    <div>
      <div className="text-xs text-black/70">
        {hasText
          ? `${trimmedTextLength} characters`
          : isList
            ? `Comment required (${REVIEW_MIN_LENGTH}+ characters)`
            : `Optional text (${REVIEW_MIN_LENGTH}+ if added)`}
      </div>
      {validationError && <div className="text-error text-xs">Please resolve validation before saving</div>}
    </div>
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
        'flex w-full items-center justify-between border-t p-4 text-left transition',
        disabled && 'cursor-not-allowed border-black/10 text-black/50',
        !disabled && checked && 'bg-error/10 text-error hover:bg-error/20 border-black/10',
        !disabled && !checked && 'bg-primary border-black/10 hover:bg-black/5',
        invalid && 'border-t'
      )}
    >
      <div>
        <div className="text-sm font-semibold">Contains spoilers</div>
        <div className="text-xs text-black/70">
          {disabled ? 'Spoiler option unlocks after writing review text' : 'Hide this review behind a spoiler warning'}
        </div>
      </div>

      <span
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center border p-px transition-all',
          checked && !disabled ? 'border-error bg-error' : 'border-black/5 bg-black/5'
        )}
      >
        <span
          className={cn(
            'bg-primary size-5 transition-all',
            checked && !disabled ? 'bg-primary translate-x-5' : 'translate-x-0'
          )}
        />
      </span>
    </button>
  );
}

export default function ReviewEditorModal({ close, data }) {
  const toast = useToast();
  const { onSuccess, review = null, user = null } = data || {};

  const hasExistingReview = Boolean(review);
  const subjectContext = useMemo(() => resolveSubjectContext(data, review), [data, review]);
  const isListSubject = subjectContext?.subjectType === 'list';
  const initialRating = isListSubject ? null : (review?.rating ?? null);

  const [reviewText, setReviewText] = useState(review?.content || '');
  const [rating, setRating] = useState(initialRating);
  const [isSpoiler, setIsSpoiler] = useState(Boolean(review?.isSpoiler));
  const [isSaving, setIsSaving] = useState(false);

  const trimmedText = reviewText.trim();
  const hasText = Boolean(trimmedText);
  const trimmedTextLength = trimmedText.length;
  const formId = 'review-editor-form';
  const modalSubjectTitle = subjectContext?.subjectTitle || review?.subjectTitle || 'this title';

  const validationError = useMemo(
    () =>
      getReviewValidationError({
        content: reviewText,
        rating,
        allowRating: !isListSubject,
        requireText: isListSubject,
        textLabel: isListSubject ? 'comment' : 'review',
      }),
    [isListSubject, reviewText, rating]
  );

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
      close(nextReview);
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
    <Container
      className="w-full sm:w-[640px]"
      header={isListSubject ? null : <RatingSelector value={rating} onChange={setRating} />}
      close={close}
      footer={{
        left: (
          <FooterMeta
            hasText={hasText}
            isList={isListSubject}
            trimmedTextLength={trimmedTextLength}
            validationError={validationError}
          />
        ),
        right: (
          <>
            <Button type="button" onClick={close} className={SECONDARY_BUTTON_CLASS}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isSaving || Boolean(validationError)}
              className={PRIMARY_BUTTON_CLASS}
            >
              {isSaving
                ? 'Saving'
                : getPrimaryActionLabel({ hasExistingReview, isList: isListSubject, rating, reviewText })}
            </Button>
          </>
        ),
      }}
    >
      <form id={formId} onSubmit={handleSubmit}>
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
            wrapper: 'flex',
            textarea:
              'min-h-[180px] w-full resize-none p-3 text-sm leading-normal outline-none placeholder:text-black/50',
          }}
        />
        <SpoilerToggle
          disabled={!hasText}
          checked={isSpoiler}
          invalid={Boolean(validationError)}
          onClick={handleSpoilerToggle}
        />
      </form>
    </Container>
  );
}
