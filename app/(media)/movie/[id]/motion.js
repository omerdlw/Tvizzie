'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { motion, useReducedMotion } from 'framer-motion';

import {
  ANIMATION_VIEWPORTS,
  buildClipRevealMotion,
  buildRevealMotion,
  createPanelMotion,
  createSurfaceItemMotion,
  resolvePhaseDelay,
} from '@/core/animation';

export const MOVIE_CINEMATIC_PROFILE = Object.freeze({
  easings: Object.freeze({
    reveal: [0.16, 1, 0.3, 1],
    opacity: [0.2, 0.72, 0.18, 1],
    clip: [0.18, 1, 0.28, 1],
    exit: [0.4, 0, 0.2, 1],
    sidebar: [0.18, 1, 0.3, 1],
    grid: [0.2, 0.72, 0.08, 1],
    micro: [0.32, 0.72, 0.08, 1],
  }),
  durations: Object.freeze({
    micro: 0.36,
    component: 0.94,
    panel: 1.14,
    panelExit: 0.58,
    item: 1.02,
    section: 1.34,
    gridFrame: 2.2,
    gridFrameViewport: 2.15,
    gridFrameMax: 24,
    gridLine: 1.82,
    gridDivider: 1.58,
    gridNode: 0.78,
    sidebar: 1.42,
    clip: 1.24,
    hero: 1.58,
    background: 1.86,
    text: 1.16,
  }),
  offsets: Object.freeze({
    sidebarX: 30,
    heroY: 34,
    sectionY: 32,
    surfaceY: 18,
    itemY: 20,
    panelY: 16,
    panelExitY: -6,
  }),
  scales: Object.freeze({
    sidebar: 0.986,
    hero: 0.99,
    section: 0.992,
    surface: 0.988,
    item: 0.992,
    mediaItem: 0.972,
    castItem: 0.974,
    panelInitial: 0.994,
    panelExit: 0.997,
  }),
  stagger: Object.freeze({
    micro: 0.05,
    item: 0.09,
    mediaItem: 0.1,
    group: 0.24,
  }),
  transition: Object.freeze({
    opacityDurationFactor: 0.74,
    gridOpacityDurationFactor: 0.56,
  }),
  reducedMotion: Object.freeze({
    duration: 0.2,
    opacity: 0.86,
  }),
});

export const MOVIE_SURFACE_ITEM_PRESETS = Object.freeze({
  action: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.item,
    distance: 10,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    groupDelayStep: 0,
    scale: MOVIE_CINEMATIC_PROFILE.scales.item,
  }),
  sidebarRow: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.item,
    distance: 10,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    groupDelayStep: 0,
    scale: 0.996,
  }),
  sidebarChip: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.micro,
    distance: 8,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    groupDelayStep: 0,
    scale: 0.984,
  }),
  control: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.item,
    distance: 12,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    groupDelayStep: 0,
    scale: MOVIE_CINEMATIC_PROFILE.scales.item,
  }),
  castFeatured: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.mediaItem,
    distance: 22,
    duration: MOVIE_CINEMATIC_PROFILE.durations.item,
    groupDelayStep: 0,
    scale: MOVIE_CINEMATIC_PROFILE.scales.castItem,
  }),
  castCompact: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.item,
    distance: 16,
    duration: MOVIE_CINEMATIC_PROFILE.durations.component,
    groupDelayStep: 0,
    scale: MOVIE_CINEMATIC_PROFILE.scales.item,
  }),
  mediaCard: Object.freeze({
    delayStep: MOVIE_CINEMATIC_PROFILE.stagger.mediaItem,
    distance: 26,
    duration: MOVIE_CINEMATIC_PROFILE.durations.item,
    scale: MOVIE_CINEMATIC_PROFILE.scales.mediaItem,
  }),
});

export const MOVIE_INTERACTION_MOTION = Object.freeze({
  cardHover: Object.freeze({ y: -3 }),
  playHover: Object.freeze({ scale: 1.08 }),
  transition: Object.freeze({
    duration: MOVIE_CINEMATIC_PROFILE.durations.micro,
    ease: MOVIE_CINEMATIC_PROFILE.easings.micro,
  }),
});

