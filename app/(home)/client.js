'use client';

import NavHeightSpacer from '@/features/app-shell/nav-height-spacer';
import Registry from './registry';
import View from './view';

export default function Client({ data = {} }) {
  return (
    <>
      <Registry />
      <View homeData={data} />
      <NavHeightSpacer className="w-full bg-black" />
    </>
  );
}
