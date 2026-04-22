'use client';

import { MovieClipReveal } from '@/app/(media)/movie/[id]/motion';
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  ANIMATION_STAGGER,
  ANIMATION_VIEWPORTS,
  buildRevealMotion,
  createPanelMotion,
  createSurfaceItemMotion,
  resolvePhaseDelay,
  useInitialRevealEnabled,
} from '@/core/animation';
import { motion, useReducedMotion } from 'framer-motion';

const PERSON_ROUTE_PHASES = Object.freeze({
  sidebar: Object.freeze({
    duration: ANIMATION_DURATIONS.SIDEBAR,
    ease: ANIMATION_EASINGS.QUINT_OUT,
    lead: 0.05,
    offset: Object.freeze({ x: -42 }),
    scale: 0.962,
  }),
  hero: Object.freeze({
    duration: ANIMATION_DURATIONS.HERO,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    lead: 0.12,
    offset: Object.freeze({ y: 52 }),
    scale: 0.97,
  }),
  section: Object.freeze({
    duration: ANIMATION_DURATIONS.SECTION,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    lead: 0.18,
    offset: Object.freeze({ y: 36 }),
    scale: 0.978,
  }),
  surface: Object.freeze({
    duration: ANIMATION_DURATIONS.PANEL,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    lead: 0.12,
    offset: Object.freeze({ y: 18 }),
    scale: 0.94,
  }),
});

export const PERSON_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    sectionDelay: 0.18,
    itemStagger: ANIMATION_STAGGER.TIGHT,
    yearGroupStagger: 0.088,
  }),
  scroll: Object.freeze({
    sectionViewport: ANIMATION_VIEWPORTS.section,
  }),
  sharedElements: Object.freeze({
    portrait: Object.freeze({
      transition: Object.freeze({ type: 'spring', stiffness: 320, damping: 30, mass: 0.82 }),
    }),
  }),
});

function PersonReveal({
  animateOnView = false,
  axis = 'y',
  children,
  className = '',
  delay = 0,
  distance,
  once = true,
  phase = 'section',
}) {
  const reduceMotion = useReducedMotion();
  const phaseConfig = PERSON_ROUTE_PHASES[phase] || PERSON_ROUTE_PHASES.section;
  const resolvedDelay = resolvePhaseDelay({
    delay,
    lead: phaseConfig.lead,
    reduceMotion,
  });
  const motionProps = buildRevealMotion({
    axis,
    delay: resolvedDelay,
    distance: distance ?? (phaseConfig.offset?.[axis] ?? 24),
    duration: phaseConfig.duration,
    ease: phaseConfig.ease,
    offset: phaseConfig.offset,
    reduceMotion,
    scale: phaseConfig.scale,
  });

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={motionProps.initial}
        whileInView={motionProps.animate}
        viewport={{ ...PERSON_ROUTE_MOTION.scroll.sectionViewport, once }}
        transition={motionProps.transition}
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
      transition={motionProps.transition}
      style={motionProps.style}
    >
      {children}
    </motion.div>
  );
}

export function PersonSidebarReveal({ children, className = '', delay = 0 }) {
  return (
    <PersonReveal className={className} delay={delay} phase="sidebar">
      {children}
    </PersonReveal>
  );
}

export function PersonHeroReveal({ children, className = '', delay = 0 }) {
  return (
    <PersonReveal className={className} delay={delay} phase="hero">
      {children}
    </PersonReveal>
  );
}

export function PersonSectionReveal({
  children,
  className = '',
  delay = 0,
  once = true,
  animateOnView = false,
}) {
  return (
    <PersonReveal className={className} delay={delay} once={once} animateOnView={animateOnView} phase="section">
      {children}
    </PersonReveal>
  );
}

export function PersonSurfaceReveal({
  children,
  className = '',
  delay = 0,
  once = true,
  animateOnView = false,
}) {
  return (
    <PersonReveal className={className} delay={delay} once={once} animateOnView={animateOnView} phase="surface">
      {children}
    </PersonReveal>
  );
}

export { MovieClipReveal as PersonClipReveal };

export function getPersonSurfaceItemMotion(options = {}) {
  return createSurfaceItemMotion({
    ...options,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    scale: options.scale ?? 0.976,
  });
}

export function getPersonSurfacePanelMotion({ reduceMotion = false } = {}) {
  return createPanelMotion({
    reduceMotion,
    duration: ANIMATION_DURATIONS.PANEL,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    exitDuration: ANIMATION_DURATIONS.PANEL * 0.55,
    exitEase: ANIMATION_EASINGS.EXPO_IN_OUT,
    initialScale: 0.976,
    exitScale: 0.988,
  });
}

export function useInitialPersonItemRevealEnabled() {
  return useInitialRevealEnabled();
}
