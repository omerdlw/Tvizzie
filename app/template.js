'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { useBackgroundActions } from '@/core/modules/background/context';
import { ModuleError } from '@/core/modules/error-boundary';

function isMoviePath(pathname = '') {
  return pathname.startsWith('/movie/');
}

export default function Template({ children }) {
  const { resetBackground } = useBackgroundActions();
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (!previousPathname || previousPathname === pathname) {
      return;
    }

    if (isMoviePath(previousPathname) && isMoviePath(pathname)) {
      resetBackground();
    }
  }, [pathname, resetBackground]);

  return (
    <ModuleError>
      <div className="contents">{children}</div>
    </ModuleError>
  );
}
