'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

import { getNavCardWidth } from '../geometry';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function getIsMobileViewport() {
  return typeof window !== 'undefined' ? window.innerWidth < 640 : false;
}

export function useNavViewport() {
  const [stackWidth, setStackWidth] = useState(() => getNavCardWidth());
  const [isMobile, setIsMobile] = useState(getIsMobileViewport);
  const [portalTarget, setPortalTarget] = useState(null);

  useIsomorphicLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setStackWidth(getNavCardWidth());
      setIsMobile(getIsMobileViewport());
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isMobile,
    portalTarget,
    stackWidth,
  };
}
