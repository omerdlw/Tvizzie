'use client';

import { PosterRail } from './poster-rail';

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
      <section className="home-section-shell flex w-full flex-col gap-4">
        <div className="home-section-heading">
          <h2 className="font-zuume text-3xl leading-none font-bold text-white uppercase sm:text-4xl lg:text-5xl">
            {title}
          </h2>
        </div>
        <PosterRail items={railItems} />
      </section>
    </div>
  );
}
