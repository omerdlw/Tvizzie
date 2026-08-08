/**
 * @file app/(account)/motion.js
 * @description Shared animation definitions for account routes.
 */

// ─── 1. EASINGS ───────────────────────────────────────────────────────────────

export const EASINGS = Object.freeze({
  LUXURY: [0.19, 1, 0.22, 1],
  CINEMATIC: [0.19, 1, 0.22, 1],
  SMOOTH: [0.25, 0.1, 0.25, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.7, 0, 0.84, 0],
});

// ─── 2. DURATIONS ─────────────────────────────────────────────────────────────

export const DURATIONS = Object.freeze({
  HERO_BANNER: 1.8,
  HERO_AVATAR: 1.2,
  HERO_NAME: 1.1,
  HERO_STATS: 0.9,
  HERO_BIO: 0.8,
  NAV: 0.75,
  SECTION: 0.85,
  SECTION_HEADING: 0.7,
  CARD: 0.75,
  CARD_FAST: 0.55,
  STAGGER: 0.08,
  MICRO_STAGGER: 0.04,
  PAGE: 1.0,
});

export const TIMELINES = Object.freeze({
  CARD_BASE_DELAY: 0.1,
  FIRST_SECTION_BASE_DELAY: 0.1,
});

// ─── 3. SPRINGS ───────────────────────────────────────────────────────────────

export const SPRINGS = Object.freeze({
  CARD: Object.freeze({ type: 'spring', stiffness: 320, damping: 26, mass: 0.6 }),
  BUTTON: Object.freeze({ type: 'spring', stiffness: 360, damping: 28, mass: 0.5 }),
  NAV: Object.freeze({ type: 'spring', stiffness: 280, damping: 30, mass: 0.7 }),
});

// ─── 4. BLURS & SCALES ────────────────────────────────────────────────────────

export const BLURS = Object.freeze({
  NONE: 'blur(0px)',
  SUBTLE: 'blur(8px)',
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

// ─── 5. SCROLL VIEWPORT CONFIG ────────────────────────────────────────────────

export const SCROLL_VIEWPORT = Object.freeze({
  once: true,
  amount: 0.01,
  margin: '0px 0px 100px 0px',
});

// ─── 6. HERO ANIMATIONS ────────────────────────────────────────────────────

export const heroBannerVariants = Object.freeze({
  initial: { opacity: 0, scale: 1.06, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.HERO_BANNER,
    ease: EASINGS.LUXURY,
  },
});

export const heroOverlayVariants = Object.freeze({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    duration: DURATIONS.HERO_BANNER * 0.7,
    ease: EASINGS.SMOOTH,
    delay: 0.2,
  },
});

export const heroAvatarVariants = Object.freeze({
  initial: { opacity: 0, y: 24, scale: SCALES.DEEP, filter: BLURS.DEEP },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.HERO_AVATAR,
    delay: 0.35,
    ease: EASINGS.LUXURY,
  },
});

export const heroNameVariants = Object.freeze({
  initial: { opacity: 0, y: 20, scale: SCALES.CARD, filter: BLURS.MEDIUM },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.HERO_NAME,
    delay: 0.45,
    ease: EASINGS.LUXURY,
  },
});

export function getHeroStatProps(index = 0) {
  return {
    initial: { opacity: 0, y: 16, scale: SCALES.HERO, filter: BLURS.LIGHT },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.HERO_STATS,
      delay: 0.55 + index * DURATIONS.MICRO_STAGGER,
      ease: EASINGS.LUXURY,
    },
  };
}

export const heroBioVariants = Object.freeze({
  initial: { opacity: 0, y: 12, filter: BLURS.SUBTLE },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.HERO_BIO,
    delay: 0.75,
    ease: EASINGS.LUXURY,
  },
});

// ─── 7. NAV BAR ───────────────────────────────────────────────────────────────

export const navBarVariants = Object.freeze({
  initial: { opacity: 0, y: -16, filter: BLURS.LIGHT },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.NAV,
    delay: 0.6,
    ease: EASINGS.LUXURY,
  },
});

export function getNavItemProps(index = 0) {
  return {
    initial: { opacity: 0, y: -10, scale: SCALES.COMPACT, filter: BLURS.SUBTLE },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: 0.5,
      delay: 0.65 + index * 0.05,
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.04 },
    whileTap: { scale: 0.96 },
  };
}

// ─── 8. PAGE CONTAINER ─────────────────────────────────────────────────────

export const pageContainerVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.PAGE,
      ease: EASINGS.LUXURY,
      staggerChildren: DURATIONS.STAGGER,
      delayChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: SCALES.COMPACT,
    filter: BLURS.MEDIUM,
    transition: {
      duration: 0.4,
      ease: EASINGS.EXIT,
    },
  },
});

