'use client';

/**
 * motion.jsx — AWWWARDS-grade reveal system
 *
 * Core principles:
 *  1. Compositor-only  — only `transform` + `opacity`. No blur, no layout props.
 *  2. Single-duration  — x / y / scale share one duration so they never jitter.
 *  3. Expo-out easing  — the signature curve of award-winning interfaces.
 *  4. Theatrical offsets — 40–60 px give reveals a sense of weight.
 *  5. Loose stagger    — 0.06–0.11 s steps let groups breathe.
 *  6. Clip variant     — editorial clipPath reveals for headings / panels.
 *  7. Strict will-change teardown — set before, cleared via transitionEnd.
 */

import { useEffect, useRef } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/core/utils';

// ---------------------------------------------------------------------------
// Easing catalogue — raw cubic-bezier arrays for Framer Motion
// ---------------------------------------------------------------------------
const EASE = Object.freeze({
  /** The hero curve. Fast takeoff, long buttery tail. */
  EXPO_OUT: [0.16, 1, 0.3, 1],
  /** Cinematic in-out used for panels / overlays. */
  EXPO_INOUT: [0.87, 0, 0.13, 1],
  /** Subtle overshoot for interactive / hover reveals. */
  BACK_OUT: [0.34, 1.4, 0.64, 1],
  /** Smooth deceleration — sidebars, drawers. */
  QUINT_OUT: [0.22, 1, 0.36, 1],
  /** Fast linear fade used only for opacity in reduced-motion. */
  LINEAR: [0, 0, 1, 0],
  /** Standard ease-out for micro-interactions. */
  EASE_OUT: [0, 0, 0.2, 1],
});

// ---------------------------------------------------------------------------
// Timing constants (seconds)
// All durations are intentionally longer than "normal" UI — AWWWARDS sites
// treat animation as pacing, not merely decoration.
// ---------------------------------------------------------------------------
const T = Object.freeze({
  REDUCED: 0.2, // prefers-reduced-motion fallback
  SIDEBAR: 1.1, // off-canvas navigation / persistent panels
  HERO: 1.4, // above-the-fold, first impression
  SECTION: 1.1, // viewport-triggered section reveals
  ITEM: 0.72, // list / grid items (before stagger)
  GROUP: 0.84, // card groups
  PANEL: 0.6, // modals, toasts, dropdowns
  CLIP: 1.2, // editorial clipPath reveals
});

// ---------------------------------------------------------------------------
// Stagger constants (seconds)
// ---------------------------------------------------------------------------
const STAGGER = Object.freeze({
  ITEM_STEP: 0.06, // per-item delay increment
  GROUP_STEP: 0.11, // per-group delay increment
  MAX_DELAY: 0.72, // cap — prevents the last item arriving way too late
  PHASE_LEAD: Object.freeze({
    sidebar: 0.04,
    hero: 0.1,
    section: 0.18,
  }),
});

// ---------------------------------------------------------------------------
// Phase visual configuration
// ---------------------------------------------------------------------------
const PHASE = Object.freeze({
  sidebar: Object.freeze({ ease: EASE.QUINT_OUT, offset: { x: -48 }, scale: 0.97 }),
  hero: Object.freeze({ ease: EASE.EXPO_OUT, offset: { y: 60 }, scale: 0.978 }),
  section: Object.freeze({ ease: EASE.EXPO_OUT, offset: { y: 48 }, scale: 0.984 }),
});

