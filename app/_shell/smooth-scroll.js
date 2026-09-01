'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

const CONTEXT_MENU_VISIBILITY_EVENT = 'context-menu:visibility';
const SMOOTH_SCROLL_LOCK_EVENT = 'modal:smooth-scroll-lock';
const DETAIL_ROUTE_PREFIXES = ['/movie/', '/tv/', '/person/'];
const SCROLL_LERP = 0.1;

const SmoothScrollContext = createContext(null);

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}

function isReloadNavigation() {
  if (typeof window === 'undefined') return false;
  const entry = performance.getEntriesByType('navigation')[0];
  if (entry && 'type' in entry) return entry.type === 'reload';
  return performance.navigation?.type === performance.navigation.TYPE_RELOAD;
}

function shouldResetForDetailRoute(prevPathname, nextPathname) {
  if (!prevPathname || prevPathname === nextPathname) return false;
  return DETAIL_ROUTE_PREFIXES.some((prefix) => nextPathname.startsWith(prefix));
}

function applySmoothScrollLock(smootherRef, lockSources) {
  const isLocked = lockSources.size > 0;

  if (isLocked) {
    smootherRef.current?.stop();
    return;
  }

  smootherRef.current?.start();
}

function resetScrollToTop(smootherRef) {
  smootherRef.current?.scrollTo(0, { force: true, immediate: true });
  window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
}

function createSmoother(smootherRef) {
  const smoother = new Lenis({
    lerp: SCROLL_LERP,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.0,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: true,
    respectReducedMotion: true,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
  });

  smootherRef.current = smoother;
  return smoother;
}

export function SmoothScrollProvider({ children }) {
  const pathname = usePathname();
  const smootherRef = useRef(null);
  const previousPathnameRef = useRef(pathname);
  const scrollLockSourcesRef = useRef(new Set());

  useEffect(() => {
    const smoother = createSmoother(smootherRef);
    applySmoothScrollLock(smootherRef, scrollLockSourcesRef.current);

    return () => {
      smoother.destroy();
      smootherRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isReloadNavigation()) return;
    resetScrollToTop(smootherRef);
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (!shouldResetForDetailRoute(previousPathname, pathname)) return;
    resetScrollToTop(smootherRef);
  }, [pathname]);

  useEffect(() => {
    const handleContextMenuVisibility = (event) => {
      const isOpen = Boolean(event?.detail?.isOpen);

      if (isOpen) {
        scrollLockSourcesRef.current.add('context-menu');
      } else {
        scrollLockSourcesRef.current.delete('context-menu');
      }

      applySmoothScrollLock(smootherRef, scrollLockSourcesRef.current);
    };

    const handleSmoothScrollLock = (event) => {
      const source = String(event?.detail?.source || 'global');
      const locked = Boolean(event?.detail?.locked);

      if (locked) {
        scrollLockSourcesRef.current.add(source);
      } else {
        scrollLockSourcesRef.current.delete(source);
      }

      applySmoothScrollLock(smootherRef, scrollLockSourcesRef.current);
    };

    window.addEventListener(CONTEXT_MENU_VISIBILITY_EVENT, handleContextMenuVisibility);
    window.addEventListener(SMOOTH_SCROLL_LOCK_EVENT, handleSmoothScrollLock);

    return () => {
      window.removeEventListener(CONTEXT_MENU_VISIBILITY_EVENT, handleContextMenuVisibility);
      window.removeEventListener(SMOOTH_SCROLL_LOCK_EVENT, handleSmoothScrollLock);
    };
  }, []);

  return (
    <SmoothScrollContext.Provider value={smootherRef}>
      <div className="min-h-screen w-full">{children}</div>
    </SmoothScrollContext.Provider>
  );
}
