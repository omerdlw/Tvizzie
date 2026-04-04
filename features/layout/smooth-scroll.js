'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { ReactLenis } from 'lenis/react';

import { DURATION } from '@/core/constants';

function isReloadNavigation() {
  if (typeof window === 'undefined') return false;

  const navigationEntry = performance.getEntriesByType('navigation')[0];

  if (navigationEntry && 'type' in navigationEntry) {
    return navigationEntry.type === 'reload';
  }

  return performance.navigation?.type === performance.navigation.TYPE_RELOAD;
}

function shouldResetForDetailRoute(prevPathname, nextPathname) {
  if (!prevPathname || prevPathname === nextPathname) return false;

  return nextPathname.startsWith('/movie/');
}

function forceScrollToTop(lenisRef) {
  window.scrollTo(0, 0);
  lenisRef.current?.lenis?.scrollTo(0, {
    immediate: true,
    force: true,
  });
}

export function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null);
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (!isReloadNavigation()) return;

    let secondFrame = 0;

    const resetScroll = () => {
      window.scrollTo(0, 0);
      lenisRef.current?.lenis?.scrollTo(0, {
        immediate: true,
        force: true,
      });
    };

    const firstFrame = requestAnimationFrame(() => {
      resetScroll();

      secondFrame = requestAnimationFrame(() => {
        resetScroll();
      });
    });

    const timeoutId = window.setTimeout(() => {
      resetScroll();
    }, 120);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (!shouldResetForDetailRoute(previousPathname, pathname)) return;

    let secondFrame = 0;
    let thirdFrame = 0;

    forceScrollToTop(lenisRef);

    const firstFrame = requestAnimationFrame(() => {
      forceScrollToTop(lenisRef);

      secondFrame = requestAnimationFrame(() => {
        forceScrollToTop(lenisRef);

        thirdFrame = requestAnimationFrame(() => {
          forceScrollToTop(lenisRef);
        });
      });
    });

    const firstTimeoutId = window.setTimeout(() => {
      forceScrollToTop(lenisRef);
    }, 120);

    const secondTimeoutId = window.setTimeout(() => {
      forceScrollToTop(lenisRef);
    }, 260);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      cancelAnimationFrame(thirdFrame);
      window.clearTimeout(firstTimeoutId);
      window.clearTimeout(secondTimeoutId);
    };
  }, [pathname]);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        lerp: 0.2,
        duration: DURATION.MODERATE,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      }}
    >
      {children}
    </ReactLenis>
  );
}
