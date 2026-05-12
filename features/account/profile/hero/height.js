'use client';

import { useEffect, useRef, useState } from 'react';

export function useAccountHeroHeight() {
  const heroRef = useRef(null);
  const [heroHeight, setHeroHeight] = useState(0);

  useEffect(() => {
    const element = heroRef.current;
    if (!element) return;

    const updateHeight = () => {
      const nextHeight = Math.round(element.getBoundingClientRect().height || 0);
      setHeroHeight(nextHeight);
    };

    updateHeight();

    if (typeof ResizeObserver !== 'function') return;

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { heroHeight, heroRef };
}
