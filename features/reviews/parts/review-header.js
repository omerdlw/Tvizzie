'use client';

import Icon from '@/ui/icon';

export default function ReviewHeader({
  ratingStats,
  title = 'Community Reviews',
  totalReviews,
  onEditOwnReview = null,
}) {
  const hasEditOwnReview = typeof onEditOwnReview === 'function';

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-2">
        <Icon icon="solar:face-scan-circle-bold" size={30} className="text-info" />
        <h2 className="text-base font-semibold tracking-wider uppercase">{title}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-primary/40 inline-flex items-center gap-2 border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase">
          <span className="font-bold">{totalReviews}</span> review
          {totalReviews === 1 ? '' : 's'}
        </div>
        {ratingStats.average && (
          <div className="bg-primary/40 inline-flex items-center gap-1 border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase">
            <Icon icon="solar:star-bold" className="text-warning" size={16} />
            <span>
              {ratingStats.average}/5 avg
              {ratingStats.count ? ` • ${ratingStats.count} rated` : ''}
            </span>
          </div>
        )}
        {hasEditOwnReview ? (
          <button
            type="button"
            onClick={onEditOwnReview}
            className="bg-primary/40 hover:bg-primary/70 flex size-8 items-center justify-center border border-black/10 text-black/70 transition-colors hover:border-black/20"
            aria-label="Edit your review"
            title="Edit your review"
          >
            <Icon icon="solar:pen-bold" size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
