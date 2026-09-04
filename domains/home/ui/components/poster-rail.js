'use client';

import Carousel from '@/ui/components/media-carousel';
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';

export function PosterRail({ fallbackMediaType = 'movie', items = [], showRank = false }) {
  if (!items.length) {
    return null;
  }

  return (
    <Carousel
      gap="gap-2.5 sm:gap-3"
      itemClassName="w-[calc((100%-1.25rem)/3)] sm:w-[calc((100%-2.25rem)/4)] lg:w-[calc((100%-3.75rem)/6)]"
    >
      {items.map((item, index) => (
        <div key={item.id} className="relative rounded-[20px]">
          <MediaPosterCard
            item={item}
            fallbackMediaType={fallbackMediaType}
            imageLoading={index < 3 ? 'eager' : 'lazy'}
            imageFetchPriority={index < 3 ? 'high' : undefined}
          />
          {showRank ? (
            <span className="pointer-events-none absolute top-2 left-2 grid size-7 place-items-center rounded-xl bg-white/70 text-xs font-black text-black shadow-md ring-1 ring-black/20 backdrop-blur-md ring-inset">
              {item.imdb_rank || index + 1}
            </span>
          ) : null}
        </div>
      ))}
    </Carousel>
  );
}
