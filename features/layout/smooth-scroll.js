'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { ReactLenis } from 'lenis/react';

import { DURATION } from '@/core/constants';

const CONTEXT_MENU_VISIBILITY_EVENT = 'tvizzie:context-menu-visibility';
const DETAIL_ROUTE_PREFIXES = ['/movie/', '/person/'];

function premiumScrollEasing(value) {
  return 1 - Math.pow(1 - value, 3.2);
}

const PREMIUM_SCROLL_OPTIONS = Object.freeze({
  anchors: {
    duration: DURATION.MODERATE,
    easing: premiumScrollEasing,
  },
  gestureOrientation: 'vertical',
  lerp: 0.2,
  overscroll: true,
  smoothWheel: true,
  stopInertiaOnNavigate: true,
  touchMultiplier: 1.25,
  wheelMultiplier: 1,
});

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

  return DETAIL_ROUTE_PREFIXES.some((prefix) => nextPathname.startsWith(prefix));
}

function forceScrollToTop(lenisRef) {
  window.scrollTo(0, 0);
  lenisRef.current?.lenis?.scrollTo(0, {
    immediate: true,
    force: true,
  });
}

function scheduleScrollTopReset(lenisRef, { framePasses = 3, timeoutDelays = [] } = {}) {
  forceScrollToTop(lenisRef);

  let rafId = 0;
  let frameCount = 0;

  const runFrame = () => {
    forceScrollToTop(lenisRef);
    frameCount += 1;

    if (frameCount < framePasses) {
      rafId = requestAnimationFrame(runFrame);
    }
  };

  rafId = requestAnimationFrame(runFrame);

  const timeoutIds = timeoutDelays.map((delay) =>
    window.setTimeout(() => {
      forceScrollToTop(lenisRef);
    }, delay)
  );

  return () => {
    cancelAnimationFrame(rafId);
    timeoutIds.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
  };
}

export function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null);
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    if (!isReloadNavigation()) return;

    return scheduleScrollTopReset(lenisRef, {
      framePasses: 2,
      timeoutDelays: [120],
    });
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (!shouldResetForDetailRoute(previousPathname, pathname)) return;

    return scheduleScrollTopReset(lenisRef, {
      framePasses: 4,
      timeoutDelays: [120, 260],
    });
  }, [pathname]);

  useEffect(() => {
    const handleContextMenuVisibility = (event) => {
      const isOpen = Boolean(event?.detail?.isOpen);
      const lenis = lenisRef.current?.lenis;

      if (!lenis) {
        return;
      }

      if (isOpen) {
        lenis.stop();
        return;
      }

      lenis.start();
    };

    window.addEventListener(CONTEXT_MENU_VISIBILITY_EVENT, handleContextMenuVisibility);

    return () => {
      window.removeEventListener(CONTEXT_MENU_VISIBILITY_EVENT, handleContextMenuVisibility);
    };
  }, []);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={PREMIUM_SCROLL_OPTIONS}
    >
      {children}
    </ReactLenis>
  );
}
