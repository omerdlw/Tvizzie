'use client';

import { MovieClipReveal } from '@/app/(media)/movie/[id]/motion';
import {
  ANIMATION_VIEWPORTS,
  buildRevealMotion,
  createPanelMotion,
  createSurfaceItemMotion,
  resolvePhaseDelay,
} from '@/core/animation';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

const PERSON_CINEMATIC_PROFILE = Object.freeze({
  easings: Object.freeze({
    reveal: [0.22, 1, 0.36, 1],
    opacity: [0.16, 1, 0.3, 1],
    exit: [0.4, 0, 0.2, 1],
    sidebar: [0.22, 1, 0.36, 1],
  }),
  durations: Object.freeze({
    panel: 0.74,
    item: 0.82,
    section: 1.16,
    sidebar: 1.12,
    hero: 1.28,
    text: 0.84,
  }),
  offsets: Object.freeze({
    sidebarX: 24,
    heroY: 30,
    sectionY: 24,
    surfaceY: 12,
    itemY: 16,
    panelY: 12,
    panelExitY: -6,
  }),
  scales: Object.freeze({
    sidebar: 0.982,
    hero: 0.988,
    section: 0.99,
    surface: 0.984,
    item: 0.992,
    panelInitial: 0.992,
    panelExit: 0.996,
  }),
  stagger: Object.freeze({
    item: 0.045,
    yearGroup: 0.088,
  }),
  transition: Object.freeze({
    opacityDurationFactor: 0.76,
  }),
});

const PERSON_ROUTE_PHASES = Object.freeze({
  sidebar: Object.freeze({
    duration: PERSON_CINEMATIC_PROFILE.durations.sidebar,
    ease: PERSON_CINEMATIC_PROFILE.easings.sidebar,
    lead: 0.04,
    offset: Object.freeze({ x: -PERSON_CINEMATIC_PROFILE.offsets.sidebarX }),
    scale: PERSON_CINEMATIC_PROFILE.scales.sidebar,
  }),
  hero: Object.freeze({
    duration: PERSON_CINEMATIC_PROFILE.durations.hero,
    ease: PERSON_CINEMATIC_PROFILE.easings.reveal,
    lead: 0.1,
    offset: Object.freeze({ y: PERSON_CINEMATIC_PROFILE.offsets.heroY }),
    scale: PERSON_CINEMATIC_PROFILE.scales.hero,
  }),
  section: Object.freeze({
    duration: PERSON_CINEMATIC_PROFILE.durations.section,
    ease: PERSON_CINEMATIC_PROFILE.easings.reveal,
    lead: 0.18,
    offset: Object.freeze({ y: PERSON_CINEMATIC_PROFILE.offsets.sectionY }),
    scale: PERSON_CINEMATIC_PROFILE.scales.section,
  }),
  surface: Object.freeze({
    duration: PERSON_CINEMATIC_PROFILE.durations.panel,
    ease: PERSON_CINEMATIC_PROFILE.easings.reveal,
    lead: 0.12,
    offset: Object.freeze({ y: PERSON_CINEMATIC_PROFILE.offsets.surfaceY }),
    scale: PERSON_CINEMATIC_PROFILE.scales.surface,
  }),
});

function useInitialRevealEnabled() {
  const shouldAnimateRef = useRef(true);

  useEffect(() => {
    shouldAnimateRef.current = false;
  }, []);

  return shouldAnimateRef.current;
}

export const PERSON_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    sectionDelay: 0.12,
    itemStagger: PERSON_CINEMATIC_PROFILE.stagger.item,
    yearGroupStagger: PERSON_CINEMATIC_PROFILE.stagger.yearGroup,
  }),
  scroll: Object.freeze({
    sectionViewport: ANIMATION_VIEWPORTS.section,
  }),
  sharedElements: Object.freeze({
    portrait: Object.freeze({
      transition: Object.freeze({ type: 'spring', stiffness: 240, damping: 34, mass: 1 }),
    }),
  }),
});

export const PERSON_ROUTE_TIMING = Object.freeze({
  hero: Object.freeze({
    containerDelay: 0.14,
    titleDelay: 0.16,
    titleClipDelay: 0.1,
    titleDuration: PERSON_CINEMATIC_PROFILE.durations.text,
    overviewDelay: 0.36,
  }),
  sidebar: Object.freeze({
    containerDelay: 0.08,
    portraitDelay: 0.08,
    rowsDelay: 0.22,
    rowStagger: 0.055,
    bioDelay: 0.36,
  }),
  sections: Object.freeze({
    gallery: 0.1,
    filmography: 0.18,
    timeline: 0.14,
    awards: 0.14,
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
  const phaseConfig = PERSON_ROUTE_PHASES[phase] || PERSON_ROUTE_PHASES.section;
  const resolvedDelay = resolvePhaseDelay({
    delay,
    lead: phaseConfig.lead,
  });
  const motionProps = buildRevealMotion({
    axis,
    delay: resolvedDelay,
    distance: distance ?? phaseConfig.offset?.[axis] ?? 24,
    duration: phaseConfig.duration,
    ease: phaseConfig.ease,
    opacityDurationFactor: PERSON_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: PERSON_CINEMATIC_PROFILE.easings.opacity,
    offset: phaseConfig.offset,
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

export function PersonSectionReveal({ children, className = '', delay = 0, once = true, animateOnView = false }) {
  return (
    <PersonReveal className={className} delay={delay} once={once} animateOnView={animateOnView} phase="section">
      {children}
    </PersonReveal>
  );
}

export function PersonSurfaceReveal({ children, className = '', delay = 0, once = true, animateOnView = false }) {
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
    delayStep: options.delayStep ?? PERSON_ROUTE_MOTION.orchestration.itemStagger,
    distance: options.distance ?? PERSON_CINEMATIC_PROFILE.offsets.itemY,
    duration: options.duration ?? PERSON_CINEMATIC_PROFILE.durations.item,
    ease: options.ease ?? PERSON_CINEMATIC_PROFILE.easings.reveal,
    groupDelayStep: options.groupDelayStep ?? PERSON_ROUTE_MOTION.orchestration.yearGroupStagger,
    opacityDurationFactor: options.opacityDurationFactor ?? PERSON_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: options.opacityEase ?? PERSON_CINEMATIC_PROFILE.easings.opacity,
    scale: options.scale ?? PERSON_CINEMATIC_PROFILE.scales.item,
  });
}

export function getPersonSurfacePanelMotion() {
  return createPanelMotion({
    duration: PERSON_CINEMATIC_PROFILE.durations.panel,
    ease: PERSON_CINEMATIC_PROFILE.easings.reveal,
    exitDuration: PERSON_CINEMATIC_PROFILE.durations.panel * 0.62,
    exitEase: PERSON_CINEMATIC_PROFILE.easings.exit,
    opacityDurationFactor: PERSON_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: PERSON_CINEMATIC_PROFILE.easings.opacity,
    y: PERSON_CINEMATIC_PROFILE.offsets.panelY,
    exitY: PERSON_CINEMATIC_PROFILE.offsets.panelExitY,
    initialScale: PERSON_CINEMATIC_PROFILE.scales.panelInitial,
    exitScale: PERSON_CINEMATIC_PROFILE.scales.panelExit,
  });
}

export function useInitialPersonItemRevealEnabled() {
  return useInitialRevealEnabled();
}
