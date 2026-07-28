'use client';

import Link from 'next/link';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';
export default function ReviewHeader({
  allReviewsHref = null,
  itemLabel = 'review',
  onDeleteOwnReview = null,
  ratingStats = null,
  showRatingSummary = true,
  title = 'Community Reviews',
  totalReviews,
  onEditOwnReview = null,
}) {
  const hasDeleteOwnReview = typeof onDeleteOwnReview === 'function';
  const hasEditOwnReview = typeof onEditOwnReview === 'function';
  const hasAllReviewsLink = Boolean(allReviewsHref) && Number(totalReviews) > 0;
  const hasRatingSummary =
    showRatingSummary &&
    Number.isFinite(Number(ratingStats?.average)) &&
    Number(ratingStats.average) > 0;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3 sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <Icon icon="solar:chat-round-line-bold" size={20} className="text-black/70 shrink-0 sm:size-6" />
          <h2 className="text-sm font-bold tracking-wider text-black uppercase sm:text-base truncate">
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

      <div className="flex items-center gap-2 shrink-0">
        {hasEditOwnReview ? (
          <button
            type="button"
            onClick={onEditOwnReview}
            className="bg-primary/30 hover:bg-primary/60 flex size-8 items-center justify-center rounded-xl border border-black/10 text-black/70 hover:text-black sm:size-9"
            aria-label="Edit your review"
            title="Edit your review"
          >
            <Icon icon="solar:pen-bold" size={16} />
          </button>
        ) : null}
        {hasDeleteOwnReview ? (
          <Button
            variant="destructive-icon"
            className="size-8 rounded-xl sm:size-9"
            onClick={onDeleteOwnReview}
            aria-label="Delete your review"
            title="Delete your review"
            type="button"
          >
            <Icon icon="solar:trash-bin-trash-bold" size={16} />
          </Button>
        ) : null}
        {hasAllReviewsLink ? (
          <Link
            href={allReviewsHref}
            className="bg-primary/30 hover:bg-primary/60 inline-flex items-center gap-1 rounded-xl border border-black/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-black/80 uppercase transition-colors"
          >
            <span>All reviews</span>
            <Icon icon="solar:alt-arrow-right-linear" size={14} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
