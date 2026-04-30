'use client';

import Link from 'next/link';
import { Button } from '@/ui/elements';
import Icon from '@/ui/icon';

const REVIEW_HEADER_BADGE_CLASS =
  'bg-primary/30 hover:bg-primary/60 inline-flex min-h-10 items-center justify-center gap-1.5  border  border-black/10 px-4 py-2 text-xs font-semibold text-black/70 uppercase transition-colors tabular-nums';

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
    showRatingSummary && Number.isFinite(Number(ratingStats?.average)) && Number(ratingStats.average) > 0;

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-6">
      <div className="flex min-w-0 items-center gap-3">
        <Icon icon="solar:face-scan-circle-bold" size={30} className="text-info" />
        <h2 className="min-w-0 text-base font-semibold tracking-wider uppercase [text-wrap:balance]">{title}</h2>
      </div>
      <div className="movie-detail-meta-cluster flex flex-wrap items-center gap-2 lg:justify-end lg:justify-self-end">
        <div className={REVIEW_HEADER_BADGE_CLASS}>
          <span className="font-bold">{totalReviews}</span> {itemLabel}
          {totalReviews === 1 ? '' : 's'}
        </div>
        {hasRatingSummary && (
          <div className={REVIEW_HEADER_BADGE_CLASS}>
            <Icon icon="solar:star-bold" className="text-warning" size={16} />
            <span>
              {ratingStats?.average}/5 avg
              {ratingStats?.count ? ` • ${ratingStats.count} rated` : ''}
            </span>
          </div>
        )}
        {hasAllReviewsLink ? (
          <Link
            href={allReviewsHref}
            className={REVIEW_HEADER_BADGE_CLASS}
          >
            All reviews
          </Link>
        ) : null}
        {hasEditOwnReview ? (
          <button
            type="button"
            onClick={onEditOwnReview}
            className="bg-primary/40 hover:bg-primary/70 flex size-9 items-center justify-center  border border-black/10 text-black/70 transition-colors hover:border-black/15 hover:text-black"
            aria-label="Edit your review"
            title="Edit your review"
          >
            <Icon icon="solar:pen-bold" size={16} />
          </button>
        ) : null}
        {hasDeleteOwnReview ? (
          <Button
            variant="destructive-icon"
            className=""
            onClick={onDeleteOwnReview}
            aria-label="Delete your review"
            title="Delete your review"
            type="button"
          >
            <Icon icon="solar:trash-bin-trash-bold" size={16} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
