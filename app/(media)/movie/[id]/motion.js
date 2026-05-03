'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { motion } from 'framer-motion';

import {
  ANIMATION_VIEWPORTS,
  buildClipRevealMotion,
  buildRevealMotion,
  createPanelMotion,
  createSurfaceItemMotion,
  resolvePhaseDelay,
} from '@/core/animation';

const MOVIE_CINEMATIC_PROFILE = Object.freeze({
  easings: Object.freeze({
    reveal: [0.22, 1, 0.36, 1],
    opacity: [0.16, 1, 0.3, 1],
    clip: [0.22, 1, 0.36, 1],
    exit: [0.4, 0, 0.2, 1],
    sidebar: [0.22, 1, 0.36, 1],
  }),
  durations: Object.freeze({
    panel: 1.28,
    item: 1.24,
    section: 1.8,
    sidebar: 1.9,
    clip: 1.7,
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
    group: 0.32,
  }),
  transition: Object.freeze({
    opacityDurationFactor: 0.68,
  }),
});

const MovieSequenceContext = createContext(null);
const MovieSurfaceRevealContext = createContext({
  isActive: true,
  shouldAnimateItems: false,
});

function useInitialRevealEnabled() {
  const shouldAnimateRef = useRef(true);

  useEffect(() => {
    shouldAnimateRef.current = false;
  }, []);

  return shouldAnimateRef.current;
}

export const MOVIE_ROUTE_TIMING = Object.freeze({
  hero: Object.freeze({
    backgroundDelay: 0.08,
    containerDelay: 0.62,
    titleDelay: 0.74,
    titleClipDelay: 0.48,
    titleDuration: MOVIE_CINEMATIC_PROFILE.durations.text,
    socialProofDelay: 1.02,
    taglineDelay: 1.08,
  }),
  sidebar: Object.freeze({
    posterDelay: 0.54,
    actionsDelay: 0.9,
    actionStagger: 0.12,
    taxonomyDelay: 1.16,
    taxonomyStagger: 0.11,
    rowsDelay: 1.42,
    rowStagger: 0.1,
  }),
  sections: Object.freeze({
    cast: 0.76,
    reviews: 0.88,
    groupDelay: 0.6,
    groupStagger: MOVIE_CINEMATIC_PROFILE.stagger.group,
  }),
  reviewsPage: Object.freeze({
    sidebar: 0.46,
    title: 0.68,
    titleDuration: 1.08,
    reviews: 1.08,
  }),
});

export const MOVIE_BACKGROUND_ANIMATION = Object.freeze({
  exitDurationFactor: 0.6,
  transition: Object.freeze({
    duration: 2.2,
    delay: MOVIE_ROUTE_TIMING.hero.backgroundDelay,
    ease: MOVIE_CINEMATIC_PROFILE.easings.reveal,
  }),
  initial: Object.freeze({
    opacity: 0,
    scale: 1.055,
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
    scale: 1.018,
  }),
});

const MOVIE_PHASES = Object.freeze({
  sidebar: Object.freeze({
    duration: MOVIE_CINEMATIC_PROFILE.durations.sidebar,
    ease: MOVIE_CINEMATIC_PROFILE.easings.sidebar,
    lead: 0.04,
    offset: Object.freeze({ x: -MOVIE_CINEMATIC_PROFILE.offsets.sidebarX }),
    scale: MOVIE_CINEMATIC_PROFILE.scales.sidebar,
  }),
  hero: Object.freeze({
    duration: MOVIE_CINEMATIC_PROFILE.durations.hero,
    ease: MOVIE_CINEMATIC_PROFILE.easings.reveal,
    lead: 0.1,
    offset: Object.freeze({ y: MOVIE_CINEMATIC_PROFILE.offsets.heroY }),
    scale: MOVIE_CINEMATIC_PROFILE.scales.hero,
  }),
  section: Object.freeze({
    duration: MOVIE_CINEMATIC_PROFILE.durations.section,
    ease: MOVIE_CINEMATIC_PROFILE.easings.reveal,
    lead: 0.18,
    offset: Object.freeze({ y: MOVIE_CINEMATIC_PROFILE.offsets.sectionY }),
    scale: MOVIE_CINEMATIC_PROFILE.scales.section,
  }),
  surface: Object.freeze({
    duration: MOVIE_CINEMATIC_PROFILE.durations.panel,
    ease: MOVIE_CINEMATIC_PROFILE.easings.reveal,
    lead: 0.12,
    offset: Object.freeze({ y: MOVIE_CINEMATIC_PROFILE.offsets.surfaceY }),
    scale: MOVIE_CINEMATIC_PROFILE.scales.surface,
  }),
});

export const MOVIE_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    sectionDelay: 0.12,
    groupStagger: MOVIE_ROUTE_TIMING.sections.groupStagger,
    itemStagger: MOVIE_CINEMATIC_PROFILE.stagger.item,
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
      transition: Object.freeze({ duration: 0.92, ease: MOVIE_CINEMATIC_PROFILE.easings.reveal }),
    }),
  }),
});

