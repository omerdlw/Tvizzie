'use client';

import { motion } from 'framer-motion';

import {
  ANIMATION_PROFILES,
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

const MOVIE_SOFT_PROFILE = ANIMATION_PROFILES.SOFT;

export const MOVIE_ROUTE_TIMING = Object.freeze({
  hero: Object.freeze({
    backgroundDelay: 0.06,
    containerDelay: 0.11,
    titleDelay: 0.14,
    titleClipDelay: 0.1,
    titleDuration: MOVIE_SOFT_PROFILE.durations.text,
    socialProofDelay: 0.2,
    taglineDelay: 0.23,
    overviewDelay: 0.3,
  }),
  sections: Object.freeze({
    cast: 0.1,
    reviews: 0.08,
    groupDelay: 0.08,
    groupStagger: MOVIE_SOFT_PROFILE.stagger.group,
  }),
  reviewsPage: Object.freeze({
    sidebar: 0.04,
    title: 0.08,
    titleDuration: 0.66,
    reviews: 0.12,
  }),
});

export const MOVIE_BACKGROUND_ANIMATION = Object.freeze({
  exitDurationFactor: 0.52,
  transition: Object.freeze({
    duration: 0.9,
    delay: MOVIE_ROUTE_TIMING.hero.backgroundDelay,
    ease: MOVIE_SOFT_PROFILE.easings.reveal,
  }),
  initial: Object.freeze({
    opacity: 0,
    scale: 1.08,
  }),
  animate: Object.freeze({
    opacity: 1,
    scale: 1,
    y: 0,
    transitionEnd: Object.freeze({
      willChange: 'auto',
    }),
  }),
  exit: Object.freeze({
    opacity: 0,
    scale: 1.03,
  }),
});

const MOVIE_PHASES = Object.freeze({
  sidebar: Object.freeze({
    duration: MOVIE_SOFT_PROFILE.durations.sidebar,
    ease: MOVIE_SOFT_PROFILE.easings.sidebar,
    lead: 0.04,
    offset: Object.freeze({ x: -MOVIE_SOFT_PROFILE.offsets.sidebarX }),
    scale: MOVIE_SOFT_PROFILE.scales.sidebar,
  }),
  hero: Object.freeze({
    duration: MOVIE_SOFT_PROFILE.durations.hero,
    ease: MOVIE_SOFT_PROFILE.easings.reveal,
    lead: 0.1,
    offset: Object.freeze({ y: MOVIE_SOFT_PROFILE.offsets.heroY }),
    scale: MOVIE_SOFT_PROFILE.scales.hero,
  }),
  section: Object.freeze({
    duration: MOVIE_SOFT_PROFILE.durations.section,
    ease: MOVIE_SOFT_PROFILE.easings.reveal,
    lead: 0.18,
    offset: Object.freeze({ y: MOVIE_SOFT_PROFILE.offsets.sectionY }),
    scale: MOVIE_SOFT_PROFILE.scales.section,
  }),
  surface: Object.freeze({
    duration: MOVIE_SOFT_PROFILE.durations.panel,
    ease: MOVIE_SOFT_PROFILE.easings.reveal,
    lead: 0.12,
    offset: Object.freeze({ y: MOVIE_SOFT_PROFILE.offsets.surfaceY }),
    scale: MOVIE_SOFT_PROFILE.scales.surface,
  }),
});

export const MOVIE_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    sectionDelay: 0.12,
    groupStagger: MOVIE_ROUTE_TIMING.sections.groupStagger,
    itemStagger: MOVIE_SOFT_PROFILE.stagger.item,
  }),
  scroll: Object.freeze({
    sectionViewport: ANIMATION_VIEWPORTS.section,
    heroViewport: ANIMATION_VIEWPORTS.relaxed,
  }),
  sharedElements: Object.freeze({
    poster: Object.freeze({
      layout: 'position',
      transition: Object.freeze({ type: 'spring', stiffness: 240, damping: 34, mass: 1 }),
    }),
    backdrop: Object.freeze({
      transition: Object.freeze({ duration: 0.78, ease: MOVIE_SOFT_PROFILE.easings.reveal }),
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
  const sequence = useAnimationSequence();
  const phaseConfig = MOVIE_PHASES[phase] || MOVIE_PHASES.section;
  const resolvedDelay = resolvePhaseDelay({
    delay: delay + resolveSequenceDelay({ delay: 0, groupIndex, sequence }),
    lead: phaseConfig.lead,
  });
  const motionProps = buildRevealMotion({
    axis,
    delay: resolvedDelay,
    distance: distance ?? (phaseConfig.offset?.[axis] ?? 24),
    duration: phaseConfig.duration,
    ease: phaseConfig.ease,
    opacityDurationFactor: MOVIE_SOFT_PROFILE.transition.opacityDurationFactor,
    opacityEase: MOVIE_SOFT_PROFILE.easings.opacity,
    offset: phaseConfig.offset,
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

export function MovieSectionGroup({
  children,
  className = '',
  delay = 0,
  staggerStep = MOVIE_ROUTE_MOTION.orchestration.groupStagger,
}) {
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
  const motionProps = buildClipRevealMotion({
    delay,
    direction,
    duration: MOVIE_SOFT_PROFILE.durations.clip,
    ease: MOVIE_SOFT_PROFILE.easings.clip,
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
    delayStep: options.delayStep ?? MOVIE_ROUTE_MOTION.orchestration.itemStagger,
    distance: options.distance ?? MOVIE_SOFT_PROFILE.offsets.itemY,
    duration: options.duration ?? MOVIE_SOFT_PROFILE.durations.item,
    ease: options.ease ?? MOVIE_SOFT_PROFILE.easings.reveal,
    groupDelayStep: options.groupDelayStep ?? MOVIE_ROUTE_MOTION.orchestration.groupStagger,
    opacityDurationFactor: options.opacityDurationFactor ?? MOVIE_SOFT_PROFILE.transition.opacityDurationFactor,
    opacityEase: options.opacityEase ?? MOVIE_SOFT_PROFILE.easings.opacity,
    scale: options.scale ?? MOVIE_SOFT_PROFILE.scales.item,
  });
}

export function getSurfacePanelMotion() {
  return createPanelMotion({
    duration: MOVIE_SOFT_PROFILE.durations.panel,
    ease: MOVIE_SOFT_PROFILE.easings.reveal,
    exitDuration: MOVIE_SOFT_PROFILE.durations.panel * 0.62,
    exitEase: MOVIE_SOFT_PROFILE.easings.exit,
    opacityDurationFactor: MOVIE_SOFT_PROFILE.transition.opacityDurationFactor,
    opacityEase: MOVIE_SOFT_PROFILE.easings.opacity,
    y: MOVIE_SOFT_PROFILE.offsets.panelY,
    exitY: MOVIE_SOFT_PROFILE.offsets.panelExitY,
    initialScale: MOVIE_SOFT_PROFILE.scales.panelInitial,
    exitScale: MOVIE_SOFT_PROFILE.scales.panelExit,
  });
}

export function useInitialItemRevealEnabled() {
  return useInitialRevealEnabled();
}