// ---------------------------------------------------------------------------
// Viewport trigger config for whileInView
// ---------------------------------------------------------------------------
const VIEWPORT = {
  once: true,
  amount: 0.14,
  margin: '0px 0px -6% 0px',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveStaggerDelay({ index = 0, groupIndex = 0, itemStep, groupStep, reduceMotion }) {
  if (reduceMotion) return 0;
  return clamp(groupIndex * groupStep + index * itemStep, 0, STAGGER.MAX_DELAY);
}

function resolvePhasedDelay(delay, phase, reduceMotion) {
  if (reduceMotion) return 0;
  const lead = STAGGER.PHASE_LEAD[phase] ?? 0;
  return clamp(lead + delay, 0, STAGGER.MAX_DELAY);
}

/**
 * Single-duration transition — x / y / scale all share the same timing so
 * they hit their target together, preventing the subtle jitter that arises
 * when axes resolve at different moments.
 */
function buildRevealTransition({ delay, duration, ease, reduceMotion }) {
  if (reduceMotion) {
    return { duration: T.REDUCED, delay: 0, ease: EASE.EASE_OUT };
  }
  return {
    opacity: { duration: duration * 0.65, delay, ease: EASE.EASE_OUT },
    // x / y / scale share the same duration + ease — no jitter
    scale: { duration, delay, ease },
    x: { duration, delay, ease },
    y: { duration, delay, ease },
  };
}

function buildWillChange(axes = []) {
  const props = ['opacity', ...axes.map((a) => (a === 'x' || a === 'y' ? 'transform' : a))];
  return [...new Set(props)].join(', ');
}

// ---------------------------------------------------------------------------
// Core reveal primitive
// ---------------------------------------------------------------------------
function Reveal({
  animateOnView = false,
  axis = 'y',
  children,
  className = '',
  delay = 0,
  direction = 1, // 1 = normal, -1 = reversed (enter from opposite side)
  distance, // px — falls back to phase default
  duration,
  ease,
  offset, // explicit {x, y} override
  once = true,
  phase = 'section',
  scale,
}) {
  const reduceMotion = useReducedMotion();
  const cfg = PHASE[phase] ?? PHASE.section;

  const resolvedDuration = duration ?? T[phase.toUpperCase()] ?? T.SECTION;
  const resolvedEase = ease ?? cfg.ease;
  const resolvedScale = scale ?? cfg.scale;

  // Build initial offset
  const resolvedOffset = (() => {
    if (offset) return { ...offset };
    if (distance !== undefined) return { [axis]: direction * distance };
    const phaseOffset = cfg.offset ?? { y: 40 };
    // Apply direction to every axis value in the phase offset
    return Object.fromEntries(Object.entries(phaseOffset).map(([k, v]) => [k, direction * v]));
  })();

  const resetOffset = Object.fromEntries(Object.keys(resolvedOffset).map((k) => [k, 0]));
  const axes = Object.keys(resolvedOffset); // ['x'] or ['y']

  const phasedDelay = resolvePhasedDelay(delay, phase, reduceMotion);

  const initial = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: resolvedScale, ...resolvedOffset };

  const animate = reduceMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        scale: 1,
        ...resetOffset,
        transitionEnd: { willChange: 'auto', transform: 'none' },
      };

  const transition = buildRevealTransition({
    delay: phasedDelay,
    duration: resolvedDuration,
    ease: resolvedEase,
    reduceMotion,
  });

  const style = reduceMotion ? undefined : { willChange: buildWillChange(axes) };

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={animate}
        viewport={{ ...VIEWPORT, once }}
        transition={transition}
        style={style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div className={className} initial={initial} animate={animate} transition={transition} style={style}>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Clip reveal — editorial / typographic
//
// Wraps content in an overflow-hidden mask and animates clipPath from the
// bottom edge upward. This is the "magazine cover" technique seen across
// award-winning sites (e.g. Basement Studio, Active Theory, Resn).
// clipPath is GPU-accelerated on Chromium and Safari 16.4+.
// ---------------------------------------------------------------------------
export function MovieClipReveal({
  children,
  className = '',
  delay = 0,
  animateOnView = true,
  once = true,
  direction = 'up', // 'up' | 'down' | 'left' | 'right'
}) {
  const reduceMotion = useReducedMotion();

  const CLIP_INITIAL = {
    up: 'inset(100% 0% 0% 0%)',
    down: 'inset(0% 0% 100% 0%)',
    left: 'inset(0% 100% 0% 0%)',
    right: 'inset(0% 0% 0% 100%)',
  };

  const initial = reduceMotion ? { opacity: 0 } : { clipPath: CLIP_INITIAL[direction] ?? CLIP_INITIAL.up, opacity: 1 };

  const animate = reduceMotion
    ? { opacity: 1 }
    : {
        clipPath: 'inset(0% 0% 0% 0%)',
        opacity: 1,
        transitionEnd: { clipPath: 'none', willChange: 'auto' },
      };

  const transition = reduceMotion
    ? { duration: T.REDUCED, ease: EASE.EASE_OUT }
    : {
        clipPath: {
          duration: T.CLIP,
          delay: clamp(delay, 0, STAGGER.MAX_DELAY),
          ease: EASE.EXPO_OUT,
        },
        opacity: { duration: 0, delay: 0 },
      };

  const style = reduceMotion ? undefined : { willChange: 'clip-path', overflow: 'hidden' };

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={animate}
        viewport={VIEWPORT}
        transition={transition}
        style={style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div className={className} initial={initial} animate={animate} transition={transition} style={style}>
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Surface item motion — for lists, grids, and card children
// Returns a plain motion props object so callers spread it themselves:
//   <motion.li {...getSurfaceItemMotion({ index })} />
// ---------------------------------------------------------------------------
export function getSurfaceItemMotion({
  axis = 'y',
  delayStep = STAGGER.ITEM_STEP,
  distance = 28,
  duration = T.ITEM,
  enabled = true,
  groupDelayStep = STAGGER.GROUP_STEP,
  groupIndex = 0,
  index = 0,
  reduceMotion = false,
  scale = 0.982,
}) {
  const delay = resolveStaggerDelay({
    index,
    groupIndex,
    itemStep: delayStep,
    groupStep: groupDelayStep,
    reduceMotion,
  });
  const initial = reduceMotion ? { opacity: 0 } : { opacity: 0, scale, [axis]: distance };

  return {
    initial: enabled ? initial : false,
    animate: { opacity: 1, scale: 1, [axis]: 0 },
    transition: buildRevealTransition({ delay, duration, ease: EASE.EXPO_OUT, reduceMotion }),
  };
}

export function useInitialItemRevealEnabled() {
  const shouldAnimateRef = useRef(true);

  useEffect(() => {
    shouldAnimateRef.current = false;
  }, []);

  return shouldAnimateRef.current;
}

// ---------------------------------------------------------------------------
// Panel motion — modals, dropdowns, sheets
// ---------------------------------------------------------------------------
export function getSurfacePanelMotion({ reduceMotion = false }) {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: T.REDUCED, ease: EASE.EASE_OUT },
    };
  }

  return {
    initial: { opacity: 0, y: 24, scale: 0.984 },
    animate: { opacity: 1, y: 0, scale: 1, transitionEnd: { willChange: 'auto', transform: 'none' } },
    exit: { opacity: 0, y: -14, scale: 0.99, transition: { duration: T.PANEL * 0.55, ease: EASE.EXPO_INOUT } },
    transition: { duration: T.PANEL, ease: EASE.EXPO_OUT },
  };
}

