'use client';

import dynamic from 'next/dynamic';

const Nav = dynamic(() => import('@/core/modules/nav'));

export function DynamicNav() {
  return <Nav />;
}
