'use client';

import Carousel from '@/domains/shell/shared/components/media-carousel';
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';

export function PosterRail({ fallbackMediaType = 'movie', items = [], showRank = false }) {
  if (!items.length) {
    return null;
  }

  return (
    <Carousel gap="gap-3" itemClassName="w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-3.75rem)/6)]">
      {items.map((item, index) => (
        <div key={item.id} className="relative">
          <MediaPosterCard
            item={item}
            fallbackMediaType={fallbackMediaType}
            imageLoading={index < 3 ? 'eager' : 'lazy'}
            imageFetchPriority={index < 3 ? 'high' : undefined}
          />
          {showRank ? (
            <span className="pointer-events-none absolute top-2 left-2 grid size-7 place-items-center border border-black/20 bg-white/80 text-[11px] font-bold text-black">
              {item.imdb_rank || index + 1}
            </span>
          ) : null}
        </div>
      ))}
    </Carousel>
  );
}