// ---------------------------------------------------------------------------
// Named phase exports — drop-in replacements for the original API
// ---------------------------------------------------------------------------

/** Sidebar / off-canvas navigation — slides in from the left. */
export function MovieSidebarReveal({ children, className = '', delay = 0 }) {
  return (
    <Reveal className={className} delay={delay} duration={T.SIDEBAR} phase="sidebar">
      {children}
    </Reveal>
  );
}

/**
 * Hero reveal — above-the-fold, first impression.
 * Long expo-out duration (1.40 s) with a generous 60 px offset.
 */
export function MovieHeroReveal({ children, className = '', delay = 0 }) {
  return (
    <Reveal className={className} delay={delay} duration={T.HERO} phase="hero" axis="y">
      {children}
    </Reveal>
  );
}

/**
 * Section reveal — viewport-triggered for below-the-fold content.
 * Defaults to animating once and only when 14 % of the element is visible.
 */
export function MovieSectionReveal({ children, className = '', delay = 0, once = true, animateOnView = true }) {
  return (
    <Reveal
      className={className}
      animateOnView={animateOnView}
      axis="y"
      delay={delay}
      duration={T.SECTION}
      once={once}
      phase="section"
    >
      {children}
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// Skeleton placeholder — unchanged API surface
// ---------------------------------------------------------------------------
export function MovieSectionSkeleton({ className = '' }) {
  return (
    <div className={cn('mt-20 flex w-full flex-col space-y-3 p-4', className)}>
      {Array.from({ length: 11 }, (_, i) => (
        <div key={i} className="skeleton-block-soft h-4 w-full" />
      ))}
    </div>
  );
}
