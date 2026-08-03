'use client';

/**
 * @file features/media/motion.js
 * @description Shared Media Detail Pages (Movie, TV & Person) sinematik animasyon tanımları.
 */

// 1. EASINGS & DURATIONS & TIMELINE CONSTANTS
export const EASINGS = Object.freeze({
  LUXURY: [0.19, 1, 0.22, 1],
  CINEMATIC: [0.19, 1, 0.22, 1],
  SMOOTH: [0.25, 0.1, 0.25, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.7, 0, 0.84, 0],
});

export const DURATIONS = Object.freeze({
  BACKGROUND_REVEAL: 2.2,
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

export const BLURS = Object.freeze({
  NONE: 'blur(0px)',
  LIGHT: 'blur(12px)',
  MEDIUM: 'blur(16px)',
  DEEP: 'blur(20px)',
  CINEMATIC: 'blur(24px)',
});

export const SCALES = Object.freeze({
  COMPACT: 0.96,
  CARD: 0.94,
  HERO: 0.92,
  DEEP: 0.88,
});

export const MEDIA_BACKGROUND_ANIMATION = Object.freeze({
  initial: { opacity: 0, scale: 1.1, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, scale: 1, filter: BLURS.NONE },
  exit: { opacity: 0, scale: 0.9, filter: BLURS.MEDIUM },
  transition: {
    duration: DURATIONS.BACKGROUND_REVEAL,
    delay: 0.25,
    ease: EASINGS.LUXURY,
  },
  exitDurationFactor: 0.4,
});

export const TIMELINES = Object.freeze({
  SIDEBAR_COLUMN_DELAY: 0,
  POSTER_DELAY: 0.1,
  ACTION_BUTTON_BASE_DELAY: 0.15,
  ACTION_BUTTON_STEP: 0.06,
  TAXONOMY_BASE_DELAY: 0.5,
  TAXONOMY_STEP: 0.05,
  SIDEBAR_ROW_STEP: 0.06,
  HERO_TITLE_DELAY: 0.15,
  SOCIAL_PROOF_DELAY: 0.35,
  TAGLINE_DELAY: 0.5,
  OVERVIEW_DELAY: 0.65,
  CAST_SECTION_BASE_DELAY: 0.85,
  CAST_CARD_STEP: 0.12,
  GALLERY_SECTION_BASE_DELAY: 1.8,
  GALLERY_CARD_STEP: 0.1,
  IMAGES_SECTION_BASE_DELAY: 2.4,
  IMAGES_CARD_STEP: 0.1,
  TAB_SWITCH_CARD_STEP: 0.04,
});

export const PERSON_TIMELINES = Object.freeze({
  HERO_TITLE_DELAY: 0.1,
  BIO_DELAY: 0.3,
  GALLERY_BASE_DELAY: 0.55,
  FILMOGRAPHY_BASE_DELAY: 0.85,
  TIMELINE_BASE_DELAY: 0.4,
  AWARDS_BASE_DELAY: 0.4,
});

export const personTitleVariants = Object.freeze({
  initial: { opacity: 0, y: 36, scale: SCALES.CARD, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.TITLE_REVEAL,
    delay: PERSON_TIMELINES.HERO_TITLE_DELAY,
    ease: EASINGS.LUXURY,
  },
});

export const personBioVariants = Object.freeze({
  initial: { opacity: 0, y: 28, filter: BLURS.MEDIUM },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.OVERVIEW_REVEAL,
    delay: PERSON_TIMELINES.BIO_DELAY,
    ease: EASINGS.LUXURY,
  },
});

export const SCROLL_VIEWPORT_CONFIG = Object.freeze({
  once: true,
  amount: 0.4,
  margin: '0px 0px -150px 0px',
});

// 2. SIDEBAR COLUMN & POSTER VARIANTS
export const sidebarColumnVariants = Object.freeze({
  initial: { opacity: 0, x: -44, filter: BLURS.MEDIUM },
  animate: { opacity: 1, x: 0, filter: BLURS.NONE },
  transition: { duration: DURATIONS.COLUMN_SLIDE, ease: EASINGS.LUXURY },
});

export const sidebarPosterVariants = Object.freeze({
  initial: { opacity: 0, y: 36, scale: SCALES.DEEP, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.POSTER_REVEAL,
    delay: TIMELINES.POSTER_DELAY,
    ease: EASINGS.LUXURY,
  },
});

export function getCarouselButtonProps(baseDelay = 0.5) {
  return {
    initial: { opacity: 0, scale: 0.8, filter: BLURS.LIGHT },
    animate: { opacity: 1, scale: 1, filter: BLURS.NONE },
    exit: { opacity: 0, scale: 0.8, filter: BLURS.LIGHT },
    transition: {
      duration: DURATIONS.SECTION_HEADER,
      delay: baseDelay + 0.2,
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.1 },
    whileTap: { scale: 0.9 },
  };
}

// 3. COLLECTION ACTIONS VARIANTS
export function getActionButtonProps(index = 0) {
  return {
    initial: { opacity: 0, y: 20, scale: SCALES.COMPACT, filter: BLURS.LIGHT },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.ACTION_BUTTON,
      delay: TIMELINES.ACTION_BUTTON_BASE_DELAY + index * TIMELINES.ACTION_BUTTON_STEP,
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.03, y: -2 },
    whileTap: { scale: 0.97 },
  };
}

// 4. TAXONOMY & SIDEBAR ROWS VARIANTS
export function getTaxonomyHeaderProps(baseDelay = TIMELINES.TAXONOMY_BASE_DELAY) {
  return {
    initial: { opacity: 0, x: -24, filter: BLURS.LIGHT },
    animate: { opacity: 1, x: 0, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.TAXONOMY_CHIP,
      delay: baseDelay,
      ease: EASINGS.LUXURY,
    },
  };
}

