'use client';

/**
 * @file features/media/motion.js
 * @description Shared Media Detail Pages (Movie & TV) Centralized Motion System
 */

// 1. EASINGS & DURATIONS & TIMELINE CONSTANTS
export const MOVIE_EASINGS = Object.freeze({
  LUXURY: [0.19, 1, 0.22, 1],
  SMOOTH: [0.25, 0.1, 0.25, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.7, 0, 0.84, 0],
});

export const MOVIE_DURATIONS = Object.freeze({
  COLUMN_SLIDE: 1.6,
  POSTER_REVEAL: 1.4,
  TITLE_REVEAL: 1.4,
  OVERVIEW_REVEAL: 1.3,
  SECTION_HEADER: 1.1,
  CARD_REVEAL: 1.1,
  ACTION_BUTTON: 0.75,
  TAXONOMY_CHIP: 0.7,
  SIDEBAR_ROW: 0.7,
  TAB_SWITCH_CARD: 0.4,
});

export const MOVIE_TIMELINES = Object.freeze({
  SIDEBAR_COLUMN_DELAY: 0,
  POSTER_DELAY: 0.10,
  ACTION_BUTTON_BASE_DELAY: 0.15,
  ACTION_BUTTON_STEP: 0.06,
  TAXONOMY_BASE_DELAY: 0.50,
  TAXONOMY_STEP: 0.05,
  SIDEBAR_ROW_STEP: 0.06,
  HERO_TITLE_DELAY: 0.15,
  SOCIAL_PROOF_DELAY: 0.35,
  TAGLINE_DELAY: 0.50,
  OVERVIEW_DELAY: 0.65,
  CAST_SECTION_BASE_DELAY: 0.85,
  CAST_CARD_STEP: 0.12,
  GALLERY_SECTION_BASE_DELAY: 1.80,
  GALLERY_CARD_STEP: 0.10,
  IMAGES_SECTION_BASE_DELAY: 2.40,
  IMAGES_CARD_STEP: 0.10,
  TAB_SWITCH_CARD_STEP: 0.04,
});

export const SCROLL_VIEWPORT_CONFIG = Object.freeze({
  once: true,
  amount: 0.4,
  margin: '0px 0px -150px 0px',
});

