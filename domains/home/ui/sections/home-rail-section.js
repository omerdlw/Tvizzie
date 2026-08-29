'use client';

import { getUniqueDiscoverItems } from '@/domains/home/utils/discover';
import {
  HOME_SECTION_CONTENT_CLASS,
  HOME_SECTION_HEADER_CLASS,
  HOME_SECTION_TITLE_CLASS,
} from '@/domains/home/ui/layouts/home-section';
import { PosterRail } from '../components/poster-rail';

export function HomeRailSection({ fallbackMediaType, items = [], limit, showRank = false, title }) {
  const railItems = getUniqueDiscoverItems(items, limit);

  if (!railItems.length) {
    return null;
  }

  return (
    <section className="relative w-full">
      <div className={HOME_SECTION_HEADER_CLASS}>
        <h2 className={HOME_SECTION_TITLE_CLASS}>{title}</h2>
      </div>
      <div className={HOME_SECTION_CONTENT_CLASS}>
        <PosterRail fallbackMediaType={fallbackMediaType} items={railItems} showRank={showRank} />
      </div>
    </section>
  );
}
