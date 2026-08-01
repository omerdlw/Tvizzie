'use client';

/**
 * Media Reviews - Rating Stars View Component
 * Path: features/media-reviews/parts/rating-stars.js
 */

import { cn } from '@/shared/lib';
import Icon from '@/ui/primitives/icon';

export default function RatingStars({ rating, className = '' }) {
  if (!Number.isFinite(rating)) return null;

  const normalized = rating > 5 ? rating / 2 : Math.max(0, Math.min(5, rating));

  return (
    <span
      className={cn('text-success inline-flex items-center gap-0.5 align-middle', className)}
      aria-label={`${normalized}/5`}
    >
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
    </span>
  );
}
