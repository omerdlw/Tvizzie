'use client';

import { usePathname } from 'next/navigation';

import Nav from '@/core/modules/nav';

function shouldHideGlobalNav(pathname = '') {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function DynamicNav() {
  const pathname = usePathname();

  if (shouldHideGlobalNav(pathname)) {
    return null;
  }

  return <Nav />;
}
