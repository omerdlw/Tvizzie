'use client';

import { HomeRailSection } from './home-rail-section';

export function TrendingSection({ items = [], title }) {
  return <HomeRailSection items={items} limit={12} title={title} />;
}
