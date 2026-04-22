'use client';

import { motion, useReducedMotion } from 'framer-motion';

import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  ANIMATION_STAGGER,
  ANIMATION_VIEWPORTS,
  AnimationSequenceGroup,
  buildClipRevealMotion,
  buildRevealMotion,
  createPanelMotion,
  createSurfaceItemMotion,
  resolvePhaseDelay,
  resolveSequenceDelay,
  useAnimationSequence,
  useInitialRevealEnabled,
} from '@/core/animation';

const MOVIE_PHASES = Object.freeze({
  sidebar: Object.freeze({
    duration: ANIMATION_DURATIONS.SIDEBAR,
    ease: ANIMATION_EASINGS.QUINT_OUT,
    lead: 0.04,
    offset: Object.freeze({ x: -48 }),
    scale: 0.962,
  }),
  hero: Object.freeze({
    duration: ANIMATION_DURATIONS.HERO,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    lead: 0.1,
    offset: Object.freeze({ y: 60 }),
    scale: 0.97,
  }),
  section: Object.freeze({
    duration: ANIMATION_DURATIONS.SECTION,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    lead: 0.18,
    offset: Object.freeze({ y: 48 }),
    scale: 0.978,
  }),
  surface: Object.freeze({
    duration: ANIMATION_DURATIONS.PANEL,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    lead: 0.12,
    offset: Object.freeze({ y: 20 }),
    scale: 0.94,
  }),
});

export const MOVIE_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    sectionDelay: 0.12,
    groupStagger: 0.18,
    itemStagger: ANIMATION_STAGGER.CASCADE,
  }),
  scroll: Object.freeze({
    sectionViewport: ANIMATION_VIEWPORTS.section,
    heroViewport: ANIMATION_VIEWPORTS.relaxed,
  }),
  sharedElements: Object.freeze({
    poster: Object.freeze({
      layout: 'position',
      transition: Object.freeze({ type: 'spring', stiffness: 320, damping: 30, mass: 0.82 }),
    }),
    backdrop: Object.freeze({
      transition: Object.freeze({ duration: 0.6, ease: ANIMATION_EASINGS.EXPO_OUT }),
    }),
  }),
});

function MovieReveal({
  animateOnView = false,
  axis = 'y',
  children,
  className = '',
  delay = 0,
  distance,
  groupIndex = 0,
  once = true,
  phase = 'section',
}) {
  const reduceMotion = useReducedMotion();
  const sequence = useAnimationSequence();
  const phaseConfig = MOVIE_PHASES[phase] || MOVIE_PHASES.section;
  const resolvedDelay = resolvePhaseDelay({
    delay: delay + resolveSequenceDelay({ delay: 0, groupIndex, sequence, reduceMotion }),
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
        viewport={{ ...MOVIE_ROUTE_MOTION.scroll.sectionViewport, once }}
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
      animate={sequence ? (sequence.isActive ? motionProps.animate : motionProps.initial) : motionProps.animate}
      transition={motionProps.transition}
      style={motionProps.style}
    >
      {children}
    </motion.div>
  );
}

export function MovieSectionGroup({ children, className = '', delay = 0, staggerStep = ANIMATION_STAGGER.GROUP }) {
  return (
    <AnimationSequenceGroup
      className={className}
      delay={delay}
      staggerStep={staggerStep}
      viewport={MOVIE_ROUTE_MOTION.scroll.sectionViewport}
    >
      {children}
    </AnimationSequenceGroup>
  );
}

export function MovieClipReveal({
  children,
  className = '',
  delay = 0,
  animateOnView = true,
  once = true,
  direction = 'up',
}) {
  const reduceMotion = useReducedMotion();
  const motionProps = buildClipRevealMotion({
    delay,
    direction,
    duration: ANIMATION_DURATIONS.CLIP,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    reduceMotion,
  });

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={motionProps.initial}
        whileInView={motionProps.animate}
        viewport={{ ...MOVIE_ROUTE_MOTION.scroll.sectionViewport, once }}
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

export function MovieSidebarReveal({ children, className = '', delay = 0 }) {
  return (
    <MovieReveal className={className} delay={delay} phase="sidebar">
      {children}
    </MovieReveal>
  );
}

export function MovieHeroReveal({ children, className = '', delay = 0 }) {
  return (
    <MovieReveal className={className} delay={delay} phase="hero">
      {children}
    </MovieReveal>
  );
}

export function MovieSectionReveal({
  children,
  className = '',
  delay = 0,
  once = true,
  animateOnView = true,
  groupIndex = 0,
}) {
  return (
    <MovieReveal
      className={className}
      delay={delay}
      once={once}
      animateOnView={animateOnView}
      groupIndex={groupIndex}
      phase="section"
    >
      {children}
    </MovieReveal>
  );
}

export function MovieSurfaceReveal({
  children,
  className = '',
  delay = 0,
  once = true,
  animateOnView = true,
  groupIndex = 0,
}) {
  return (
    <MovieReveal
      className={className}
      delay={delay}
      once={once}
      animateOnView={animateOnView}
      groupIndex={groupIndex}
      phase="surface"
    >
      {children}
    </MovieReveal>
  );
}

export function getSurfaceItemMotion(options = {}) {
  return createSurfaceItemMotion({
    ...options,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    scale: options.scale ?? 0.976,
  });
}

export function getSurfacePanelMotion({ reduceMotion = false } = {}) {
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

export function useInitialItemRevealEnabled() {
  return useInitialRevealEnabled();
}
