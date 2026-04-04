'use client';

import { useCallback, useState } from 'react';

import NavHeightSpacer from '@/features/layout/nav-height-spacer';
import Registry from './registry';
import View from './view';

function getInitialHeroBackdrop(items = []) {
  return items.find((item) => item?.backdrop_path)?.backdrop_path || null;
}

export default function Client({ homeData = {} }) {
  const [heroBackdropPath, setHeroBackdropPath] = useState(() => getInitialHeroBackdrop(homeData.heroItems));

  const handleHeroBackdropChange = useCallback((backdropPath) => {
    setHeroBackdropPath(backdropPath || null);
  }, []);

  return (
    <>
      <Registry heroBackdropPath={heroBackdropPath} />
      <View homeData={homeData} onHeroBackdropChange={handleHeroBackdropChange} />
      <NavHeightSpacer />
    </>
  );
}
