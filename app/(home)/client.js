'use client';

import { useState } from 'react';

import { TMDB_IMG } from '@/core/constants';
import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import Registry from './registry';
import View from './view';

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

export default function Client({ data = {} }) {
  const heroItems = getUniqueItems(Array.isArray(data.heroItems) ? data.heroItems : [], 5);
  const [selectedHeroId, setSelectedHeroId] = useState(heroItems[0]?.id ?? null);
  const activeHeroItem = heroItems.find((item) => item?.id === selectedHeroId) || heroItems[0] || null;
  const activeHeroBackground = activeHeroItem?.backdrop_path ? `${TMDB_IMG}/original${activeHeroItem.backdrop_path}` : null;

  return (
    <>
      <Registry backgroundImage={activeHeroBackground} />
      <View
        homeData={data}
        heroItems={heroItems}
        selectedHeroId={selectedHeroId}
        onSelectHero={setSelectedHeroId}
      />
      <NavHeightSpacer className="w-full bg-[#FAF9F5]" />
    </>
  );
}
