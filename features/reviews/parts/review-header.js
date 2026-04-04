'use client';

import Icon from '@/ui/icon';

export default function ReviewHeader({ ratingStats, totalReviews }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-2">
        <Icon icon="solar:face-scan-circle-bold" size={30} className="text-info" />
        <h2 className="text-base font-semibold tracking-wider uppercase">Community Reviews</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="bg-primary/40 inline-flex items-center gap-2 rounded-[14px] border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase">
          <span className="font-bold">{totalReviews}</span> review
          {totalReviews === 1 ? '' : 's'}
        </div>
        {ratingStats.average && (
          <div className="bg-primary/40 inline-flex items-center gap-1 rounded-[14px] border border-black/10 px-4 py-2 text-[11px] font-semibold tracking-wide text-black/70 uppercase">
            <Icon icon="solar:star-bold" className="text-warning" size={16} />
            <span>
              {ratingStats.average}/5 avg
              {ratingStats.count ? ` • ${ratingStats.count} rated` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
