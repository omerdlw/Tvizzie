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

const MOVIE_SOFT_PROFILE = Object.freeze({
  easings: Object.freeze({
    reveal: [0.25, 0.1, 0.25, 1],
    opacity: [0, 0, 0.2, 1],
    clip: [0.25, 0.1, 0.25, 1],
    exit: [0.4, 0, 0.2, 1],
    sidebar: [0.25, 0.1, 0.25, 1],
  }),
  durations: Object.freeze({
    panel: 0.6,
    item: 0.68,
    section: 0.98,
    sidebar: 0.94,
    clip: 1,
    hero: 1.12,
    text: 0.72,
  }),
  offsets: Object.freeze({
    sidebarX: 28,
    heroY: 34,
    sectionY: 28,
    surfaceY: 14,
    itemY: 18,
    panelY: 14,
    panelExitY: -8,
  }),
  scales: Object.freeze({
    sidebar: 0.974,
    hero: 0.982,
    section: 0.986,
    surface: 0.978,
    item: 0.988,
    panelInitial: 0.988,
    panelExit: 0.994,
  }),
  stagger: Object.freeze({
    item: 0.032,
    group: 0.11,
  }),
  transition: Object.freeze({
    opacityDurationFactor: 0.7,
  }),
});

const MovieSequenceContext = createContext(null);

function useInitialRevealEnabled() {
  const shouldAnimateRef = useRef(true);

  useEffect(() => {
    shouldAnimateRef.current = false;
  }, []);

  return shouldAnimateRef.current;
}

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

  return Math.min(0.72, Math.max(0, (sequence.delay || 0) + groupIndex * (sequence.staggerStep || 0)));
}

function useMovieAnimationSequence() {
  return useContext(MovieSequenceContext);
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
