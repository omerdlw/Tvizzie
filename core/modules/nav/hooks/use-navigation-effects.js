'use client';

import { useEffect, useRef } from 'react';

export function useRouteChangeEffects(pathname, setExpanded, setSearchQuery, setIsHovered) {
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    previousPathRef.current = pathname;

    setExpanded(false);
    setSearchQuery('');
    setIsHovered(false);
  }, [pathname, setExpanded, setSearchQuery, setIsHovered]);
}
