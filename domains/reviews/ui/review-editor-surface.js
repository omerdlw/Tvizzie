'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useToast } from '@/core/modules/notification';
import {
  getReviewMinLength,
  getReviewValidationError,
  upsertListReview,
  upsertMediaReview,
} from '@/domains/reviews/server';
import RatingSelector from '@/domains/reviews/components/rating-selector';
import { getNavActionClass, NAV_ACTION_STYLES } from '@/ui/components/navigation-action-styles';
import { Textarea } from '@/ui/primitives';
import Icon from '@/ui/primitives/icon';
import { cn } from '@/shared/lib';
import { INFO_ACTION_TONE_CLASS } from '@/shared/constants';

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
  const review = data?.review || null;
  const subjectContext = resolveSubjectContext(data, review);
  const isListSubject = subjectContext?.subjectType === 'list';
  const hasExistingReview = Boolean(review);
  const subjectTitle = subjectContext?.subjectTitle || review?.subjectTitle || 'this title';

  const title = hasExistingReview
    ? isListSubject
      ? 'Edit Comment'
      : 'Edit Review'
    : isListSubject
      ? 'Add Comment'
      : 'Add Review';

  return {
    component: ReviewEditorSurface,
    icon: 'solar:pen-new-square-bold',
    title,
    description: subjectTitle,
    props: { data },
    expandHorizontal: true,
    width: 640,
    ...config,
  };
}

export default function ReviewEditorSurface({ close, data }) {
  const toast = useToast();

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
    <motion.form
      id={FORM_ID}
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.24, 1] }}
      className="flex w-full flex-col gap-2"
    >
      {!isListSubject && (
        <div className="flex w-full items-center justify-center pb-2">
          <RatingSelector value={rating} onChange={setRating} />
        </div>
      )}
      <motion.div whileFocusWithin={{ scale: 1.006 }} className="relative w-full">
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
            wrapper: 'flex rounded-xl border border-black/5 transition-all duration-300 ease-out focus-within:border-black/20 focus-within:ring-2 focus-within:ring-black/5',
            textarea:
              'min-h-[130px] w-full resize-none bg-transparent p-4 text-sm leading-normal outline-none placeholder:text-black/50',
          }}
        />
        <div className="pointer-events-none absolute right-3.5 bottom-2.5 flex items-center gap-2 text-[11px] font-medium text-black/50 select-none">
          {validationError ? (
            <span className="text-error/80 font-semibold">{validationError}</span>
          ) : hasText ? (
            <span>{trimmedTextLength} chars</span>
          ) : null}
        </div>
      </motion.div>

      <div className={NAV_ACTION_STYLES.row}>
        {!isListSubject && (
          <motion.button
            type="button"
            role="switch"
            aria-checked={isSpoiler}
            disabled={!hasText}
            onClick={handleSpoilerToggle}
            whileHover={!hasText ? undefined : { scale: 1.012 }}
            whileTap={!hasText ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 450, damping: 26 }}
            className={getNavActionClass({
              isActive: false,
              className: cn(
                'disabled:cursor-not-allowed disabled:opacity-50 flex-1',
                isSpoiler && hasText && 'border-error/30 bg-error/10 text-error hover:bg-error/20',
              ),
            })}
          >
            <Icon
              icon={isSpoiler && hasText ? 'solar:danger-triangle-bold' : 'solar:eye-closed-bold'}
              size={NAV_ACTION_STYLES.icon}
            />
            <span>{isSpoiler && hasText ? 'Contains Spoilers' : 'Mark as Spoiler'}</span>
          </motion.button>
        )}
        <motion.button
          type="submit"
          form={FORM_ID}
          disabled={isSaving || Boolean(validationError)}
          whileHover={isSaving || Boolean(validationError) ? undefined : { scale: 1.012 }}
          whileTap={isSaving || Boolean(validationError) ? undefined : { scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 450, damping: 26 }}
          className={getNavActionClass({
            isActive: true,
            className: cn(
              'disabled:cursor-not-allowed disabled:opacity-50 flex-1',
              INFO_ACTION_TONE_CLASS,
            ),
          })}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={isSaving ? 'saving' : 'normal'}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.24, 1] }}
              className="flex items-center gap-2"
            >
              <Icon
                icon={isSaving ? 'solar:spinner-bold-duotone' : 'solar:pen-new-square-bold'}
                size={NAV_ACTION_STYLES.icon}
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
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.form>
  );
}