function createMovieObserverOptions(viewport = MOVIE_ROUTE_MOTION.scroll.sectionViewport) {
  const amount = Number(viewport?.amount);

  return {
    threshold: [0, Number.isFinite(amount) ? amount : MOVIE_ROUTE_MOTION.scroll.sectionViewport.amount, 1],
    rootMargin: viewport?.margin || MOVIE_ROUTE_MOTION.scroll.sectionViewport.margin,
  };
}

function getMovieSequenceDelay({ groupIndex = 0, sequence = null }) {
  if (!sequence) {
    return 0;
  }

  return Math.min(1.6, Math.max(0, (sequence.delay || 0) + groupIndex * (sequence.staggerStep || 0)));
}

function useMovieAnimationSequence() {
  return useContext(MovieSequenceContext);
}

export function useMovieSurfaceRevealState() {
  return useContext(MovieSurfaceRevealContext);
}

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
  const sequence = useMovieAnimationSequence();
  const phaseConfig = MOVIE_PHASES[phase] || MOVIE_PHASES.section;
  const resolvedDelay = resolvePhaseDelay({
    delay: delay + getMovieSequenceDelay({ groupIndex, sequence }),
    lead: phaseConfig.lead,
    maxDelay: 1.8,
  });
  const motionProps = buildRevealMotion({
    axis,
    delay: resolvedDelay,
    distance: distance ?? phaseConfig.offset?.[axis] ?? 24,
    duration: phaseConfig.duration,
    ease: phaseConfig.ease,
    opacityDurationFactor: MOVIE_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: MOVIE_CINEMATIC_PROFILE.easings.opacity,
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
  const containerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isActive) {
      return undefined;
    }

    const target = containerRef.current;

    if (!target) {
      return undefined;
    }

    const observerOptions = createMovieObserverOptions();
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
  }, [isActive]);

  const value = useMemo(
    () => ({
      delay,
      isActive,
      staggerStep,
    }),
    [delay, isActive, staggerStep]
  );

  return (
    <MovieSequenceContext.Provider value={value}>
      <div ref={containerRef} className={className}>
        {children}
      </div>
    </MovieSequenceContext.Provider>
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
    duration: MOVIE_CINEMATIC_PROFILE.durations.clip,
    ease: MOVIE_CINEMATIC_PROFILE.easings.clip,
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
  contentClassName = 'w-full',
  delay = 0,
  once = true,
  animateOnView = true,
  groupIndex = 0,
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

    const observerOptions = createMovieObserverOptions();
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
    <MovieSurfaceRevealContext.Provider value={value}>
      <MovieReveal
        className={className}
        delay={delay}
        once={once}
        animateOnView={animateOnView}
        groupIndex={groupIndex}
        phase="surface"
      >
        <div ref={containerRef} className={contentClassName}>
          {children}
        </div>
      </MovieReveal>
    </MovieSurfaceRevealContext.Provider>
  );
}

export function getSurfaceItemMotion(options = {}) {
  return createSurfaceItemMotion({
    ...options,
    active: options.active ?? true,
    delayStep: options.delayStep ?? MOVIE_ROUTE_MOTION.orchestration.itemStagger,
    distance: options.distance ?? MOVIE_CINEMATIC_PROFILE.offsets.itemY,
    duration: options.duration ?? MOVIE_CINEMATIC_PROFILE.durations.item,
    ease: options.ease ?? MOVIE_CINEMATIC_PROFILE.easings.reveal,
    groupDelayStep: options.groupDelayStep ?? MOVIE_ROUTE_MOTION.orchestration.groupStagger,
    opacityDurationFactor: options.opacityDurationFactor ?? MOVIE_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: options.opacityEase ?? MOVIE_CINEMATIC_PROFILE.easings.opacity,
    scale: options.scale ?? MOVIE_CINEMATIC_PROFILE.scales.item,
  });
}

export function getSurfacePanelMotion() {
  return createPanelMotion({
    duration: MOVIE_CINEMATIC_PROFILE.durations.panel,
    ease: MOVIE_CINEMATIC_PROFILE.easings.reveal,
    exitDuration: MOVIE_CINEMATIC_PROFILE.durations.panel * 0.62,
    exitEase: MOVIE_CINEMATIC_PROFILE.easings.exit,
    opacityDurationFactor: MOVIE_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: MOVIE_CINEMATIC_PROFILE.easings.opacity,
    y: MOVIE_CINEMATIC_PROFILE.offsets.panelY,
    exitY: MOVIE_CINEMATIC_PROFILE.offsets.panelExitY,
    initialScale: MOVIE_CINEMATIC_PROFILE.scales.panelInitial,
    exitScale: MOVIE_CINEMATIC_PROFILE.scales.panelExit,
  });
}

export function useInitialItemRevealEnabled() {
  return useInitialRevealEnabled();
}
