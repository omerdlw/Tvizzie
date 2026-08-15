'use client';

import { HomeRailSection } from './home-rail-section';

export function TopRatedSection({ fallbackMediaType, items = [], title }) {
  return (
    <HomeRailSection
      fallbackMediaType={fallbackMediaType}
      items={items}
      limit={100}
      showRank
      title={title}
    />
  );
}