export function getTaxonomyChipProps(currentIndex = 0, baseDelay = TIMELINES.TAXONOMY_BASE_DELAY) {
  return {
    initial: { opacity: 0, x: -24, filter: BLURS.LIGHT },
    animate: { opacity: 1, x: 0, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.TAXONOMY_CHIP,
      delay: baseDelay + (currentIndex + 1) * TIMELINES.TAXONOMY_STEP,
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.06 },
  };
}

export function getSidebarRowProps(index = 0, baseDelay = TIMELINES.TAXONOMY_BASE_DELAY) {
  return {
    initial: { opacity: 0, x: -28, filter: BLURS.MEDIUM },
    animate: { opacity: 1, x: 0, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.SIDEBAR_ROW,
      delay: baseDelay + index * TIMELINES.SIDEBAR_ROW_STEP,
      ease: EASINGS.LUXURY,
    },
  };
}

// 5. MAIN CONTENT COLUMN & HERO VARIANTS
export const mainContentColumnVariants = Object.freeze({
  initial: { opacity: 0, x: 44, filter: BLURS.MEDIUM },
  animate: { opacity: 1, x: 0, filter: BLURS.NONE },
  transition: { duration: DURATIONS.COLUMN_SLIDE, ease: EASINGS.LUXURY },
});

export const heroTitleVariants = Object.freeze({
  initial: { opacity: 0, y: 36, scale: SCALES.CARD, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.TITLE_REVEAL,
    delay: TIMELINES.HERO_TITLE_DELAY,
    ease: EASINGS.LUXURY,
  },
});

export const heroSocialProofVariants = Object.freeze({
  initial: { opacity: 0, y: 24, scale: SCALES.DEEP, filter: BLURS.MEDIUM },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: 1.3,
    delay: TIMELINES.SOCIAL_PROOF_DELAY,
    ease: EASINGS.LUXURY,
  },
});

export const heroTaglineVariants = Object.freeze({
  initial: { opacity: 0, y: 24, filter: BLURS.MEDIUM },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: 1.2,
    delay: TIMELINES.TAGLINE_DELAY,
    ease: EASINGS.LUXURY,
  },
});

export const heroOverviewVariants = Object.freeze({
  initial: { opacity: 0, y: 28, filter: BLURS.MEDIUM },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.OVERVIEW_REVEAL,
    delay: TIMELINES.OVERVIEW_DELAY,
    ease: EASINGS.LUXURY,
  },
});

// 6. CAST SECTION VARIANTS
export function getCastHeaderProps(
  baseDelay = TIMELINES.CAST_SECTION_BASE_DELAY,
  hasSwitchedTab = false,
) {
  return {
    initial: {
      opacity: 0,
      y: hasSwitchedTab ? 12 : 28,
      scale: SCALES.CARD,
      filter: hasSwitchedTab ? 'blur(6px)' : BLURS.MEDIUM,
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: hasSwitchedTab ? DURATIONS.TAB_SWITCH_CARD : DURATIONS.SECTION_HEADER,
      delay: hasSwitchedTab ? 0 : baseDelay + 0.1,
      ease: EASINGS.LUXURY,
    },
  };
}

export function getCastCardProps(
  index = 0,
  baseDelay = TIMELINES.CAST_SECTION_BASE_DELAY,
  hasSwitchedTab = false,
) {
  const cardDelay = hasSwitchedTab
    ? index * TIMELINES.TAB_SWITCH_CARD_STEP
    : baseDelay + 0.1 + index * TIMELINES.CAST_CARD_STEP;
  const cardDuration = hasSwitchedTab ? DURATIONS.TAB_SWITCH_CARD : DURATIONS.CARD_REVEAL;

  return {
    initial: {
      opacity: 0,
      y: hasSwitchedTab ? 12 : 32,
      scale: SCALES.HERO,
      filter: hasSwitchedTab ? 'blur(6px)' : BLURS.MEDIUM,
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: cardDuration,
      delay: cardDelay,
      ease: EASINGS.LUXURY,
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
      scale: SCALES.CARD,
      filter: hasSwitchedTab ? 'blur(6px)' : BLURS.MEDIUM,
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: hasSwitchedTab ? DURATIONS.TAB_SWITCH_CARD : DURATIONS.SECTION_HEADER,
      delay: hasSwitchedTab ? 0 : baseDelay + 0.1,
      ease: EASINGS.LUXURY,
    },
  };
}

export function getMediaCardProps(index = 0, baseDelay = 0, hasSwitchedTab = false) {
  const cardDelay = hasSwitchedTab
    ? index * TIMELINES.TAB_SWITCH_CARD_STEP
    : baseDelay + 0.1 + index * TIMELINES.GALLERY_CARD_STEP;
  const cardDuration = hasSwitchedTab ? DURATIONS.TAB_SWITCH_CARD : DURATIONS.CARD_REVEAL;

  return {
    initial: {
      opacity: 0,
      y: hasSwitchedTab ? 12 : 28,
      scale: SCALES.CARD,
      filter: hasSwitchedTab ? 'blur(6px)' : BLURS.MEDIUM,
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: cardDuration,
      delay: cardDelay,
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.03, y: -2 },
    whileTap: { scale: 0.98 },
  };
}

export const scrollSectionVariants = Object.freeze({
  initial: { opacity: 0, y: 44, scale: SCALES.COMPACT, filter: BLURS.DEEP },
  whileInView: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  viewport: SCROLL_VIEWPORT_CONFIG,
  transition: { duration: 1.5, ease: EASINGS.LUXURY },
});

export const scrollReviewsSectionVariants = scrollSectionVariants;

