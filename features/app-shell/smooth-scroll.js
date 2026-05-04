'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';

const SMOOTH_SCROLL_LOCK_EVENT = 'tvizzie:smooth-scroll-lock';

function subscribeReducedMotion(onStoreChange) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getReducedMotionClient() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Keeps Lenis paused while modals or horizontal carousels request a scroll lock.
 */
function LenisLockBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    const locks = new Set();

    const onLock = (event) => {
      const detail = event?.detail;
      const locked = Boolean(detail?.locked);
      const source = detail?.source != null ? String(detail.source) : '';

      if (!source) return;

      if (locked) {
        locks.add(source);
      } else {
        locks.delete(source);
      }

      if (locks.size > 0) {
        lenis.stop();
      } else {
        lenis.start();
      }
    };

    window.addEventListener(SMOOTH_SCROLL_LOCK_EVENT, onLock);

    return () => {
      window.removeEventListener(SMOOTH_SCROLL_LOCK_EVENT, onLock);
      locks.clear();
    };
  }, [lenis]);

  return null;
}

const defaultLenisOptions = {
  autoRaf: true,
  // Softer follow-through than default (~0.1)
  lerp: 0.068,
  wheelMultiplier: 0.88,
  smoothWheel: true,
  syncTouch: false,
  touchMultiplier: 1.45,
};

export function SmoothScrollProvider({ enabled, children }) {
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionClient,
    () => false
  );

  const active = enabled && !prefersReducedMotion;

  if (!active) {
    return children;
  }

  return (
    <ReactLenis root options={defaultLenisOptions}>
      <LenisLockBridge />
      {children}
    </ReactLenis>
  );
}
