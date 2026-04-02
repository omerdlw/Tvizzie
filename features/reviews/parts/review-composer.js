'use client'

import { getReviewMinLength } from '@/services/media/reviews.service'
import { Textarea } from '@/ui/elements'
import Icon from '@/ui/icon'

import RatingSelector from './rating-selector'

const REVIEW_MIN_LENGTH = getReviewMinLength()

export default function ReviewComposer({
  normalizedReviewLength,
  setReviewText,
  setIsEditing,
  setIsSpoiler,
  reviewText,
  isEditing,
  isSpoiler,
  ownReview,
  setRating,
  onSubmit,
  rating,
  title,
}) {
  const hasText = reviewText.trim().length > 0
  const isSpoilerDisabled = !hasText
  const heading = ownReview
    ? hasText
      ? 'Update Your Review'
      : 'Update Your Rating'
    : 'Rate or Review'

  return (
    <form id="review-form" onSubmit={onSubmit}>
      <div className="grid items-stretch gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex h-full flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold tracking-wide text-white/70 uppercase">
                {heading}
              </h3>
              {ownReview && isEditing && (
                <button
                  type="button"
                  className="text-error hover:text-error/70 cursor-pointer text-[11px] font-semibold tracking-widest uppercase transition"
                  onClick={() => {
                    setIsEditing(false)
                    setReviewText(ownReview.content || '')
                    setRating(ownReview.rating ?? null)
                    setIsSpoiler(Boolean(ownReview.isSpoiler))
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="text-[11px] font-semibold tracking-widest text-white/70 uppercase">
              {hasText && `${normalizedReviewLength}/${REVIEW_MIN_LENGTH}+ chars`}
            </div>
          </div>

          <Textarea
            maxLength={800}
            value={reviewText}
            className="surface-muted! min-h-[190px] w-full resize-none p-4 leading-normal transition outline-none placeholder:text-white/50 focus:border-white/10 focus:/70 focus:text-white"
            placeholder={`Add your thoughts about ${title} (optional)`}
            onChange={(event) => {
              const nextValue = event.target.value

              setReviewText(nextValue)

              if (nextValue.trim().length === 0) {
                setIsSpoiler(false)
              }
            }}
          />
        </div>

        <aside className="flex flex-col justify-between space-y-6">
          <RatingSelector value={rating} onChange={setRating} />

          <label
            className={`flex items-center gap-3 surface-muted p-4 transition ${
              isSpoilerDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div className="relative flex items-center">
              <input
                type="checkbox"
                disabled={isSpoilerDisabled}
                checked={isSpoiler}
                className="peer size-5 cursor-pointer appearance-none border border-white/5 bg-white/5 transition-all checked:border-white/5 checked: hover:border-white/10 disabled:cursor-not-allowed"
                onChange={(event) => setIsSpoiler(event.target.checked)}
              />
              <Icon
                icon="material-symbols:check-rounded"
                size={15}
                className="pointer-events-none invisible absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white transition peer-checked:visible"
              />
            </div>
            <div className="flex flex-col -space-y-0.5">
              <span className="text-sm font-semibold text-white/70">
                Contains Spoilers
              </span>
              <span className="text-[11px] text-white/50">
                {hasText
                  ? 'Hide parts of your review'
                  : 'Available after you add review text'}
              </span>
            </div>
          </label>
        </aside>
      </div>
    </form>
  )
}
