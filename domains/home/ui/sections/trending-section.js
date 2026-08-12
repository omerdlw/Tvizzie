'use client';


import { getUniqueDiscoverItems } from '@/domains/home/shared/discover';
import { PosterRail } from '../components/poster-rail';

export function TrendingSection({ title, items = [] }) {
  const railItems = getUniqueDiscoverItems(items, 12);

  if (!railItems.length) {
    return null;
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <h2 className="text-[11px] font-semibold tracking-wider text-black/70 uppercase">{title}</h2>
      <PosterRail items={railItems} />
    </section>
  );
}
