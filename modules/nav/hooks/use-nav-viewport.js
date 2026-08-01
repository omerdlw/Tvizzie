'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

import { getNavCardWidth } from '../nav-layout';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useNavViewport(activeItem = null) {
  const [stackWidth, setStackWidth] = useState(() => getNavCardWidth(activeItem));
  const [portalTarget, setPortalTarget] = useState(null);

  useIsomorphicLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    setStackWidth(getNavCardWidth(activeItem));
  }, [activeItem]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setStackWidth(getNavCardWidth(activeItem));
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeItem]);

  return {
    portalTarget,
    stackWidth,
  };
}
