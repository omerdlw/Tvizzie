'use client';

import Link from 'next/link';
import { Button } from '@/ui/primitives';
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
    <div className="flex w-full flex-col gap-3 border-b border-white/10 pb-3 sm:min-h-10 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon icon="solar:chat-round-line-bold" size={20} className="shrink-0 text-white/70" />
          <h2 className="min-w-0 text-xs font-semibold text-white/70 uppercase">
            {title}
          </h2>
        </div>

        <span aria-hidden="true" className="hidden h-3.5 w-px bg-white/10 sm:block" />

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs leading-4 font-medium text-white/50">
          {Number.isFinite(Number(totalReviews)) && (
            <span>
              <strong className="font-semibold text-white/70">{totalReviews}</strong> {itemLabel}
              {totalReviews === 1 ? '' : 's'}
            </span>
          )}

          {hasRatingSummary && (
            <>
              <span className="text-white/50">•</span>
              <span className="inline-flex items-center gap-1">
                <Icon icon="solar:star-bold" className="text-warning" size={13} />
                <strong className="font-semibold text-white/70">{ratingStats?.average}/5</strong>
                <span className="text-white/50">avg</span>
                {ratingStats?.count ? (
                  <span className="text-white/50">({ratingStats.count} rated)</span>
                ) : null}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
        {hasEditOwnReview && (
          <Button
            type="button"
            onClick={onEditOwnReview}
            className="center inline-flex size-8 cursor-pointer items-center gap-1 rounded-[10px] ring-1 ring-inset ring-white/5 bg-white/5 px-3 text-xs font-semibold text-white/70 uppercase transition-colors duration-300 ease-out hover:bg-white/10 hover:text-white"
            aria-label="Edit your review"
            title="Edit your review"
          >
            <Icon icon="solar:pen-bold" size={14} />
          </Button>
        )}

        {hasDeleteOwnReview && (
          <Button
            type="button"
            onClick={onDeleteOwnReview}
            className="hover:text-error center inline-flex size-8 cursor-pointer items-center gap-1 rounded-[10px] ring-1 ring-inset ring-white/5 bg-white/5 px-3 text-xs font-semibold text-white/70 uppercase transition-colors duration-300 ease-out hover:bg-white/10"
            aria-label="Delete your review"
            title="Delete your review"
          >
            <Icon icon="solar:trash-bin-trash-bold" size={14} />
          </Button>
        )}

        {hasAllReviewsLink && (
          <Link
            href={allReviewsHref}
            className="inline-flex h-8 items-center gap-1 rounded-[10px] ring-1 ring-inset ring-white/5 bg-white/5 px-3 text-xs font-semibold text-white/70 uppercase transition-colors duration-300 ease-out hover:bg-white/10 hover:text-white"
          >
            <span>All reviews</span>
            <Icon icon="solar:alt-arrow-right-linear" size={14} />
          </Link>
        )}

        {hasAddReview && (
          <Button
            type="button"
            onClick={onAddReview}
            className="inline-flex h-8 items-center gap-1 rounded-[10px] ring-1 ring-inset ring-white/5 bg-white/5 px-3 text-xs font-semibold text-white/70 uppercase transition-colors duration-300 ease-out hover:bg-white/10 hover:text-white"
          >
            <Icon icon="solar:pen-bold" size={13} />
            <span>Add {itemLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
