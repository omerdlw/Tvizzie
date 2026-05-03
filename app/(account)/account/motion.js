'use client';

import { motion, useReducedMotion } from 'framer-motion';

import {
  ANIMATION_EASINGS,
  ANIMATION_SPRINGS,
  ANIMATION_STAGGER,
  ANIMATION_VIEWPORTS,
  buildRevealMotion,
  createPanelMotion,
  createSurfaceItemMotion,
} from '@/core/animation';

export const ACCOUNT_CINEMATIC_PROFILE = Object.freeze({
  easings: Object.freeze({
    reveal: ANIMATION_EASINGS.EXPO_OUT,
    opacity: ANIMATION_EASINGS.EASE_OUT,
    micro: ANIMATION_EASINGS.ACCENT,
    panel: ANIMATION_EASINGS.QUINT_OUT,
  }),
  durations: Object.freeze({
    hero: 0.82,
    nav: 0.52,
    section: 0.76,
    item: 0.68,
    panel: 0.62,
    panelExit: 0.34,
    micro: 0.26,
  }),
  offsets: Object.freeze({
    heroY: 28,
    navY: 14,
    sectionY: 24,
    itemY: 16,
    panelY: 12,
    panelExitY: -6,
  }),
  scales: Object.freeze({
    hero: 0.994,
    nav: 0.996,
    section: 0.994,
    item: 0.988,
    listItem: 0.99,
    panelInitial: 0.996,
    panelExit: 0.998,
  }),
  stagger: Object.freeze({
    navItem: 0.035,
    item: 0.04,
    denseItem: 0.018,
    section: 0.12,
  }),
  transition: Object.freeze({
    opacityDurationFactor: 0.72,
  }),
  reducedMotion: Object.freeze({
    duration: 0.18,
    opacity: 0.9,
  }),
});

const ACCOUNT_SURFACE_ITEM_PRESETS = Object.freeze({
  activityItem: Object.freeze({
    delayStep: ACCOUNT_CINEMATIC_PROFILE.stagger.denseItem,
    distance: ACCOUNT_CINEMATIC_PROFILE.offsets.panelY,
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.item,
    groupDelayStep: 0,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.item,
  }),
  control: Object.freeze({
    delayStep: ACCOUNT_CINEMATIC_PROFILE.stagger.item,
    distance: ACCOUNT_CINEMATIC_PROFILE.offsets.panelY,
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.panel,
    groupDelayStep: 0,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.panelInitial,
  }),
  listCard: Object.freeze({
    delayStep: ACCOUNT_CINEMATIC_PROFILE.stagger.item,
    distance: ACCOUNT_CINEMATIC_PROFILE.offsets.itemY,
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.item,
    groupDelayStep: 0,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.listItem,
  }),
  mediaCard: Object.freeze({
    delayStep: ACCOUNT_CINEMATIC_PROFILE.stagger.denseItem,
    distance: ACCOUNT_CINEMATIC_PROFILE.offsets.itemY,
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.item,
    groupDelayStep: 0,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.item,
  }),
  navItem: Object.freeze({
    delayStep: ACCOUNT_CINEMATIC_PROFILE.stagger.navItem,
    distance: -ACCOUNT_CINEMATIC_PROFILE.offsets.navY,
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.nav,
    groupDelayStep: 0,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.nav,
  }),
  reviewSurface: Object.freeze({
    delayStep: ACCOUNT_CINEMATIC_PROFILE.stagger.item,
    distance: ACCOUNT_CINEMATIC_PROFILE.offsets.panelY,
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.panel,
    groupDelayStep: 0,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.panelInitial,
  }),
});

