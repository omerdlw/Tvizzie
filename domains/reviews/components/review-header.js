'use client';

/**
 * Media Reviews - Section Header Component
 * Path: features/media-reviews/parts/review-header.js
 */

import Link from 'next/link';
import Icon from '@/ui/primitives/icon';

export default function ReviewHeader({
  allReviewsHref = null,
  itemLabel = 'review',
  onAddReview = null,
  onDeleteOwnReview = null,
  onEditOwnReview = null,
  ratingStats = null,
  showRatingSummary = true,
  title = 'Community Reviews',
  totalReviews = 0,
}) {
  const hasDeleteOwnReview = typeof onDeleteOwnReview === 'function';
  const hasEditOwnReview = typeof onEditOwnReview === 'function';
  const hasAddReview = typeof onAddReview === 'function';
  const hasAllReviewsLink = Boolean(allReviewsHref) && Number(totalReviews) > 0;
  const hasRatingSummary =
    showRatingSummary &&
    Number.isFinite(Number(ratingStats?.average)) &&
    Number(ratingStats.average) > 0;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3 sm:gap-4">
      {/* Title & Metadata */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <Icon
            icon="solar:chat-round-line-bold"
            size={20}
            className="shrink-0 text-black/70 sm:size-6"
          />
          <h2 className="truncate text-sm font-bold tracking-wider text-black uppercase sm:text-base">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-black/60">
          {Number.isFinite(Number(totalReviews)) && (
            <span>
              <strong className="font-semibold text-black/80">{totalReviews}</strong> {itemLabel}
              {totalReviews === 1 ? '' : 's'}
            </span>
          )}

          {hasRatingSummary && (
            <>
              <span className="text-black/30">•</span>
              <span className="inline-flex items-center gap-1">
                <Icon icon="solar:star-bold" className="text-warning" size={13} />
                <strong className="font-semibold text-black/80">{ratingStats?.average}/5</strong>
                <span className="text-black/50">avg</span>
                {ratingStats?.count ? (
                  <span className="text-black/50">({ratingStats.count} rated)</span>
                ) : null}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex shrink-0 items-center gap-2">
        {hasEditOwnReview && (
          <button
            type="button"
            onClick={onEditOwnReview}
            className="bg-primary/30 hover:bg-primary/60 inline-flex size-[30px] shrink-0 items-center justify-center rounded-xl border border-black/10 text-black/70 transition-colors hover:text-black"
            aria-label="Edit your review"
            title="Edit your review"
          >
            <Icon icon="solar:pen-bold" size={14} />
          </button>
        )}

        {hasDeleteOwnReview && (
          <button
            type="button"
            onClick={onDeleteOwnReview}
            className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-xl border border-error/10 bg-error/10 text-error transition-colors hover:border-error hover:bg-error hover:text-white"
            aria-label="Delete your review"
            title="Delete your review"
          >
            <Icon icon="solar:trash-bin-trash-bold" size={14} />
          </button>
        )}

        {hasAllReviewsLink && (
          <Link
            href={allReviewsHref}
            className="bg-primary/30 hover:bg-primary/60 inline-flex h-[30px] items-center gap-1 rounded-xl border border-black/10 px-3 text-xs font-semibold tracking-wide text-black/80 uppercase transition-colors"
          >
            <span>All reviews</span>
            <Icon icon="solar:alt-arrow-right-linear" size={14} />
          </Link>
        )}

        {hasAddReview && (
          <button
            type="button"
            onClick={onAddReview}
            className="bg-primary/30 hover:bg-primary/60 inline-flex h-[30px] items-center gap-1.5 rounded-xl border border-black/10 px-3 text-xs font-semibold tracking-wide text-black/80 uppercase transition-colors"
          >
            <Icon icon="solar:pen-bold" size={13} />
            <span>Add {itemLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
