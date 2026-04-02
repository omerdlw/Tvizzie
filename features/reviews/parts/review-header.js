'use client'

import Icon from '@/ui/icon'

export default function ReviewHeader({ ratingStats, totalReviews }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-2">
        <Icon icon="solar:face-scan-circle-bold" size={30} />
        <h2 className="text-base font-semibold tracking-wider uppercase">
          Community Reviews
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 border border-white/5 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/70 uppercase">
          <span className="font-bold">{totalReviews}</span> review
          {totalReviews === 1 ? '' : 's'}
        </div>
        {ratingStats.average && (
          <div className="inline-flex items-center gap-2 border border-white/5 bg-white/5 px-4 py-2 text-[11px] font-semibold tracking-wide text-white/70 uppercase">
            <Icon icon="solar:star-bold" className="text-warning" size={14} />
            <span>
              {ratingStats.average}/5 avg
              {ratingStats.count ? ` • ${ratingStats.count} rated` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
