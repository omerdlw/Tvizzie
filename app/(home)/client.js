'use client';

import { TMDB_IMG } from '@/core/constants';
import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import Registry from './registry';
import View from './view';

export default function Client({ data = {} }) {
  const activeHeroItem = Array.isArray(data.initialDiscoverItems) ? data.initialDiscoverItems[0] : null;
  const activeHeroBackground = activeHeroItem?.backdrop_path
    ? `${TMDB_IMG}/original${activeHeroItem.backdrop_path}`
    : null;

  return (
    <>
      <Registry backgroundImage={activeHeroBackground} />
      <View homeData={data} />
      <NavHeightSpacer className="w-full bg-white" />
    </>
  );
}
