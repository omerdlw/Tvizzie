'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { EASING } from '@/core/constants';
import { cn } from '@/core/utils';

const SECTION_VIEWPORT = {
  once: true,
  amount: 0.18,
  margin: '0px 0px -10% 0px',
};

const REVEAL_TIMING = Object.freeze({
  reducedDuration: 0.22,
  defaultDuration: 0.72,
  sidebarDuration: 1.04,
  heroDuration: 0.72,
  sectionDuration: 0.76,
});

const REVEAL_SYNC = Object.freeze({
  delayScale: 0.9,
  maxDelay: 0.68,
  phaseLead: Object.freeze({
    sidebar: 0.03,
    hero: 0.08,
    section: 0.12,
  }),
});

const REVEAL_BLUR = 5;

function buildAxisOffset(axis, distance) {
  if (axis === 'x') {
    return { x: distance };
  }

  return { y: distance };
}

function resolveSynchronizedDelay(delay, phase, reduceMotion) {
  if (reduceMotion) {
    return 0;
  }

  const lead = REVEAL_SYNC.phaseLead[phase] ?? 0;
  const syncedDelay = lead + delay * REVEAL_SYNC.delayScale;

  return Math.min(REVEAL_SYNC.maxDelay, Math.max(0, syncedDelay));
}

function buildRevealTransition({ delay, duration, phase, reduceMotion }) {
  const syncedDelay = resolveSynchronizedDelay(delay, phase, reduceMotion);
  const isSidebarPhase = phase === 'sidebar';
  const springConfig = isSidebarPhase
    ? { stiffness: 114, damping: 38, mass: 1.12 }
    : { stiffness: 165, damping: 32, mass: 1 };

  if (reduceMotion) {
    return {
      duration: REVEAL_TIMING.reducedDuration,
      delay: 0,
      ease: EASING.EASE_OUT,
    };
  }

  return {
    opacity: {
      duration: Math.max(0.34, duration * 0.9),
      delay: syncedDelay,
      ease: EASING.EASE_OUT,
    },
    filter: {
      duration: Math.max(0.3, duration * 0.72),
      delay: syncedDelay,
      ease: EASING.EASE_OUT,
    },
    scale: {
      duration: Math.max(0.36, duration * 0.98),
      delay: syncedDelay,
      ease: EASING.SMOOTH,
    },
    x: {
      type: 'spring',
      ...springConfig,
      delay: syncedDelay,
    },
    y: {
      type: 'spring',
      ...springConfig,
      delay: syncedDelay,
    },
  };
}

function MovieReveal({
  animateOnView = false,
  axis = 'y',
  children,
  className = '',
  delay = 0,
  direction = 1,
  distance = 30,
  duration = REVEAL_TIMING.defaultDuration,
  once = true,
  phase = 'section',
}) {
  const reduceMotion = useReducedMotion();
  const motionDistance = direction * distance;
  const initial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.992, filter: `blur(${REVEAL_BLUR}px)`, ...buildAxisOffset(axis, motionDistance) };
  const target = reduceMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        ...buildAxisOffset(axis, 0),
        transitionEnd: {
          filter: 'none',
          transform: 'none',
          willChange: 'auto',
        },
      };
  const transition = buildRevealTransition({ delay, duration, phase, reduceMotion });
  const style = reduceMotion ? undefined : { willChange: 'transform, opacity, filter' };

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={target}
        viewport={{ ...SECTION_VIEWPORT, once }}
        transition={transition}
        style={style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div className={className} initial={initial} animate={target} transition={transition} style={style}>
      {children}
    </motion.div>
  );
}

export function MovieSidebarReveal({ children, className = '', delay = 0 }) {
  return (
    <MovieReveal
      className={className}
      axis="x"
      direction={-1}
      distance={54}
      delay={delay}
      duration={REVEAL_TIMING.sidebarDuration}
      phase="sidebar"
    >
      {children}
    </MovieReveal>
  );
}

export function MovieHeroReveal({ children, className = '', delay = 0 }) {
  return (
    <MovieReveal
      className={className}
      axis="y"
      distance={26}
      delay={delay}
      duration={REVEAL_TIMING.heroDuration}
      phase="hero"
    >
      {children}
    </MovieReveal>
  );
}

export function MovieSectionReveal({ children, className = '', delay = 0, once = true, animateOnView = true }) {
  return (
    <MovieReveal
      className={className}
      animateOnView={animateOnView}
      axis="y"
      distance={26}
      delay={delay}
      duration={REVEAL_TIMING.sectionDuration}
      once={once}
      phase="section"
    >
      {children}
    </MovieReveal>
  );
}

export function MovieSectionSkeleton({ className = '' }) {
  return (
    <div className={cn('mt-20 flex w-full flex-col space-y-3 p-4', className)}>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
      <div className="skeleton-block-soft h-4 w-full rounded-[12px]"></div>
    </div>
  );
}
