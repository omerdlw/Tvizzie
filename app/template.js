'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { useOptionalBackgroundActions } from '@/core/modules/background/context';
import { ModuleError } from '@/core/modules/error-boundary';

function isMediaPath(pathname = '') {
  return pathname.startsWith('/movie/') || pathname.startsWith('/tv/');
}

export default function Template({ children }) {
  const backgroundActions = useOptionalBackgroundActions();
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (!previousPathname || previousPathname === pathname) {
      return;
    }

    if (isMediaPath(previousPathname) && isMediaPath(pathname)) {
      backgroundActions?.resetBackground?.();
    }
  }, [backgroundActions, pathname]);

  return (
    <ModuleError>
      <div className="contents">{children}</div>
    </ModuleError>
  );
}
