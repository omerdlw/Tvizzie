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
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3">
        <h2 className="text-[11px] font-semibold tracking-wider text-black/70 uppercase">{title}</h2>
        <PosterRail items={railItems} />
      </section>
    </HomeSectionReveal>
  );
}
