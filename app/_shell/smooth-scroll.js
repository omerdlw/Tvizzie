'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

const CONTEXT_MENU_VISIBILITY_EVENT = 'tvizzie:context-menu-visibility';
const SMOOTH_SCROLL_LOCK_EVENT = 'tvizzie:smooth-scroll-lock';
const DETAIL_ROUTE_PREFIXES = ['/movie/', '/tv/', '/person/'];
const DESKTOP_SCROLL_LERP = 0.1;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const TOUCH_SCROLL_QUERY = '(hover: none), (pointer: coarse)';

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

function getPrefersReducedMotion() {
  return getMediaQueryMatches(REDUCED_MOTION_QUERY);
}

function getMediaQueryMatches(query) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

  return window.matchMedia(query).matches;
}

function getIsTouchScrollDevice() {
  if (typeof window === 'undefined') return false;

  return getMediaQueryMatches(TOUCH_SCROLL_QUERY) || Number(navigator.maxTouchPoints || 0) > 0;
}

function addMediaQueryListener(mediaQuery, listener) {
  if (typeof mediaQuery?.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return;
  }

  mediaQuery?.addListener?.(listener);
}

function removeMediaQueryListener(mediaQuery, listener) {
  if (typeof mediaQuery?.removeEventListener === 'function') {
    mediaQuery.removeEventListener('change', listener);
    return;
  }

  mediaQuery?.removeListener?.(listener);
}

function applySmoothScrollLock(smootherRef, lockSources) {
  const isLocked = lockSources.size > 0;

  if (isLocked) {
    smootherRef.current?.stop();
    return;
  }

  smootherRef.current?.start();
}

function resetScrollPresentation() {
  const root = document.documentElement;

  root.classList.remove('is-scrolling', 'scrolling-down', 'scrolling-up');
}

function forceScrollToTop(smootherRef) {
  smootherRef.current?.scrollTo(0, { force: true, immediate: true });
  window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
}

function scheduleScrollTopReset(smootherRef, { framePasses = 3, timeoutDelays = [] } = {}) {
  forceScrollToTop(smootherRef);

  let rafId = 0;
  let frameCount = 0;

  const runFrame = () => {
    forceScrollToTop(smootherRef);
    frameCount += 1;
    if (frameCount < framePasses) rafId = requestAnimationFrame(runFrame);
  };

  rafId = requestAnimationFrame(runFrame);

  const timeoutIds = timeoutDelays.map((delay) =>
    window.setTimeout(() => forceScrollToTop(smootherRef), delay),
  );

  return () => {
    cancelAnimationFrame(rafId);
    timeoutIds.forEach((id) => window.clearTimeout(id));
  };
}

function createSmoother({ smootherRef, isTouchScrollDevice }) {
  const smoother = new Lenis({
    autoRaf: true,
    lerp: DESKTOP_SCROLL_LERP,
    smoothWheel: !isTouchScrollDevice,
    stopInertiaOnNavigate: true,
    syncTouch: false,
  });

  smootherRef.current = smoother;

  return smoother;
}

export function SmoothScrollProvider({ children }) {
  const pathname = usePathname();
  const smootherRef = useRef(null);
  const previousPathnameRef = useRef(pathname);
  const scrollLockSourcesRef = useRef(new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isTouchScrollDevice, setIsTouchScrollDevice] = useState(false);
  const [isScrollProfileReady, setIsScrollProfileReady] = useState(false);

  useEffect(() => {
    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(REDUCED_MOTION_QUERY)
        : null;
    const touchMediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(TOUCH_SCROLL_QUERY)
        : null;

    const updateScrollProfile = () => {
      setPrefersReducedMotion(getPrefersReducedMotion());
      setIsTouchScrollDevice(getIsTouchScrollDevice());
      setIsScrollProfileReady(true);
    };

    updateScrollProfile();
    addMediaQueryListener(mediaQuery, updateScrollProfile);
    addMediaQueryListener(touchMediaQuery, updateScrollProfile);

    return () => {
      removeMediaQueryListener(mediaQuery, updateScrollProfile);
      removeMediaQueryListener(touchMediaQuery, updateScrollProfile);
    };
  }, []);

  useEffect(() => {
    if (!isScrollProfileReady) return;

    if (prefersReducedMotion) {
      resetScrollPresentation();
      smootherRef.current?.destroy();
      smootherRef.current = null;
      return undefined;
    }

    const smoother = createSmoother({
      smootherRef,
      isTouchScrollDevice,
    });
    applySmoothScrollLock(smootherRef, scrollLockSourcesRef.current);

    return () => {
      smoother.destroy();
      smootherRef.current = null;
      resetScrollPresentation();
    };
  }, [prefersReducedMotion, isScrollProfileReady, isTouchScrollDevice]);

  useEffect(() => {
    if (!isReloadNavigation()) return;
    return scheduleScrollTopReset(smootherRef, {
      framePasses: 2,
      timeoutDelays: [120],
    });
  }, []);

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    if (!shouldResetForDetailRoute(previousPathname, pathname)) return;
    return scheduleScrollTopReset(smootherRef, {
      framePasses: 4,
      timeoutDelays: [120, 260],
    });
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

  return <div className="min-h-screen w-full">{children}</div>;
}
