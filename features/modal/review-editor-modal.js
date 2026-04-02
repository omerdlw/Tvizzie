'use client'

import { useMemo, useState } from 'react'

import RatingSelector from '@/features/reviews/parts/rating-selector'
import Container from '@/modules/modal/container'
import { useToast } from '@/modules/notification/hooks'
import {
  getReviewMinLength,
  getReviewValidationError,
  upsertListReview,
  upsertMediaReview,
} from '@/services/media/reviews.service'
import { Button, Textarea } from '@/ui/elements'

const REVIEW_MIN_LENGTH = getReviewMinLength()

function buildUpdatedReview(review, nextValues = {}) {
  return {
    ...review,
    ...nextValues,
    updatedAt: new Date().toISOString(),
  }
}

function getPrimaryActionLabel({ rating, reviewText }) {
  const hasText = reviewText.trim().length > 0

  if (!hasText && rating !== null) {
    return 'Update Rating'
  }

  return 'Update Review'
}

export default function ReviewEditorModal({ close, data, header }) {
  const toast = useToast()
  const { onSuccess, review = null, user = null } = data || {}

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

    if (!review || !user?.id || validationError || isSaving) {
      if (validationError) {
        toast.error(validationError)
      }
      return
    }

    const normalizedContent = reviewText.trim()
    const normalizedSpoiler = normalizedContent ? isSpoiler : false

    setIsSaving(true)

    try {
      if (review.subjectType === 'list') {
        await upsertListReview({
          content: normalizedContent,
          isSpoiler: normalizedSpoiler,
          list: {
            coverUrl: review.subjectPoster || null,
            id: review.subjectId,
            ownerId: review.subjectOwnerId,
            ownerSnapshot: {
              username: review.subjectOwnerUsername || null,
            },
            slug: review.subjectSlug || review.subjectId,
            title: review.subjectTitle || 'Untitled List',
          },
          listId: review.subjectId,
          ownerId: review.subjectOwnerId,
          rating,
          user,
        })
      } else {
        await upsertMediaReview({
          content: normalizedContent,
          isSpoiler: normalizedSpoiler,
          media: {
            entityId: review.subjectId,
            entityType: review.subjectType,
            posterPath: review.subjectPoster || null,
            title: review.subjectTitle || 'Untitled',
          },
          rating,
          user,
        })
      }

      const nextReview = buildUpdatedReview(review, {
        content: normalizedContent,
        isSpoiler: normalizedSpoiler,
        rating,
      })

      if (typeof onSuccess === 'function') {
        onSuccess(nextReview)
      }

      toast.success(
        normalizedContent ? 'Your review was updated' : 'Your rating was updated'
      )
      close(nextReview)
    } catch (error) {
      toast.error(error?.message || 'Review could not be updated')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="w-full sm:w-[560px]" header={header} close={close}>
      <form onSubmit={handleSubmit} className="flex w-full flex-col p-2">
            <RatingSelector value={rating} onChange={setRating} />
            <div className="flex items-center justify-between gap-3 mt-2">
              <span className="text-[10px] font-bold tracking-widest text-white uppercase">
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
                  'min-h-[200px] w-full resize-none border border-white/5 p-4 leading-normal text-white transition outline-none placeholder:text-white/50 hover:border-white/10 focus:border-white/10',
              }}
              placeholder={`Add your thoughts about ${review?.subjectTitle || 'this title'} (optional)`}
              onChange={(event) => {
                const nextValue = event.target.value
                setReviewText(nextValue)

                if (!nextValue.trim()) {
                  setIsSpoiler(false)
                }
              }}
            />
          <label
            className={`flex items-center gap-3 border border-white/5 p-2 transition${
              !hasText ? ' cursor-not-allowed ' : ' hover:'
            }`}
          >
            <input
              type="checkbox"
              checked={isSpoiler}
              disabled={!hasText}
              className="peer size-5 cursor-pointer appearance-none border border-white/5 transition-all checked:border-white/5 checked: checked:text-white hover:border-white/10 disabled:cursor-not-allowed"
              onChange={(event) => setIsSpoiler(event.target.checked)}
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                Contains Spoilers
              </span>
              <span className="text-[11px] text-white">
                {hasText
                  ? 'Hide parts of your review'
                  : 'Available after you add review text'}
              </span>
            </div>
          </label>
        <div className="flex w-full flex-col mt-2 gap-2 md:flex-row md:justify-end">
          <Button
            type="button"
            onClick={close}
            className="h-11 w-full flex-auto border border-white/5  px-6 text-[11px] font-bold tracking-widest text-white uppercase transition hover: hover:text-white active:scale-95"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving || Boolean(validationError)}
            className="center h-11 w-full flex-auto gap-2 px-8 text-[11px] font-bold tracking-widest uppercase transition info-classes"
          >
            {isSaving ? 'Saving' : getPrimaryActionLabel({ rating, reviewText })}
          </Button>
        </div>
      </form>
    </Container>
  )
}
