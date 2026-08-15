'use client';

import { getUniqueDiscoverItems } from '@/domains/home/shared/discover';
import { HomeReveal } from '@/app/motion';
import {
  HOME_SECTION_CONTENT_CLASS,
  HOME_SECTION_HEADER_CLASS,
  HOME_SECTION_TITLE_CLASS,
} from '@/domains/home/ui/layouts/home-section';
import { PosterRail } from '../components/poster-rail';

export function TopRatedSection({ fallbackMediaType, items = [], title }) {
  const railItems = getUniqueDiscoverItems(items, 100);

  if (!railItems.length) {
    return null;
  }

  return (
    <section className="relative w-full">
      <div className="relative">
        <HomeReveal stage="section.heading">
          <div className={HOME_SECTION_HEADER_CLASS}>
            <h2 className={HOME_SECTION_TITLE_CLASS}>{title}</h2>
          </div>
        </HomeReveal>
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
      </div>
      <HomeReveal stage="section.rail">
        <div className={HOME_SECTION_CONTENT_CLASS}>
          <PosterRail fallbackMediaType={fallbackMediaType} items={railItems} showRank />
        </div>
      </HomeReveal>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm" />
    </section>
  );
}
