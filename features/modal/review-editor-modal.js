'use client'

import { useMemo, useState } from 'react'

import RatingSelector from '@/features/reviews/parts/rating-selector'
import Container from '@/core/modules/modal/container'
import { useToast } from '@/core/modules/notification/hooks'
import {
  getReviewMinLength,
  getReviewValidationError,
  upsertListReview,
  upsertMediaReview,
} from '@/core/services/media/reviews.service'
import { Button, Textarea } from '@/ui/elements'

const REVIEW_MIN_LENGTH = getReviewMinLength()

function buildReviewDocPath(subject = {}, userId) {
  if (subject?.subjectType === 'list') {
    return `users/${subject.subjectOwnerId}/lists/${subject.subjectId}/reviews/${userId}`
  }

  return `media_items/${subject.subjectKey}/reviews/${userId}`
}

function getPrimaryActionLabel({ hasExistingReview, rating, reviewText }) {
  const hasText = reviewText.trim().length > 0

  if (hasExistingReview && !hasText && rating !== null) {
    return 'Update Rating'
  }

  if (hasExistingReview) {
    return 'Update Review'
  }

  if (!hasText && rating !== null) {
    return 'Save Rating'
  }

  return 'Publish Review'
}

function getSuccessMessage({ hasExistingReview, rating, reviewText }) {
  const hasText = reviewText.trim().length > 0
  const isRatingOnly = !hasText && rating !== null

  if (hasExistingReview) {
    return isRatingOnly ? 'Your rating was updated' : 'Your review was updated'
  }

  return isRatingOnly ? 'Your rating was saved' : 'Your review was published'
}

function resolveListContext(data = {}, review = null) {
  const listId = data?.listId || data?.list?.id || review?.subjectId || null
  const ownerId =
    data?.ownerId ||
    data?.list?.ownerId ||
    data?.list?.ownerSnapshot?.id ||
    review?.subjectOwnerId ||
    null

  if (!listId || !ownerId) {
    return null
  }

  const listTitle =
    data?.list?.title || review?.subjectTitle || 'Untitled List'
  const listSlug = data?.list?.slug || review?.subjectSlug || listId
  const ownerUsername =
    data?.list?.ownerSnapshot?.username || review?.subjectOwnerUsername || null

  return {
    list: {
      coverUrl:
        data?.list?.coverUrl ||
        data?.list?.posterPath ||
        review?.subjectPoster ||
        null,
      id: listId,
      ownerSnapshot: {
        id: ownerId,
        username: ownerUsername,
      },
      previewItems: Array.isArray(data?.list?.previewItems)
        ? data.list.previewItems
        : Array.isArray(review?.subjectPreviewItems)
          ? review.subjectPreviewItems
          : [],
      slug: listSlug,
      title: listTitle,
    },
    listId,
    ownerId,
    subjectTitle: listTitle,
    subjectType: 'list',
  }
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
      : null

  if (!media?.entityId || !media?.entityType) {
    return null
  }

  return {
    media,
    subjectTitle: media.title || review?.subjectTitle || 'this title',
    subjectType: 'media',
  }
}

function resolveSubjectContext(data = {}, review = null) {
  const shouldUseListContext =
    review?.subjectType === 'list' ||
    Boolean(data?.listId || data?.ownerId || data?.list)

  if (shouldUseListContext) {
    return resolveListContext(data, review)
  }

  return resolveMediaContext(data, review)
}

function buildUpdatedReview({
  review = null,
  savedSubject = {},
  user = null,
  content = '',
  isSpoiler = false,
  rating = null,
}) {
  const nowIso = new Date().toISOString()
  const reviewUserId = user?.id || review?.reviewUserId || review?.user?.id || null
  const nextSubject = {
    subjectHref: savedSubject.subjectHref || review?.subjectHref || null,
    subjectId: savedSubject.subjectId || review?.subjectId || null,
    subjectKey: savedSubject.subjectKey || review?.subjectKey || null,
    subjectOwnerId: savedSubject.subjectOwnerId || review?.subjectOwnerId || null,
    subjectOwnerUsername:
      savedSubject.subjectOwnerUsername || review?.subjectOwnerUsername || null,
    subjectPreviewItems: Array.isArray(savedSubject.subjectPreviewItems)
      ? savedSubject.subjectPreviewItems
      : Array.isArray(review?.subjectPreviewItems)
        ? review.subjectPreviewItems
        : [],
    subjectPoster: savedSubject.subjectPoster || review?.subjectPoster || null,
    subjectSlug: savedSubject.subjectSlug || review?.subjectSlug || null,
    subjectTitle: savedSubject.subjectTitle || review?.subjectTitle || 'Untitled',
    subjectType: savedSubject.subjectType || review?.subjectType || null,
  }
  const nextDocPath =
    review?.docPath ||
    (reviewUserId ? buildReviewDocPath(nextSubject, reviewUserId) : null)

  return {
    ...review,
    ...nextSubject,
    content,
    createdAt: review?.createdAt || nowIso,
    docPath: nextDocPath,
    id: review?.id || (nextDocPath && reviewUserId ? `${nextDocPath}:${reviewUserId}` : null),
    isSpoiler,
    likes: Array.isArray(review?.likes) ? review.likes : [],
    mediaKey: nextSubject.subjectKey || review?.mediaKey || null,
    rating,
    reviewUserId,
    updatedAt: nowIso,
    user: {
      ...(review?.user || {}),
      avatarUrl:
        user?.avatarUrl || user?.photoURL || review?.user?.avatarUrl || null,
      email: user?.email || review?.user?.email || null,
      id: reviewUserId,
      name:
        user?.displayName ||
        user?.name ||
        review?.user?.name ||
        user?.email ||
        'Anonymous User',
      username: user?.username || review?.user?.username || null,
    },
  }
}

