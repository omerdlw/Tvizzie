'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { MovieClipReveal } from '@/app/(media)/movie/[id]/motion';
import {
  ANIMATION_VIEWPORTS,
  buildRevealMotion,
  createPanelMotion,
  createSurfaceItemMotion,
  resolvePhaseDelay,
} from '@/core/animation';
import { motion } from 'framer-motion';

const PERSON_CINEMATIC_PROFILE = Object.freeze({
  easings: Object.freeze({
    reveal: [0.22, 1, 0.36, 1],
    opacity: [0.16, 1, 0.3, 1],
    exit: [0.4, 0, 0.2, 1],
    sidebar: [0.22, 1, 0.36, 1],
  }),
  durations: Object.freeze({
    panel: 1.28,
    item: 1.24,
    section: 1.8,
    sidebar: 1.9,
    hero: 2.05,
    text: 1.18,
  }),
  offsets: Object.freeze({
    sidebarX: 32,
    heroY: 38,
    sectionY: 34,
    surfaceY: 18,
    itemY: 22,
    panelY: 18,
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
    item: 0.09,
    yearGroup: 0.32,
  }),
  transition: Object.freeze({
    opacityDurationFactor: 0.68,
  }),
});

const PersonSurfaceRevealContext = createContext({
  isActive: true,
  shouldAnimateItems: false,
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
    containerDelay: 0.62,
    titleDelay: 0.74,
    titleClipDelay: 0.48,
    titleDuration: PERSON_CINEMATIC_PROFILE.durations.text,
    overviewDelay: 1.08,
  }),
  sidebar: Object.freeze({
    containerDelay: 0.5,
    portraitDelay: 0.54,
    rowsDelay: 1.16,
    rowStagger: 0.1,
    bioDelay: 1.42,
  }),
  sections: Object.freeze({
    gallery: 0.76,
    filmography: 0.88,
    timeline: 0.76,
    awards: 0.76,
  }),
});

function createPersonObserverOptions(viewport = PERSON_ROUTE_MOTION.scroll.sectionViewport) {
  const amount = Number(viewport?.amount);

  return {
    threshold: [0, Number.isFinite(amount) ? amount : PERSON_ROUTE_MOTION.scroll.sectionViewport.amount, 1],
    rootMargin: viewport?.margin || PERSON_ROUTE_MOTION.scroll.sectionViewport.margin,
  };
}

export function usePersonSurfaceRevealState() {
  return useContext(PersonSurfaceRevealContext);
}

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
    maxDelay: 1.8,
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

export function PersonSurfaceReveal({
  children,
  className = '',
  contentClassName = 'w-full',
  delay = 0,
  once = true,
  animateOnView = true,
}) {
  const containerRef = useRef(null);
  const [isActive, setIsActive] = useState(!animateOnView);

  useEffect(() => {
    if (!animateOnView || isActive) {
      return undefined;
    }

    const target = containerRef.current;

    if (!target) {
      return undefined;
    }

    const observerOptions = createPersonObserverOptions();
    const threshold = Number(observerOptions.threshold?.[1] ?? 0);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting || entry?.intersectionRatio >= threshold) {
        setIsActive(true);
        observer.disconnect();
      }
    }, observerOptions);

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [animateOnView, isActive]);

  const value = useMemo(
    () => ({
      isActive,
      shouldAnimateItems: true,
    }),
    [isActive]
  );

  return (
    <PersonSurfaceRevealContext.Provider value={value}>
      <PersonReveal className={className} delay={delay} once={once} animateOnView={animateOnView} phase="surface">
        <div ref={containerRef} className={contentClassName}>
          {children}
        </div>
      </PersonReveal>
    </PersonSurfaceRevealContext.Provider>
  );
}

export { MovieClipReveal as PersonClipReveal };

export function getPersonSurfaceItemMotion(options = {}) {
  return createSurfaceItemMotion({
    ...options,
    active: options.active ?? true,
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
