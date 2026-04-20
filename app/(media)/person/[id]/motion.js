'use client';

import { MovieClipReveal } from '@/app/(media)/movie/[id]/motion';
import {
  ANIMATION_DURATIONS,
  ANIMATION_EASINGS,
  ANIMATION_STAGGER,
  ANIMATION_VIEWPORTS,
  createPanelMotion,
  createSurfaceItemMotion,
  useInitialRevealEnabled,
} from '@/core/animation';
import { motion, useReducedMotion } from 'framer-motion';

const PERSON_ROUTE_PHASES = Object.freeze({
  sidebar: Object.freeze({
    duration: ANIMATION_DURATIONS.SIDEBAR,
    delayLead: 0.05,
    distance: 44,
    scale: 0.976,
    ease: ANIMATION_EASINGS.QUINT_OUT,
  }),
  hero: Object.freeze({
    duration: ANIMATION_DURATIONS.HERO,
    delayLead: 0.12,
    distance: 52,
    scale: 0.982,
    ease: ANIMATION_EASINGS.EXPO_OUT,
  }),
  section: Object.freeze({
    duration: ANIMATION_DURATIONS.SECTION,
    delayLead: 0.18,
    distance: 36,
    scale: 0.986,
    ease: ANIMATION_EASINGS.EXPO_OUT,
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

function PersonReveal({ children, className = '', delay = 0, phase = 'section' }) {
  const reduceMotion = useReducedMotion();
  const phaseConfig = PERSON_ROUTE_PHASES[phase] || PERSON_ROUTE_PHASES.section;

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: phaseConfig.distance, scale: phaseConfig.scale }}
      animate={
        reduceMotion
          ? { opacity: 1 }
          : {
              opacity: 1,
              y: 0,
              scale: 1,
              transitionEnd: {
                transform: 'none',
                willChange: 'auto',
              },
            }
      }
      transition={
        reduceMotion
          ? { duration: ANIMATION_DURATIONS.REDUCED, ease: ANIMATION_EASINGS.EASE_OUT }
          : {
              opacity: {
                duration: phaseConfig.duration * 0.65,
                delay: delay + phaseConfig.delayLead,
                ease: ANIMATION_EASINGS.EASE_OUT,
              },
              y: {
                duration: phaseConfig.duration,
                delay: delay + phaseConfig.delayLead,
                ease: phaseConfig.ease,
              },
              scale: {
                duration: phaseConfig.duration,
                delay: delay + phaseConfig.delayLead,
                ease: phaseConfig.ease,
              },
            }
      }
      style={reduceMotion ? undefined : { willChange: 'transform, opacity' }}
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

export function PersonSectionReveal({ children, className = '', delay = 0 }) {
  return (
    <PersonReveal className={className} delay={delay} phase="section">
      {children}
    </PersonReveal>
  );
}

export { MovieClipReveal as PersonClipReveal };

export function getPersonSurfaceItemMotion(options = {}) {
  return createSurfaceItemMotion({
    ...options,
    ease: ANIMATION_EASINGS.EXPO_OUT,
  });
}

export function getPersonSurfacePanelMotion({ reduceMotion = false } = {}) {
  return createPanelMotion({
    reduceMotion,
    duration: ANIMATION_DURATIONS.PANEL,
    ease: ANIMATION_EASINGS.EXPO_OUT,
    exitDuration: ANIMATION_DURATIONS.PANEL * 0.55,
    exitEase: ANIMATION_EASINGS.EXPO_IN_OUT,
  });
}

export function useInitialPersonItemRevealEnabled() {
  return useInitialRevealEnabled();
}
