'use client';

import { HomeSectionReveal } from '@/app/(home)/motion';
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

export function TrendingSection({ title, items = [], delay = 0.12, distance = 18 }) {
  const railItems = getUniqueItems(items, 12);

  if (!railItems.length) {
    return null;
  }

  return (
    <HomeSectionReveal delay={delay} distance={distance}>
      <section className="home-section-shell flex w-full flex-col gap-4">
        <div className="home-section-heading">
          <h2 className="text-xs font-semibold tracking-widest text-white-soft uppercase">{title}</h2>
        </div>
        <PosterRail items={railItems} />
      </section>
    </HomeSectionReveal>
  );
}
