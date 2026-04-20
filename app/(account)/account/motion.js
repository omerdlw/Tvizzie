'use client';

import { motion, useReducedMotion } from 'framer-motion';

import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  ANIMATION_SPRINGS,
  ANIMATION_STAGGER,
  ANIMATION_VIEWPORTS,
  buildRevealMotion,
} from '@/core/animation';

export const ACCOUNT_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    heroDelay: 0.06,
    navDelay: 0.04,
    sectionDelay: 0.1,
    delayScale: 0.9,
    maxDelay: 0.62,
  }),
  scroll: Object.freeze({
    sectionViewport: Object.freeze({
      ...ANIMATION_VIEWPORTS.relaxed,
      amount: 0.08,
      margin: '0px 0px 12% 0px',
    }),
  }),
  sharedElements: Object.freeze({
    profileMedia: Object.freeze({
      transition: Object.freeze({ type: 'spring', stiffness: 320, damping: 30, mass: 0.82 }),
    }),
    segmentedControl: ANIMATION_SPRINGS.SEGMENTED_CONTROL,
  }),
});

const ACCOUNT_PHASES = Object.freeze({
  hero: Object.freeze({
    duration: 0.64,
    distance: 28,
    lead: 0.06,
    scale: 0.994,
  }),
  nav: Object.freeze({
    duration: 0.46,
    distance: 18,
    lead: 0.04,
    scale: 0.994,
  }),
  section: Object.freeze({
    duration: 0.52,
    distance: 24,
    lead: 0.1,
    scale: 0.994,
  }),
});

function getSyncedDelay(delay, phase, reduceMotion) {
  if (reduceMotion) {
    return 0;
  }

  const phaseConfig = ACCOUNT_PHASES[phase] || ACCOUNT_PHASES.section;

  return Math.min(
    ACCOUNT_ROUTE_MOTION.orchestration.maxDelay,
    Math.max(0, phaseConfig.lead + delay * ACCOUNT_ROUTE_MOTION.orchestration.delayScale)
  );
}

function AccountReveal({
  animateOnView = false,
  children,
  className = '',
  delay = 0,
  once = true,
  phase = 'section',
}) {
  const reduceMotion = useReducedMotion();
  const phaseConfig = ACCOUNT_PHASES[phase] || ACCOUNT_PHASES.section;
  const syncedDelay = getSyncedDelay(delay, phase, reduceMotion);
  const motionProps = buildRevealMotion({
    delay: syncedDelay,
    distance: phaseConfig.distance,
    duration: phaseConfig.duration,
    ease: ANIMATION_EASINGS.SMOOTH,
    reduceMotion,
    scale: phaseConfig.scale,
  });
  const transition = reduceMotion
    ? { duration: ANIMATION_DURATIONS.REDUCED, delay: 0, ease: ANIMATION_EASINGS.EASE_OUT }
    : {
        opacity: {
          duration: Math.max(0.28, phaseConfig.duration * 0.85),
          delay: syncedDelay,
          ease: ANIMATION_EASINGS.EASE_OUT,
        },
        y: {
          type: 'spring',
          ...(phase === 'nav' ? ANIMATION_SPRINGS.GENTLE : ANIMATION_SPRINGS.REVEAL),
          delay: syncedDelay,
        },
        scale: {
          duration: Math.max(0.28, phaseConfig.duration * 0.92),
          delay: syncedDelay,
          ease: ANIMATION_EASINGS.SMOOTH,
        },
      };

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={motionProps.initial}
        whileInView={motionProps.animate}
        viewport={{ ...ACCOUNT_ROUTE_MOTION.scroll.sectionViewport, once }}
        transition={transition}
        style={motionProps.style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={motionProps.initial}
      animate={motionProps.animate}
      transition={transition}
      style={motionProps.style}
    >
      {children}
    </motion.div>
  );
}

export function AccountHeroReveal({ children, className = '' }) {
  return (
    <AccountReveal className={className} phase="hero">
      {children}
    </AccountReveal>
  );
}

export function AccountNavReveal({ children, className = '' }) {
  return (
    <AccountReveal className={className} phase="nav">
      {children}
    </AccountReveal>
  );
}

export function AccountSectionReveal({ animateOnView = false, children, className = '', delay = 0, once = true }) {
  return (
    <AccountReveal
      className={className}
      phase="section"
      delay={delay}
      animateOnView={animateOnView}
      once={once}
    >
      {children}
    </AccountReveal>
  );
}

export const ACCOUNT_NAV_ITEM_STAGGER = Object.freeze({
  step: 0.03,
  duration: 0.32,
});

export const ACCOUNT_NAV_LABEL_TRANSITION = Object.freeze({
  duration: 0.24,
  ease: ANIMATION_EASINGS.SMOOTH,
});

export const ACCOUNT_NAV_CHIP_TRANSITION = Object.freeze({
  spring: ANIMATION_SPRINGS.SEGMENTED_CONTROL,
  itemStep: ANIMATION_STAGGER.MICRO,
});
