'use client';

import { useEffect, useRef } from 'react';

export function useRouteChangeEffects(pathname, expandParentForPath, setExpanded, setSearchQuery, setIsHovered) {
  const previousPathRef = useRef(pathname);

  useEffect(() => {
    if (previousPathRef.current === pathname) {
      return;
    }

    previousPathRef.current = pathname;

    setExpanded(false);
    setSearchQuery('');
    setIsHovered(false);
    expandParentForPath(pathname);
  }, [pathname, expandParentForPath, setExpanded, setSearchQuery, setIsHovered]);
}