// 2. SIDEBAR COLUMN & POSTER VARIANTS
export const sidebarColumnVariants = Object.freeze({
  initial: { opacity: 0, x: -44, filter: 'blur(16px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
  transition: { duration: MOVIE_DURATIONS.COLUMN_SLIDE, ease: MOVIE_EASINGS.LUXURY },
});

export const sidebarPosterVariants = Object.freeze({
  initial: { opacity: 0, y: 36, scale: 0.88, filter: 'blur(24px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  transition: {
    duration: MOVIE_DURATIONS.POSTER_REVEAL,
    delay: MOVIE_TIMELINES.POSTER_DELAY,
    ease: MOVIE_EASINGS.LUXURY,
  },
  whileHover: { scale: 1.03, y: -4 },
});

// 3. COLLECTION ACTIONS VARIANTS
export function getActionButtonProps(index = 0) {
  return {
    initial: { opacity: 0, y: 20, scale: 0.96, filter: 'blur(12px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: {
      duration: MOVIE_DURATIONS.ACTION_BUTTON,
      delay: MOVIE_TIMELINES.ACTION_BUTTON_BASE_DELAY + index * MOVIE_TIMELINES.ACTION_BUTTON_STEP,
      ease: MOVIE_EASINGS.LUXURY,
    },
    whileHover: { scale: 1.03, y: -2 },
    whileTap: { scale: 0.97 },
  };
}

// 4. TAXONOMY & SIDEBAR ROWS VARIANTS
export function getTaxonomyHeaderProps(baseDelay = MOVIE_TIMELINES.TAXONOMY_BASE_DELAY) {
  return {
    initial: { opacity: 0, x: -24, filter: 'blur(12px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: {
      duration: MOVIE_DURATIONS.TAXONOMY_CHIP,
      delay: baseDelay,
      ease: MOVIE_EASINGS.LUXURY,
    },
  };
}

export function getTaxonomyChipProps(currentIndex = 0, baseDelay = MOVIE_TIMELINES.TAXONOMY_BASE_DELAY) {
  return {
    initial: { opacity: 0, x: -24, filter: 'blur(12px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: {
      duration: MOVIE_DURATIONS.TAXONOMY_CHIP,
      delay: baseDelay + (currentIndex + 1) * MOVIE_TIMELINES.TAXONOMY_STEP,
      ease: MOVIE_EASINGS.LUXURY,
    },
    whileHover: { scale: 1.06 },
  };
}

export function getSidebarRowProps(index = 0, baseDelay = MOVIE_TIMELINES.TAXONOMY_BASE_DELAY) {
  return {
    initial: { opacity: 0, x: -28, filter: 'blur(16px)' },
    animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
    transition: {
      duration: MOVIE_DURATIONS.SIDEBAR_ROW,
      delay: baseDelay + index * MOVIE_TIMELINES.SIDEBAR_ROW_STEP,
      ease: MOVIE_EASINGS.LUXURY,
    },
  };
}

// 5. MAIN CONTENT COLUMN & HERO VARIANTS
export const mainContentColumnVariants = Object.freeze({
  initial: { opacity: 0, x: 44, filter: 'blur(16px)' },
  animate: { opacity: 1, x: 0, filter: 'blur(0px)' },
  transition: { duration: MOVIE_DURATIONS.COLUMN_SLIDE, ease: MOVIE_EASINGS.LUXURY },
});

export const heroTitleVariants = Object.freeze({
  initial: { opacity: 0, y: 36, scale: 0.94, filter: 'blur(24px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  transition: {
    duration: MOVIE_DURATIONS.TITLE_REVEAL,
    delay: MOVIE_TIMELINES.HERO_TITLE_DELAY,
    ease: MOVIE_EASINGS.LUXURY,
  },
});

export const heroSocialProofVariants = Object.freeze({
  initial: { opacity: 0, y: 24, scale: 0.88, filter: 'blur(16px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  transition: {
    duration: 1.3,
    delay: MOVIE_TIMELINES.SOCIAL_PROOF_DELAY,
    ease: MOVIE_EASINGS.LUXURY,
  },
});

export const heroTaglineVariants = Object.freeze({
  initial: { opacity: 0, y: 24, filter: 'blur(16px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: {
    duration: 1.2,
    delay: MOVIE_TIMELINES.TAGLINE_DELAY,
    ease: MOVIE_EASINGS.LUXURY,
  },
});

export const heroOverviewVariants = Object.freeze({
  initial: { opacity: 0, y: 28, filter: 'blur(18px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: {
    duration: MOVIE_DURATIONS.OVERVIEW_REVEAL,
    delay: MOVIE_TIMELINES.OVERVIEW_DELAY,
    ease: MOVIE_EASINGS.LUXURY,
  },
});

// 6. CAST SECTION VARIANTS
export function getCastHeaderProps(baseDelay = MOVIE_TIMELINES.CAST_SECTION_BASE_DELAY, hasSwitchedTab = false) {
  return {
    initial: {
      opacity: 0,
      y: hasSwitchedTab ? 12 : 28,
      scale: 0.94,
      filter: hasSwitchedTab ? 'blur(6px)' : 'blur(16px)',
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: {
      duration: hasSwitchedTab ? MOVIE_DURATIONS.TAB_SWITCH_CARD : MOVIE_DURATIONS.SECTION_HEADER,
      delay: hasSwitchedTab ? 0 : baseDelay + 0.10,
      ease: MOVIE_EASINGS.LUXURY,
    },
  };
}

export function getCastCardProps(index = 0, baseDelay = MOVIE_TIMELINES.CAST_SECTION_BASE_DELAY, hasSwitchedTab = false) {
  const cardDelay = hasSwitchedTab
    ? index * MOVIE_TIMELINES.TAB_SWITCH_CARD_STEP
    : baseDelay + 0.10 + index * MOVIE_TIMELINES.CAST_CARD_STEP;
  const cardDuration = hasSwitchedTab ? MOVIE_DURATIONS.TAB_SWITCH_CARD : MOVIE_DURATIONS.CARD_REVEAL;

  return {
    initial: {
      opacity: 0,
      y: hasSwitchedTab ? 12 : 32,
      scale: 0.92,
      filter: hasSwitchedTab ? 'blur(6px)' : 'blur(18px)',
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: {
      duration: cardDuration,
      delay: cardDelay,
      ease: MOVIE_EASINGS.LUXURY,
    },
    whileHover: { scale: 1.03 },
  };
}

// 7. MEDIA CAROUSEL & SECTION VARIANTS
export function getSectionHeaderProps(baseDelay = 0, hasSwitchedTab = false) {
  return {
    initial: {
      opacity: 0,
      y: hasSwitchedTab ? 12 : 28,
      scale: 0.94,
      filter: hasSwitchedTab ? 'blur(6px)' : 'blur(16px)',
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: {
      duration: hasSwitchedTab ? MOVIE_DURATIONS.TAB_SWITCH_CARD : MOVIE_DURATIONS.SECTION_HEADER,
      delay: hasSwitchedTab ? 0 : baseDelay + 0.10,
      ease: MOVIE_EASINGS.LUXURY,
    },
  };
}

export function getMediaCardProps(index = 0, baseDelay = 0, hasSwitchedTab = false) {
  const cardDelay = hasSwitchedTab
    ? index * MOVIE_TIMELINES.TAB_SWITCH_CARD_STEP
    : baseDelay + 0.10 + index * MOVIE_TIMELINES.GALLERY_CARD_STEP;
  const cardDuration = hasSwitchedTab ? MOVIE_DURATIONS.TAB_SWITCH_CARD : MOVIE_DURATIONS.CARD_REVEAL;

  return {
    initial: {
      opacity: 0,
      y: hasSwitchedTab ? 12 : 28,
      scale: 0.94,
      filter: hasSwitchedTab ? 'blur(6px)' : 'blur(16px)',
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    transition: {
      duration: cardDuration,
      delay: cardDelay,
      ease: MOVIE_EASINGS.LUXURY,
    },
    whileHover: { scale: 1.03, y: -2 },
    whileTap: { scale: 0.98 },
  };
}

export const scrollReviewsSectionVariants = Object.freeze({
  initial: { opacity: 0, y: 44, scale: 0.96, filter: 'blur(20px)' },
  whileInView: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  viewport: SCROLL_VIEWPORT_CONFIG,
  transition: { duration: 1.5, ease: MOVIE_EASINGS.LUXURY },
});
