'use client';

import Carousel from '@/ui/media/carousel';
import MediaPosterCard from '@/features/media/media-poster-card';

function getUniqueItems(items = [], limit = items.length) {
  const seen = new Set();
  return items
    .filter((item) => {
      const id = item?.id;
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    })
    .slice(0, limit);
}

export function TrendingSection({ title, items = [] }) {
  const railItems = getUniqueItems(items, 12);

  if (!railItems.length) {
    return null;
  }

  return (
    <div className="w-full">
      <section className="flex w-full min-w-0 flex-col gap-4">
        <div className="min-w-0">
          <h2 className="font-zuume text-3xl leading-none font-bold text-white uppercase sm:text-4xl lg:text-5xl">
            {title}
          </h2>
        </div>
        <Carousel gap="gap-3" itemClassName="home-poster-rail-item">
          {railItems.map((item) => (
            <MediaPosterCard key={item.id} item={item} />
          ))}
        </Carousel>
      </section>
    </div>
  );
}
