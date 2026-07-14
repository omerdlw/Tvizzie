'use client';

import { useEffect, useLayoutEffect, useState } from 'react';

import { getNavCardWidth } from '../layout';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useNavViewport() {
  const [stackWidth, setStackWidth] = useState(() => getNavCardWidth());
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
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    portalTarget,
    stackWidth,
  };
}
