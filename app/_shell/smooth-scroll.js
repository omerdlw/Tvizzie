'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';

const SMOOTH_SCROLL_LOCK_EVENT = 'tvizzie:smooth-scroll-lock';
const SCROLL_ACTIVE_ATTR = 'data-scroll-active';
const SCROLL_ACTIVE_RESET_MS = 80;
const WHEEL_DELTA_CAP = 110;
const WHEEL_DELTA_SOFTEN_POINT = 28;
const WHEEL_DELTA_SOFTEN_MULTIPLIER = 0.7;
const WHEEL_DELTA_MIN_NOISE = 0.35;

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

/**
 * Tracks active scroll state so heavy backdrop blur can be softened during motion.
 */
function LenisPerformanceBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    let activeTimeout = 0;
    let scrollActive = false;

    const setScrollActive = () => {
      if (scrollActive) {
        return;
      }

      scrollActive = true;
      root.setAttribute(SCROLL_ACTIVE_ATTR, 'true');
    };

    const clearScrollActive = () => {
      if (!scrollActive) {
        return;
      }

      scrollActive = false;
      root.removeAttribute(SCROLL_ACTIVE_ATTR);
    };

    const queueIdleState = () => {
      window.clearTimeout(activeTimeout);
      activeTimeout = window.setTimeout(() => {
        if (lenis.isScrolling) {
          return;
        }

        clearScrollActive();
      }, SCROLL_ACTIVE_RESET_MS);
    };

    const onScroll = (instance) => {
      if (!instance.isScrolling) {
        queueIdleState();
        return;
      }

      window.clearTimeout(activeTimeout);
      setScrollActive();
      queueIdleState();
    };

    const unsubscribe = lenis.on('scroll', onScroll);

    return () => {
      unsubscribe?.();
      window.clearTimeout(activeTimeout);
      clearScrollActive();
    };
  }, [lenis]);

  return null;
}

const defaultLenisOptions = {
  autoRaf: true,
  // Faster profile with shorter inertia tail.
  duration: 0.38,
  easing: (t) => 1 - (1 - t) ** 1.65,
  wheelMultiplier: 1.28,
  smoothWheel: true,
  syncTouch: false,
  touchMultiplier: 1.2,
  overscroll: false,
  stopInertiaOnNavigate: true,
  virtualScroll: (data) => {
    const { event } = data;

    if (!event) {
      return true;
    }

    if (event.ctrlKey) {
      return false;
    }

    const absX = Math.abs(data.deltaX);
    const absY = Math.abs(data.deltaY);

    if (absX < WHEEL_DELTA_MIN_NOISE && absY < WHEEL_DELTA_MIN_NOISE) {
      return false;
    }

    if (absY <= WHEEL_DELTA_SOFTEN_POINT) {
      return true;
    }

    const sign = Math.sign(data.deltaY) || 1;
    const cappedDelta = Math.min(absY, WHEEL_DELTA_CAP);
    const tailDelta = cappedDelta - WHEEL_DELTA_SOFTEN_POINT;
    data.deltaY = sign * (WHEEL_DELTA_SOFTEN_POINT + tailDelta * WHEEL_DELTA_SOFTEN_MULTIPLIER);

    return true;
  },
};

export function SmoothScrollProvider({ enabled, children }) {
  const prefersReducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotionClient, () => false);

  const active = enabled && !prefersReducedMotion;

  if (!active) {
    return children;
  }

  return (
    <ReactLenis root options={defaultLenisOptions}>
      <LenisLockBridge />
      <LenisPerformanceBridge />
      {children}
    </ReactLenis>
  );
}
