'use client';

import Icon from '@/ui/icon';

export default function RatingStars({ rating }) {
  if (!Number.isFinite(rating)) return null;

  const normalized = rating > 5 ? rating / 2 : Math.max(0, Math.min(5, rating));

  return (
    <div className="text-success flex items-center gap-0.5" aria-label={`${normalized}/5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, normalized - index));

        return (
          <span key={index} className="relative size-4">
            <span className="absolute inset-0 text-black/10">
              <Icon icon="solar:star-bold" size={16} />
            </span>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <span className="block h-4 w-4">
                <Icon icon="solar:star-bold" size={16} />
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}
