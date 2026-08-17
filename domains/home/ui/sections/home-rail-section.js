'use client';

import { getUniqueDiscoverItems } from '@/domains/home/utils/discover';
import {
  HOME_SECTION_CONTENT_CLASS,
  HOME_SECTION_HEADER_CLASS,
  HOME_SECTION_TITLE_CLASS,
} from '@/domains/home/ui/layouts/home-section';
import { PosterRail } from '../components/poster-rail';
import { GridShellCrosshairs } from '@/domains/shell/layout/grid-crosshair';

export function HomeRailSection({ fallbackMediaType, items = [], limit, showRank = false, title }) {
  const railItems = getUniqueDiscoverItems(items, limit);

  if (!railItems.length) {
    return null;
  }

  return (
    <section className="relative w-full">
      <div className="relative">
        <div className={HOME_SECTION_HEADER_CLASS}>
          <h2 className={HOME_SECTION_TITLE_CLASS}>{title}</h2>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
          <GridShellCrosshairs />
        </div>
      </div>
      <div className={HOME_SECTION_CONTENT_CLASS}>
        <PosterRail fallbackMediaType={fallbackMediaType} items={railItems} showRank={showRank} />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-px w-screen -translate-x-1/2 bg-white/10 backdrop-blur-sm">
        <GridShellCrosshairs />
      </div>
    </section>
  );
}
