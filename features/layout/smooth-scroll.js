'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';

const CONTEXT_MENU_VISIBILITY_EVENT = 'tvizzie:context-menu-visibility';
const DETAIL_ROUTE_PREFIXES = ['/movie/', '/person/'];
const SMOOTH_WRAPPER_ID = 'smooth-wrapper';
const SMOOTH_CONTENT_ID = 'smooth-content';

const DESKTOP_SMOOTH_DURATION = 1.1;
const TOUCH_SMOOTH_DURATION = 0.14;
const VELOCITY_NORMALIZER = 2400;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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

function getPrefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function syncScrollCSSVars(smoother) {
  if (!smoother) return;

  const root = document.documentElement;
  const velocity = clamp(smoother.getVelocity() / VELOCITY_NORMALIZER, -1, 1);
  const direction = smoother.scrollTrigger?.direction ?? (velocity === 0 ? 0 : velocity > 0 ? 1 : -1);
  const progress = clamp(Number.isFinite(smoother.progress) ? smoother.progress : 0, 0, 1);

  root.style.setProperty('--scroll-progress', progress.toFixed(5));
  root.style.setProperty('--scroll-velocity', velocity.toFixed(5));
  root.style.setProperty('--scroll-direction', String(direction));
}

function syncScrollStateClasses(smoother, isScrolling) {
  const root = document.documentElement;
  const velocity = smoother ? smoother.getVelocity() : 0;
  const direction =
    smoother?.scrollTrigger?.direction ?? (velocity === 0 ? 0 : velocity > 0 ? 1 : -1);

  root.classList.toggle('is-scrolling', isScrolling);

  if (direction > 0) {
    root.classList.add('scrolling-down');
    root.classList.remove('scrolling-up');
    return;
  }

  if (direction < 0) {
    root.classList.add('scrolling-up');
    root.classList.remove('scrolling-down');
    return;
  }

  root.classList.remove('scrolling-down');
  root.classList.remove('scrolling-up');
}

function resetScrollPresentation() {
  const root = document.documentElement;

  root.style.setProperty('--scroll-progress', '0');
  root.style.setProperty('--scroll-velocity', '0');
  root.style.setProperty('--scroll-direction', '0');
  root.classList.remove('is-scrolling', 'scrolling-down', 'scrolling-up');
}

function forceScrollToTop(smootherRef) {
  window.scrollTo(0, 0);
  smootherRef.current?.scrollTop(0);
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

  const timeoutIds = timeoutDelays.map((delay) => window.setTimeout(() => forceScrollToTop(smootherRef), delay));

  return () => {
    cancelAnimationFrame(rafId);
    timeoutIds.forEach((id) => window.clearTimeout(id));
  };
}

function createSmoother({ wrapper, content, smootherRef }) {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

  ScrollSmoother.get()?.kill();

  const handleScrollUpdate = () => {
    const smoother = smootherRef.current;
    syncScrollCSSVars(smoother);
    syncScrollStateClasses(smoother, true);
  };

  const handleScrollStop = () => {
    syncScrollStateClasses(smootherRef.current, false);
  };

  const smoother = ScrollSmoother.create({
    content,
    ease: 'expo',
    effects: false,
    ignoreMobileResize: true,
    normalizeScroll: true,
    onStop: handleScrollStop,
    onUpdate: handleScrollUpdate,
    smooth: DESKTOP_SMOOTH_DURATION,
    smoothTouch: TOUCH_SMOOTH_DURATION,
    speed: 0.95,
    wrapper,
  });

  smootherRef.current = smoother;
  syncScrollCSSVars(smoother);
  syncScrollStateClasses(smoother, false);
  ScrollTrigger.refresh();

  return smoother;
}

export function SmoothScrollProvider({ children }) {
  const pathname = usePathname();
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const smootherRef = useRef(null);
  const previousPathnameRef = useRef(pathname);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    const updatePreference = () => {
      setPrefersReducedMotion(getPrefersReducedMotion());
    };

    updatePreference();
    mediaQuery?.addEventListener?.('change', updatePreference);

    return () => {
      mediaQuery?.removeEventListener?.('change', updatePreference);
    };
  }, []);

  useEffect(() => {
    if (!wrapperRef.current || !contentRef.current) return;

    if (prefersReducedMotion) {
      resetScrollPresentation();
      smootherRef.current?.kill();
      smootherRef.current = null;
      return undefined;
    }

    const smoother = createSmoother({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      smootherRef,
    });

    return () => {
      smoother.kill();
      smootherRef.current = null;
      resetScrollPresentation();
    };
  }, [prefersReducedMotion]);

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
      smootherRef.current?.paused(isOpen);
      if (!isOpen) {
        syncScrollStateClasses(smootherRef.current, false);
      }
    };

    window.addEventListener(CONTEXT_MENU_VISIBILITY_EVENT, handleContextMenuVisibility);
    return () => window.removeEventListener(CONTEXT_MENU_VISIBILITY_EVENT, handleContextMenuVisibility);
  }, []);

  return (
    <div ref={wrapperRef} id={SMOOTH_WRAPPER_ID} className="h-full w-full">
      <div ref={contentRef} id={SMOOTH_CONTENT_ID} className="min-h-screen w-full">
        {children}
      </div>
    </div>
  );
}
