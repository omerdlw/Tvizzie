'use client';

/**
 * @file app/(home)/motion.js
 * @description Home Page sinematik animasyon tanımları.
 */

export const EASINGS = Object.freeze({
  LUXURY: [0.19, 1, 0.22, 1],
  CINEMATIC: [0.19, 1, 0.22, 1],
  SMOOTH: [0.25, 0.1, 0.25, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.7, 0, 0.84, 0],
});

export const DURATIONS = Object.freeze({
  BACKGROUND: 2.2,
  PAGE: 1.0,
  SECTION: 0.85,
  GRID_CARD: 1.1,
  RAIL_CARD: 1.1,
  ITEM: 0.70,
  CHIP: 0.55,
  STAGGER: 0.10,
  MICRO_STAGGER: 0.05,
});

export const SPRINGS = Object.freeze({
  BUTTON: Object.freeze({ type: 'spring', stiffness: 360, damping: 28, mass: 0.5 }),
  CHIP: Object.freeze({ type: 'spring', stiffness: 360, damping: 28, mass: 0.5 }),
  CARD: Object.freeze({ type: 'spring', stiffness: 320, damping: 26, mass: 0.6 }),
});

export const BLURS = Object.freeze({
  NONE: 'blur(0px)',
  LIGHT: 'blur(12px)',
  MEDIUM: 'blur(16px)',
  DEEP: 'blur(20px)',
  CINEMATIC: 'blur(24px)',
});

export const SCALES = Object.freeze({
  IDENTITY: 1,
  COMPACT: 0.96,
  CARD: 0.94,
  HERO: 0.92,
  DEEP: 0.88,
});

export const TIMELINES = Object.freeze({
  GENRE_STEP: 0.03,
  DISCOVER_GRID_STEP: 0.06,
  RAIL_CARD_STEP: 0.06,
});

export const SCROLL_VIEWPORT = Object.freeze({
  once: true,
  amount: 0.1,
});

export const homePageContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.PAGE,
      ease: EASINGS.LUXURY,
      staggerChildren: DURATIONS.STAGGER,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    filter: BLURS.MEDIUM,
    scale: SCALES.COMPACT,
    transition: {
      duration: 0.4,
      ease: EASINGS.EXIT,
    },
  },
});

export const homeBackgroundVariants = Object.freeze({
  initial: { opacity: 0, scale: 1.1, filter: BLURS.CINEMATIC },
  animate: {
    opacity: 0.5,
    scale: 1,
    filter: BLURS.NONE,
  },
  exit: { opacity: 0, scale: 0.9, filter: BLURS.MEDIUM },
  transition: {
    duration: DURATIONS.BACKGROUND,
    delay: 0.25,
    ease: EASINGS.LUXURY,
  },
});

export const homeSectionVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 28,
    scale: SCALES.CARD,
    filter: BLURS.MEDIUM,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: DURATIONS.SECTION,
      ease: EASINGS.LUXURY,
    },
  },
});

export function getGenreChipProps(index = 0) {
  return {
    initial: { opacity: 0, x: -20, filter: BLURS.LIGHT },
    animate: { opacity: 1, x: 0, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.CHIP,
      delay: index * TIMELINES.GENRE_STEP,
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
  };
}

export const genreNavButtonProps = Object.freeze({
  whileHover: { scale: 1.06 },
  whileTap: { scale: 0.94 },
  transition: { duration: 0.2, ease: EASINGS.LUXURY },
});

export function getDiscoverCardProps(index = 0, baseDelay = 0) {
  return {
    initial: { opacity: 0, y: 28, scale: SCALES.CARD, filter: BLURS.MEDIUM },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.GRID_CARD,
      delay: baseDelay + Math.min(index * TIMELINES.DISCOVER_GRID_STEP, 0.45),
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.03, y: -2 },
    whileTap: { scale: 0.98 },
  };
}

export function getTrendingCardProps(index = 0, baseDelay = 0) {
  return {
    initial: { opacity: 0, y: 28, scale: SCALES.CARD, filter: BLURS.MEDIUM },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.RAIL_CARD,
      delay: baseDelay + Math.min(index * TIMELINES.RAIL_CARD_STEP, 0.45),
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.03, y: -2 },
    whileTap: { scale: 0.98 },
  };
}

export const loadMoreButtonVariants = Object.freeze({
  initial: { opacity: 0, y: 20, scale: SCALES.COMPACT, filter: BLURS.SUBTLE },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: { duration: 0.75, ease: EASINGS.LUXURY },
  whileHover: { scale: 1.03, y: -2 },
  whileTap: { scale: 0.97 },
});

