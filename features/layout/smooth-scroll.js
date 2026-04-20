'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { ReactLenis } from 'lenis/react';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTEXT_MENU_VISIBILITY_EVENT = 'tvizzie:context-menu-visibility';
const DETAIL_ROUTE_PREFIXES = ['/movie/', '/person/'];

// ─── Reduced Motion ──────────────────────────────────────────────────────────

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  return navigator.maxTouchPoints > 0;
}

// ─── Easing ──────────────────────────────────────────────────────────────────

/**
 * Expo-out blended with a cosine tail.
 *
 * Eski cubic ease-out'a kıyasla bu eğri ivmeyi daha uzun tutar ve
 * sonunda "tüy gibi" iner — Awwwards sitelerinin "soft landing" hissi budur.
 */
function premiumScrollEasing(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -10 * t) * Math.cos((t * Math.PI) / 3);
}

// ─── Options ─────────────────────────────────────────────────────────────────

const PREMIUM_SCROLL_OPTIONS = Object.freeze({
  anchors: {
    duration: 0.5,
    easing: premiumScrollEasing,
  },
  gestureOrientation: 'vertical',

  /**
   * THE en kritik parametre. 0.07 = agency standardı (Locomotive, GSAP).
   * Eski 0.2 mekanik hissettiriyordu; düşük lerp = lüks ağırlık hissi.
   * Reduced motion kullanıcıları için 1 (instant, lag yok).
   */
  lerp: prefersReducedMotion ? 1 : 0.07,

  overscroll: true,
  smoothWheel: !prefersReducedMotion,
  stopInertiaOnNavigate: true,

  /**
   * Touch cihazlarda ayrı profile geciyoruz; masaustunde bu path kapali kalir.
   */
  touchMultiplier: 1.5,
  syncTouch: false,
  syncTouchLerp: 0.075,

  /**
   * 0.8 → içerik "ağır" hissettiriyor, buz üzerinde kaymıyor.
   */
  wheelMultiplier: 0.8,

  autoResize: true,
});

const TOUCH_SCROLL_OPTIONS = Object.freeze({
  ...PREMIUM_SCROLL_OPTIONS,
  lerp: prefersReducedMotion ? 1 : 0.085,
  smoothWheel: false,
  syncTouch: !prefersReducedMotion,
  syncTouchLerp: 0.11,
  touchMultiplier: 1.1,
  wheelMultiplier: 1,
});

// ─── CSS Custom Property Bridge ───────────────────────────────────────────────

/**
 * Her Lenis tick'inde <html>'e scroll verisini CSS değişkeni olarak yazar.
 * Awwwards efektleri (skew, parallax, progress bar) buradan beslenir —
 * child component'larda sıfır ekstra JS gerekmiyor.
 *
 * Kullanılabilir değişkenler:
 *   --scroll-progress   [0 → 1]
 *   --scroll-velocity   [-1 → 1]  (normalize edilmiş, imzalı)
 *   --scroll-direction  [1 | -1]
 *
 * Örnek — velocity-driven skew (saf CSS):
 *   .card { transform: skewY(calc(var(--scroll-velocity) * 3deg)); }
 *
 * Örnek — progress bar:
 *   .bar { width: calc(var(--scroll-progress) * 100%); }
 */
function syncScrollCSSVars(lenis) {
  const root = document.documentElement;
  const maxScrollable = document.body.scrollHeight - window.innerHeight;

  const progress = maxScrollable > 0 ? lenis.scroll / maxScrollable : 0;
  const velocity = Math.max(-1, Math.min(1, lenis.velocity / 80));

  root.style.setProperty('--scroll-progress', progress.toFixed(5));
  root.style.setProperty('--scroll-velocity', velocity.toFixed(5));
  root.style.setProperty('--scroll-direction', String(lenis.direction ?? 0));
}

/**
 * <html> üzerinde scroll durumunu CSS class'larıyla yayınlar.
 * Header hide/show gibi efektler için IntersectionObserver gerekmez.
 *
 *   .is-scrolling
 *   .scrolling-down
 *   .scrolling-up
 */
function syncScrollStateClasses(lenis) {
  const html = document.documentElement;

  html.classList.toggle('is-scrolling', lenis.isScrolling);

  if (lenis.direction === 1) {
    html.classList.add('scrolling-down');
    html.classList.remove('scrolling-up');
  } else if (lenis.direction === -1) {
    html.classList.add('scrolling-up');
    html.classList.remove('scrolling-down');
  }
}

// ─── Navigation Helpers ───────────────────────────────────────────────────────

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

function forceScrollToTop(lenisRef) {
  window.scrollTo(0, 0);
  lenisRef.current?.lenis?.scrollTo(0, { immediate: true, force: true });
}

function scheduleScrollTopReset(lenisRef, { framePasses = 3, timeoutDelays = [] } = {}) {
  forceScrollToTop(lenisRef);

  let rafId = 0;
  let frameCount = 0;

  const runFrame = () => {
    forceScrollToTop(lenisRef);
    frameCount += 1;
    if (frameCount < framePasses) rafId = requestAnimationFrame(runFrame);
  };
  rafId = requestAnimationFrame(runFrame);

  const timeoutIds = timeoutDelays.map((delay) => window.setTimeout(() => forceScrollToTop(lenisRef), delay));

  return () => {
    cancelAnimationFrame(rafId);
    timeoutIds.forEach((id) => window.clearTimeout(id));
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SmoothScrollProvider({ children }) {
  const lenisRef = useRef(null);
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const lenisOptions = useMemo(
    () => (isTouchDevice() ? TOUCH_SCROLL_OPTIONS : PREMIUM_SCROLL_OPTIONS),
    []
  );

  // Her Lenis tick'inde CSS değişkenlerini ve class'ları güncelle
  useEffect(() => {
    const lenis = lenisRef.current?.lenis;
    if (!lenis) return;

    const onScroll = () => {
      syncScrollCSSVars(lenis);
      syncScrollStateClasses(lenis);
    };

    lenis.on('scroll', onScroll);
    return () => lenis.off('scroll', onScroll);
  }, []);

  // Hard reload'da pozisyonu sıfırla
  useEffect(() => {
    if (!isReloadNavigation()) return;
    return scheduleScrollTopReset(lenisRef, {
      framePasses: 2,
      timeoutDelays: [120],
    });
  }, []);

  // Detail route'a geçişte pozisyonu sıfırla
  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    if (!shouldResetForDetailRoute(previousPathname, pathname)) return;
    return scheduleScrollTopReset(lenisRef, {
      framePasses: 4,
      timeoutDelays: [120, 260],
    });
  }, [pathname]);

  // Context menu açıkken scroll'u durdur
  useEffect(() => {
    const handleContextMenuVisibility = (event) => {
      const isOpen = Boolean(event?.detail?.isOpen);
      const lenis = lenisRef.current?.lenis;
      if (!lenis) return;
      isOpen ? lenis.stop() : lenis.start();
    };

    window.addEventListener(CONTEXT_MENU_VISIBILITY_EVENT, handleContextMenuVisibility);
    return () => window.removeEventListener(CONTEXT_MENU_VISIBILITY_EVENT, handleContextMenuVisibility);
  }, []);

  return (
    <ReactLenis ref={lenisRef} root options={lenisOptions}>
      {children}
    </ReactLenis>
  );
}
