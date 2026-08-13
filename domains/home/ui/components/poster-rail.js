'use client';

import Carousel from '@/domains/media/ui/components/media-carousel';
import MediaPosterCard from '@/domains/media/ui/components/media-poster-card';
import { HomeReveal } from '@/app/motion';

export function PosterRail({ fallbackMediaType = 'movie', items = [], showRank = false }) {
  if (!items.length) {
    return null;
  }

  return (
    <Carousel gap="gap-3" itemClassName="w-[calc((100%-1.5rem)/3)] md:w-[calc((100%-3.75rem)/6)]">
      {items.map((item, index) => (
        <HomeReveal key={item.id} itemIndex={index} stage="section.item">
          <div className="relative">
            <MediaPosterCard item={item} fallbackMediaType={fallbackMediaType} />
            {showRank ? (
              <span className="pointer-events-none absolute top-2 left-2 grid size-7 place-items-center  border border-white/20 bg-black/80 text-[11px] font-bold text-white shadow-sm">
                {item.imdb_rank || index + 1}
              </span>
            ) : null}
          </div>
        </HomeReveal>
      ))}
    </Carousel>
  );
}