const MovieSequenceContext = createContext(null);
const MovieSurfaceRevealContext = createContext({
  itemBaseDelay: 0,
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
  page: Object.freeze({
    gridFrame: 0,
    frameVertical: 0,
    primaryStructure: 0.36,
    sidebarPoster: 0.46,
    heroTitle: 0.58,
    sidebarActions: 0.76,
    metadata: 0.9,
    overview: 1.02,
    cast: 1.18,
    secondarySections: 0.18,
  }),
  hero: Object.freeze({
    backgroundDelay: 0.08,
    containerDelay: 0.58,
    titleDelay: 0.72,
    titleClipDelay: 0.42,
    titleDuration: MOVIE_CINEMATIC_PROFILE.durations.text,
    socialProofDelay: 0.86,
    taglineDelay: 1.02,
    overviewDelay: 1.16,
  }),
  sidebar: Object.freeze({
    posterDelay: 0.46,
    actionsDelay: 0.78,
    actionStagger: MOVIE_CINEMATIC_PROFILE.stagger.item,
    taxonomyDelay: 0.96,
    taxonomyStagger: MOVIE_CINEMATIC_PROFILE.stagger.micro,
    rowsDelay: 1.16,
    rowStagger: MOVIE_CINEMATIC_PROFILE.stagger.item,
  }),
  sections: Object.freeze({
    cast: 1.1,
    reviews: 0.28,
    groupDelay: 0.18,
    groupStagger: MOVIE_CINEMATIC_PROFILE.stagger.group,
    gridLead: 0,
    surfaceDelay: 0.18,
    itemDelay: 0.26,
  }),
  reviewsPage: Object.freeze({
    sidebar: 0.42,
    title: 0.58,
    titleDuration: MOVIE_CINEMATIC_PROFILE.durations.text,
    reviews: 0.82,
  }),
});

export const MOVIE_BACKGROUND_ANIMATION = Object.freeze({
  exitDurationFactor: 0.6,
  transition: Object.freeze({
    duration: MOVIE_CINEMATIC_PROFILE.durations.background,
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
    lead: 0.2,
    offset: Object.freeze({ y: MOVIE_CINEMATIC_PROFILE.offsets.sectionY }),
    scale: MOVIE_CINEMATIC_PROFILE.scales.section,
  }),
  surface: Object.freeze({
    duration: MOVIE_CINEMATIC_PROFILE.durations.panel,
    ease: MOVIE_CINEMATIC_PROFILE.easings.reveal,
    lead: 0.16,
    offset: Object.freeze({ y: MOVIE_CINEMATIC_PROFILE.offsets.surfaceY }),
    scale: MOVIE_CINEMATIC_PROFILE.scales.surface,
  }),
});

export const MOVIE_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    sectionDelay: MOVIE_ROUTE_TIMING.sections.surfaceDelay,
    groupStagger: MOVIE_ROUTE_TIMING.sections.groupStagger,
    itemStagger: MOVIE_CINEMATIC_PROFILE.stagger.item,
    itemLead: MOVIE_ROUTE_TIMING.sections.itemDelay,
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
      transition: Object.freeze({
        duration: MOVIE_CINEMATIC_PROFILE.durations.panel,
        ease: MOVIE_CINEMATIC_PROFILE.easings.reveal,
      }),
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

export function useMovieSurfaceInitialRevealState() {
  const surfaceReveal = useMovieSurfaceRevealState();
  const [hasPlayedReveal, setHasPlayedReveal] = useState(false);

  useEffect(() => {
    if (!surfaceReveal.isActive || !surfaceReveal.shouldAnimateItems || hasPlayedReveal) {
      return undefined;
    }

    const timeout = window.setTimeout(
      () => setHasPlayedReveal(true),
      (surfaceReveal.itemBaseDelay + MOVIE_CINEMATIC_PROFILE.durations.item + MOVIE_CINEMATIC_PROFILE.stagger.group) *
        1000
    );

    return () => window.clearTimeout(timeout);
  }, [hasPlayedReveal, surfaceReveal.isActive, surfaceReveal.itemBaseDelay, surfaceReveal.shouldAnimateItems]);

  return useMemo(
    () => ({
      itemBaseDelay: surfaceReveal.itemBaseDelay,
      ...surfaceReveal,
      shouldAnimateItems: surfaceReveal.shouldAnimateItems && !hasPlayedReveal,
    }),
    [hasPlayedReveal, surfaceReveal]
  );
}

export function useMovieReducedMotion() {
  return Boolean(useReducedMotion());
}