export const ACCOUNT_ROUTE_MOTION = Object.freeze({
  orchestration: Object.freeze({
    delayScale: 0.86,
    heroDelay: ACCOUNT_CINEMATIC_PROFILE.stagger.denseItem,
    maxDelay: 0.72,
    navDelay: ACCOUNT_CINEMATIC_PROFILE.stagger.denseItem,
    sectionDelay: ACCOUNT_CINEMATIC_PROFILE.stagger.section,
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

export const ACCOUNT_ROUTE_TIMING = Object.freeze({
  sections: Object.freeze({
    primary: 0,
    secondary: ACCOUNT_CINEMATIC_PROFILE.stagger.denseItem * 3,
    tertiary: ACCOUNT_CINEMATIC_PROFILE.stagger.item + ACCOUNT_CINEMATIC_PROFILE.stagger.denseItem,
  }),
});

const ACCOUNT_PHASES = Object.freeze({
  hero: Object.freeze({
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.hero,
    distance: ACCOUNT_CINEMATIC_PROFILE.offsets.heroY,
    lead: ACCOUNT_ROUTE_MOTION.orchestration.heroDelay,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.hero,
  }),
  nav: Object.freeze({
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.nav,
    distance: ACCOUNT_CINEMATIC_PROFILE.offsets.navY,
    lead: ACCOUNT_ROUTE_MOTION.orchestration.navDelay,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.nav,
  }),
  section: Object.freeze({
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.section,
    distance: ACCOUNT_CINEMATIC_PROFILE.offsets.sectionY,
    lead: ACCOUNT_ROUTE_MOTION.orchestration.sectionDelay,
    scale: ACCOUNT_CINEMATIC_PROFILE.scales.section,
  }),
});

function getSyncedDelay(delay, phase) {
  const phaseConfig = ACCOUNT_PHASES[phase] || ACCOUNT_PHASES.section;

  return Math.min(
    ACCOUNT_ROUTE_MOTION.orchestration.maxDelay,
    Math.max(0, phaseConfig.lead + delay * ACCOUNT_ROUTE_MOTION.orchestration.delayScale)
  );
}

function AccountReveal({ animateOnView = false, children, className = '', delay = 0, once = true, phase = 'section' }) {
  const reducedMotion = useReducedMotion();
  const phaseConfig = ACCOUNT_PHASES[phase] || ACCOUNT_PHASES.section;
  const syncedDelay = getSyncedDelay(delay, phase);
  const motionProps = buildRevealMotion({
    delay: syncedDelay,
    distance: phaseConfig.distance,
    duration: phaseConfig.duration,
    ease: ACCOUNT_CINEMATIC_PROFILE.easings.reveal,
    opacityDurationFactor: ACCOUNT_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: ACCOUNT_CINEMATIC_PROFILE.easings.opacity,
    scale: phaseConfig.scale,
  });
  const resolvedMotionProps = reducedMotion
    ? {
        initial: { opacity: ACCOUNT_CINEMATIC_PROFILE.reducedMotion.opacity },
        animate: {
          opacity: 1,
          transitionEnd: motionProps.animate?.transitionEnd,
        },
        style: undefined,
      }
    : motionProps;
  const transition = reducedMotion
    ? {
        opacity: {
          delay: 0,
          duration: ACCOUNT_CINEMATIC_PROFILE.reducedMotion.duration,
          ease: ACCOUNT_CINEMATIC_PROFILE.easings.opacity,
        },
      }
    : {
        opacity: {
          duration: Math.max(ACCOUNT_CINEMATIC_PROFILE.durations.micro, phaseConfig.duration * 0.85),
          delay: syncedDelay,
          ease: ACCOUNT_CINEMATIC_PROFILE.easings.opacity,
        },
        y: {
          type: 'spring',
          ...(phase === 'nav' ? ANIMATION_SPRINGS.GENTLE : ANIMATION_SPRINGS.REVEAL),
          delay: syncedDelay,
        },
        scale: {
          duration: Math.max(ACCOUNT_CINEMATIC_PROFILE.durations.micro, phaseConfig.duration * 0.92),
          delay: syncedDelay,
          ease: ACCOUNT_CINEMATIC_PROFILE.easings.panel,
        },
      };

  if (animateOnView) {
    return (
      <motion.div
        className={className}
        initial={resolvedMotionProps.initial}
        whileInView={resolvedMotionProps.animate}
        viewport={{ ...ACCOUNT_ROUTE_MOTION.scroll.sectionViewport, once }}
        transition={transition}
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
      transition={transition}
      style={resolvedMotionProps.style}
    >
      {children}
    </motion.div>
  );
}

function getReducedItemMotion() {
  return {
    initial: { opacity: ACCOUNT_CINEMATIC_PROFILE.reducedMotion.opacity },
    animate: { opacity: 1 },
    transition: {
      opacity: {
        delay: 0,
        duration: ACCOUNT_CINEMATIC_PROFILE.reducedMotion.duration,
        ease: ACCOUNT_CINEMATIC_PROFILE.easings.opacity,
      },
    },
  };
}

export function getAccountDelayedTransition(transition, delay = 0) {
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

export function getAccountSurfaceItemMotion(options = {}) {
  if (options.reducedMotion) {
    return getReducedItemMotion();
  }

  const preset = ACCOUNT_SURFACE_ITEM_PRESETS[options.preset] || null;
  const itemMotion = createSurfaceItemMotion({
    ...preset,
    ...options,
    active: options.active ?? true,
    delayStep: options.delayStep ?? preset?.delayStep ?? ACCOUNT_CINEMATIC_PROFILE.stagger.item,
    distance: options.distance ?? preset?.distance ?? ACCOUNT_CINEMATIC_PROFILE.offsets.itemY,
    duration: options.duration ?? preset?.duration ?? ACCOUNT_CINEMATIC_PROFILE.durations.item,
    ease: options.ease ?? preset?.ease ?? ACCOUNT_CINEMATIC_PROFILE.easings.reveal,
    groupDelayStep: options.groupDelayStep ?? preset?.groupDelayStep ?? 0,
    opacityDurationFactor: options.opacityDurationFactor ?? ACCOUNT_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: options.opacityEase ?? ACCOUNT_CINEMATIC_PROFILE.easings.opacity,
    scale: options.scale ?? preset?.scale ?? ACCOUNT_CINEMATIC_PROFILE.scales.item,
  });

  if (!options.baseDelay) {
    return itemMotion;
  }

  return {
    ...itemMotion,
    transition: getAccountDelayedTransition(itemMotion.transition, options.baseDelay),
  };
}

export function getAccountSurfacePanelMotion(options = {}) {
  return createPanelMotion({
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.panel,
    ease: ACCOUNT_CINEMATIC_PROFILE.easings.panel,
    exitDuration: options.exitDuration ?? ACCOUNT_CINEMATIC_PROFILE.durations.panelExit,
    exitEase: ANIMATION_EASINGS.EXPO_IN_OUT,
    opacityDurationFactor: ACCOUNT_CINEMATIC_PROFILE.transition.opacityDurationFactor,
    opacityEase: ACCOUNT_CINEMATIC_PROFILE.easings.opacity,
    y: ACCOUNT_CINEMATIC_PROFILE.offsets.panelY,
    exitY: ACCOUNT_CINEMATIC_PROFILE.offsets.panelExitY,
    initialScale: ACCOUNT_CINEMATIC_PROFILE.scales.panelInitial,
    exitScale: ACCOUNT_CINEMATIC_PROFILE.scales.panelExit,
  });
}

export function AccountMotionItem({
  animateOnView = true,
  children,
  className = '',
  index = 0,
  layout = false,
  preset = 'mediaCard',
  viewport = true,
}) {
  const reducedMotion = useReducedMotion();
  const itemMotion = getAccountSurfaceItemMotion({
    index,
    preset,
    reducedMotion,
  });
  const viewportProps = viewport ? { once: true, ...ACCOUNT_ROUTE_MOTION.scroll.sectionViewport } : undefined;

  return (
    <motion.div
      className={className}
      layout={layout}
      initial={itemMotion.initial}
      animate={animateOnView ? undefined : itemMotion.animate}
      whileInView={animateOnView ? itemMotion.animate : undefined}
      viewport={viewportProps}
      transition={itemMotion.transition}
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

export function AccountSectionReveal({ animateOnView = true, children, className = '', delay = 0, once = true }) {
  return (
    <AccountReveal className={className} phase="section" delay={delay} animateOnView={animateOnView} once={once}>
      {children}
    </AccountReveal>
  );
}

export const ACCOUNT_NAV_ITEM_STAGGER = Object.freeze({
  step: ACCOUNT_CINEMATIC_PROFILE.stagger.navItem,
  duration: ACCOUNT_CINEMATIC_PROFILE.durations.nav,
});

export const ACCOUNT_NAV_LABEL_TRANSITION = Object.freeze({
  duration: ACCOUNT_CINEMATIC_PROFILE.durations.micro,
  ease: ACCOUNT_CINEMATIC_PROFILE.easings.micro,
});

export const ACCOUNT_NAV_CHIP_TRANSITION = Object.freeze({
  spring: ANIMATION_SPRINGS.SEGMENTED_CONTROL,
  itemStep: ANIMATION_STAGGER.MICRO,
});

export const ACCOUNT_LIST_CARD_MOTION = Object.freeze({
  cardSpring: Object.freeze({ type: 'spring', stiffness: 220, damping: 22, mass: 0.9 }),
  imageTransition: Object.freeze({
    duration: ACCOUNT_CINEMATIC_PROFILE.durations.micro,
    ease: ACCOUNT_CINEMATIC_PROFILE.easings.opacity,
  }),
  panelSpring: Object.freeze({ type: 'spring', stiffness: 180, damping: 22, mass: 0.85 }),
  posterSpring: Object.freeze({ type: 'spring', stiffness: 110, damping: 18, mass: 0.95 }),
  titleSpring: Object.freeze({ type: 'spring', stiffness: 170, damping: 22, mass: 0.85 }),
});
