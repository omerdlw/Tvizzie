'use client';

import Link from '@/node_modules/next/link';
import Icon from '@/ui/icon';

export default function ReviewHeader({
  allReviewsHref = '#',
  itemLabel = 'review',
  ratingStats = null,
  showRatingSummary = true,
  title = 'Community Reviews',
  totalReviews,
  onEditOwnReview = null,
}) {
  const hasEditOwnReview = typeof onEditOwnReview === 'function';
  const hasRatingSummary =
    showRatingSummary && Number.isFinite(Number(ratingStats?.average)) && Number(ratingStats.average) > 0;

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-2">
        <Icon icon="solar:face-scan-circle-bold" size={30} className="text-info" />
        <h2 className="text-base font-semibold tracking-wider uppercase">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-primary/30 hover:bg-primary/60 inline-flex h-9 items-center gap-1 rounded-[12px] border border-black/10 px-4 py-2 text-xs font-semibold tracking-wide text-black/70 uppercase">
          <span className="font-bold">{totalReviews}</span> {itemLabel}
          {totalReviews === 1 ? '' : 's'}
        </div>
        {hasRatingSummary && (
          <div className="bg-primary/30 hover:bg-primary/60 inline-flex h-9 items-center gap-1 rounded-[12px] border border-black/10 px-4 py-2 text-xs font-semibold tracking-wide text-black/70 uppercase">
            <Icon icon="solar:star-bold" className="text-warning" size={16} />
            <span>
              {ratingStats?.average}/5 avg
              {ratingStats?.count ? ` • ${ratingStats.count} rated` : ''}
            </span>
          </div>
        )}
        {hasEditOwnReview ? (
          <button
            type="button"
            onClick={onEditOwnReview}
            className="bg-primary/40 hover:bg-primary/70 flex size-9 items-center justify-center rounded-[12px] border border-black/10 text-black/70 transition-colors hover:border-black/15 hover:text-black"
            aria-label="Edit your review"
            title="Edit your review"
          >
            <Icon icon="solar:pen-bold" size={16} />
          </button>
        ) : null}
        <Link
          href={allReviewsHref}
          className="bg-primary/30 hover:bg-primary/60 inline-flex h-9 items-center gap-1 rounded-[12px] border border-black/10 px-4 py-2 text-xs font-semibold tracking-wide text-black/70 uppercase"
        >
          All reviews
        </Link>
      </div>
    </div>
  );
}