export default function ReviewEditorModal({ close, data }) {
  const toast = useToast()
  const { onSuccess, review = null, user = null } = data || {}
  const hasExistingReview = Boolean(review)
  const subjectContext = useMemo(
    () => resolveSubjectContext(data, review),
    [data, review]
  )

  const [reviewText, setReviewText] = useState(review?.content || '')
  const [rating, setRating] = useState(review?.rating ?? null)
  const [isSpoiler, setIsSpoiler] = useState(Boolean(review?.isSpoiler))
  const [isSaving, setIsSaving] = useState(false)

  const hasText = reviewText.trim().length > 0
  const validationError = useMemo(
    () =>
      getReviewValidationError({
        content: reviewText,
        rating,
      }),
    [rating, reviewText]
  )

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!user?.id || validationError || isSaving) {
      if (validationError) {
        toast.error(validationError)
      }

      if (!user?.id) {
        toast.error('You need to sign in before posting a review')
      }

      return
    }

    if (!subjectContext) {
      toast.error('Review subject could not be resolved')
      return
    }

    const normalizedContent = reviewText.trim()
    const normalizedSpoiler = normalizedContent ? isSpoiler : false

    setIsSaving(true)

    try {
      let savedSubject = null

      if (subjectContext.subjectType === 'list') {
        savedSubject = await upsertListReview({
          content: normalizedContent,
          isSpoiler: normalizedSpoiler,
          list: subjectContext.list,
          listId: subjectContext.listId,
          ownerId: subjectContext.ownerId,
          rating,
          user,
        })
      } else {
        savedSubject = await upsertMediaReview({
          content: normalizedContent,
          isSpoiler: normalizedSpoiler,
          media: subjectContext.media,
          rating,
          user,
        })
      }

      const nextReview = buildUpdatedReview({
        review,
        savedSubject,
        user,
        content: normalizedContent,
        isSpoiler: normalizedSpoiler,
        rating,
      })

      if (typeof onSuccess === 'function') {
        onSuccess(nextReview)
      }

      toast.success(
        getSuccessMessage({
          hasExistingReview,
          rating,
          reviewText: normalizedContent,
        })
      )
      close(nextReview)
    } catch (error) {
      toast.error(error?.message || 'Review could not be saved')
    } finally {
      setIsSaving(false)
    }
  }

  const modalSubjectTitle =
    subjectContext?.subjectTitle || review?.subjectTitle || 'this title'

  const handleSpoilerToggle = () => {
    if (!hasText) {
      return
    }

    setIsSpoiler((currentValue) => !currentValue)
  }

  return (
    <Container className="w-full sm:w-[620px]" close={close}>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 p-3 sm:p-4">


        <div className="border border-white/10 bg-white/3 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">
              Your Rating
            </p>
          </div>
          <RatingSelector value={rating} onChange={setRating} />
        </div>

        <div className="border border-white/10 bg-white/3 p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-white/55 uppercase">
              Your Thoughts
            </p>
            <span className="text-[10px] font-bold tracking-widest text-white/65 uppercase">
              {hasText
                ? `${reviewText.trim().length}/${REVIEW_MIN_LENGTH}+ chars`
                : `Optional • ${REVIEW_MIN_LENGTH}+ if added`}
            </span>
          </div>
          <Textarea
            maxLength={800}
            value={reviewText}
            className={{
              textarea:
                'min-h-[180px] w-full resize-none border border-white/10 bg-black/25 p-4 leading-normal text-white transition outline-none placeholder:text-white/45 hover:border-white/20 focus:border-white/25',
            }}
            placeholder={`Add your thoughts about ${modalSubjectTitle} (optional)`}
            onChange={(event) => {
              const nextValue = event.target.value
              setReviewText(nextValue)

              if (!nextValue.trim()) {
                setIsSpoiler(false)
              }
            }}
          />
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={hasText ? isSpoiler : false}
          disabled={!hasText}
          onClick={handleSpoilerToggle}
          className={`flex w-full items-center justify-between gap-3 border p-3.5 text-left transition sm:p-4 ${
            hasText
              ? isSpoiler
                ? 'border-error/50 bg-error/10'
                : 'border-white/10 bg-white/3 hover:border-white/20'
              : 'cursor-not-allowed border-white/10 bg-white/3 opacity-65'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Contains Spoilers</span>
            <span className="text-[11px] text-white/65">
              {hasText
                ? 'Enable to blur this review by default'
                : 'Spoiler option unlocks after writing review text'}
            </span>
          </div>
          <span
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
              hasText && isSpoiler
                ? 'border-error/70 bg-error/30'
                : 'border-white/20 bg-black/40'
            }`}
          >
            <span
              className={`absolute left-0.5 size-5 rounded-full bg-white transition ${
                hasText && isSpoiler ? 'translate-x-5 bg-error' : ''
              }`}
            />
          </span>
        </button>

        {validationError && (
          <p className="border border-error/35 bg-error/10 px-3 py-2 text-xs text-error">
            {validationError}
          </p>
        )}

        <div className="mt-1 flex w-full flex-col gap-2 md:flex-row md:justify-end">
          <Button
            type="button"
            onClick={close}
            className="h-11 w-full flex-auto border border-white/10 bg-white/3 px-6 text-[11px] font-bold tracking-widest text-white uppercase transition hover:border-white/20 hover:bg-white/7 active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving || Boolean(validationError)}
            className="center h-11 w-full flex-auto gap-2 px-8 text-[11px] font-bold tracking-widest uppercase transition info-classes"
          >
            {isSaving
              ? 'Saving'
              : getPrimaryActionLabel({ hasExistingReview, rating, reviewText })}
          </Button>
        </div>
      </form>
    </Container>
  )
}