function getReducedRevealMotion(motionProps) {
  return {
    initial: { opacity: MOVIE_CINEMATIC_PROFILE.reducedMotion.opacity },
    animate: {
      opacity: 1,
      transitionEnd: motionProps.animate?.transitionEnd,
    },
    transition: {
      opacity: {
        duration: MOVIE_CINEMATIC_PROFILE.reducedMotion.duration,
        delay: 0,
        ease: MOVIE_CINEMATIC_PROFILE.easings.opacity,
      },
    },
    style: undefined,
  };
}

export function getMovieDelayedTransition(transition, delay = 0) {
  return Object.fromEntries(
    Object.entries(transition || {}).map(([key, value]) => [
      key,
      {
        ...value,
        delay: delay + (value?.delay || 0),
      },
    ])
  );
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
  const reducedMotion = useMovieReducedMotion();
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
  const resolvedMotionProps = reducedMotion ? getReducedRevealMotion(motionProps) : motionProps;

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={resolvedMotionProps.initial}
        whileInView={resolvedMotionProps.animate}
        viewport={{ ...MOVIE_ROUTE_MOTION.scroll.sectionViewport, once }}
        transition={resolvedMotionProps.transition}
        style={resolvedMotionProps.style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={resolvedMotionProps.initial}
      animate={
        sequence
          ? sequence.isActive || reducedMotion
            ? resolvedMotionProps.animate
            : resolvedMotionProps.initial
          : resolvedMotionProps.animate
      }
      transition={resolvedMotionProps.transition}
      style={resolvedMotionProps.style}
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
  const reducedMotion = useMovieReducedMotion();
  const motionProps = buildClipRevealMotion({
    delay,
    direction,
    duration: MOVIE_CINEMATIC_PROFILE.durations.clip,
    ease: MOVIE_CINEMATIC_PROFILE.easings.clip,
  });
  const resolvedMotionProps = reducedMotion ? getReducedRevealMotion(motionProps) : motionProps;

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={resolvedMotionProps.initial}
        whileInView={resolvedMotionProps.animate}
        viewport={{ ...MOVIE_ROUTE_MOTION.scroll.sectionViewport, once }}
        transition={resolvedMotionProps.transition}
        style={resolvedMotionProps.style}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={resolvedMotionProps.initial}
      animate={resolvedMotionProps.animate}
      transition={resolvedMotionProps.transition}
      style={resolvedMotionProps.style}
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
  delay = MOVIE_ROUTE_MOTION.orchestration.sectionDelay,
  once = true,
  animateOnView = true,
  groupIndex = 0,
}) {
  const reducedMotion = useMovieReducedMotion();
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
      itemBaseDelay: reducedMotion ? 0 : delay + MOVIE_ROUTE_MOTION.orchestration.itemLead,
      isActive: isActive || reducedMotion,
      shouldAnimateItems: !reducedMotion,
    }),
    [delay, isActive, reducedMotion]
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
  const preset = MOVIE_SURFACE_ITEM_PRESETS[options.preset] || null;
  const itemMotion = createSurfaceItemMotion({
    ...preset,
    ...options,
    active: options.active ?? true,
    delayStep: options.delayStep ?? preset?.delayStep ?? MOVIE_ROUTE_MOTION.orchestration.itemStagger,
    distance: options.distance ?? preset?.distance ?? MOVIE_CINEMATIC_PROFILE.offsets.itemY,
    duration: options.duration ?? preset?.duration ?? MOVIE_CINEMATIC_PROFILE.durations.item,
    ease: options.ease ?? preset?.ease ?? MOVIE_CINEMATIC_PROFILE.easings.reveal,
    groupDelayStep: options.groupDelayStep ?? preset?.groupDelayStep ?? MOVIE_ROUTE_MOTION.orchestration.groupStagger,
    opacityDurationFactor: options.opacityDurationFactor ?? MOVIE_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: options.opacityEase ?? MOVIE_CINEMATIC_PROFILE.easings.opacity,
    scale: options.scale ?? preset?.scale ?? MOVIE_CINEMATIC_PROFILE.scales.item,
  });

  if (!options.baseDelay) {
    return itemMotion;
  }

  return {
    ...itemMotion,
    transition: getMovieDelayedTransition(itemMotion.transition, options.baseDelay),
  };
}

export function getSurfacePanelMotion(options = {}) {
  return createPanelMotion({
    duration: MOVIE_CINEMATIC_PROFILE.durations.panel,
    ease: MOVIE_CINEMATIC_PROFILE.easings.reveal,
    exitDuration: options.exitDuration ?? MOVIE_CINEMATIC_PROFILE.durations.panelExit,
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