// ─── 9. SECTION ANIMATIONS ───────────────────────────────────────────────────

export function getSectionRevealProps(index = 0) {
  return {
    initial: { opacity: 0, y: 40, scale: SCALES.CARD, filter: BLURS.DEEP },
    whileInView: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    viewport: SCROLL_VIEWPORT,
    transition: {
      duration: DURATIONS.SECTION,
      delay: index * 0.1,
      ease: EASINGS.LUXURY,
    },
  };
}

export const sectionHeadingVariants = Object.freeze({
  initial: { opacity: 0, x: -20, filter: BLURS.LIGHT },
  whileInView: { opacity: 1, x: 0, filter: BLURS.NONE },
  viewport: SCROLL_VIEWPORT,
  transition: {
    duration: DURATIONS.SECTION_HEADING,
    ease: EASINGS.LUXURY,
  },
});

// ─── 10. CARD ANIMATIONS ───────────────────────────────────────────────────

export function getCardProps(index = 0, baseDelay = 0) {
  return {
    initial: { opacity: 0, y: 24, scale: SCALES.HERO, filter: BLURS.MEDIUM },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.CARD,
      delay: baseDelay + Math.min(index * DURATIONS.MICRO_STAGGER, 0.4),
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.03, y: -3, transition: SPRINGS.CARD },
    whileTap: { scale: 0.97 },
  };
}

export function getListCardProps(index = 0, baseDelay = 0) {
  return {
    initial: { opacity: 0, x: -20, scale: SCALES.CARD, filter: BLURS.LIGHT },
    animate: { opacity: 1, x: 0, scale: 1, filter: BLURS.NONE },
    whileInView: { opacity: 1, x: 0, scale: 1, filter: BLURS.NONE },
    viewport: SCROLL_VIEWPORT,
    transition: {
      duration: DURATIONS.CARD,
      delay: baseDelay + Math.min(index * DURATIONS.STAGGER, 0.32),
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.01, transition: SPRINGS.CARD },
  };
}

export function getActivityItemProps(index = 0, baseDelay = 0) {
  return {
    initial: { opacity: 0, x: -24, filter: BLURS.LIGHT },
    animate: { opacity: 1, x: 0, filter: BLURS.NONE },
    whileInView: { opacity: 1, x: 0, filter: BLURS.NONE },
    viewport: SCROLL_VIEWPORT,
    transition: {
      duration: DURATIONS.CARD_FAST,
      delay: baseDelay + Math.min(index * DURATIONS.STAGGER, 0.28),
      ease: EASINGS.LUXURY,
    },
  };
}

// ─── 11. PAGINATION & ACTION BUTTON ──────────────────────────────────────────

export const paginationVariants = Object.freeze({
  initial: { opacity: 0, y: 16, filter: BLURS.SUBTLE },
  whileInView: { opacity: 1, y: 0, filter: BLURS.NONE },
  viewport: SCROLL_VIEWPORT,
  transition: {
    duration: DURATIONS.SECTION_HEADING,
    ease: EASINGS.LUXURY,
  },
});

export const actionButtonVariants = Object.freeze({
  initial: { opacity: 0, scale: SCALES.COMPACT, filter: BLURS.SUBTLE },
  animate: { opacity: 1, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: 0.6,
    ease: EASINGS.LUXURY,
  },
  whileHover: { scale: 1.04, transition: SPRINGS.BUTTON },
  whileTap: { scale: 0.96 },
});

// ─── 12. EDIT PAGE ────────────────────────────────────────────────────────────

export const editFieldVariants = Object.freeze({
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

export const editPageContainerVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.PAGE,
      ease: EASINGS.LUXURY,
      staggerChildren: 0.1,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: SCALES.COMPACT,
    filter: BLURS.MEDIUM,
    transition: {
      duration: 0.4,
      ease: EASINGS.EXIT,
    },
  },
});

// ─── 13. FILTER / TOOLBAR ─────────────────────────────────────────────────────

export const filterBarVariants = Object.freeze({
  hidden: { opacity: 0, y: -12, filter: BLURS.SUBTLE },
  visible: {
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: {
      duration: 0.55,
      ease: EASINGS.LUXURY,
    },
  },
});

export const filterChipVariants = Object.freeze({
  hidden: { opacity: 0, scale: SCALES.HERO, filter: BLURS.SUBTLE },
  visible: {
    opacity: 1,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.45,
      ease: EASINGS.LUXURY,
    },
  },
  hover: { scale: 1.05, transition: SPRINGS.BUTTON },
  tap: { scale: 0.95 },
});
