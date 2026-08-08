'use client';

/**
 * @file app/(media)/motion.js
 * @description
 * Motion direction for the complete media surface: movie, TV and person pages.
 *
 * This file is intentionally a choreography map, not a bag of generic fades.
 * The first-load timeline belongs to the media detail page; interaction and
 * scroll reveals are kept separate so deferred data can enter the scene without
 * restarting the opening sequence.
 */

// ─── 1. MOTION LANGUAGE ──────────────────────────────────────────────────────

export const EASINGS = Object.freeze({
  // A long, quiet settle for hero and image-led movement.
  CINEMATIC: [0.16, 1, 0.3, 1],
  // A slightly more deliberate curve for typography.
  TEXT: [0.22, 1, 0.36, 1],
  // Used for controls and compact content where the movement must resolve cleanly.
  CONTROL: [0.33, 1, 0.68, 1],
  // A restrained accent curve for cards and chips.
  ACCENT: [0.32, 0.72, 0, 1],
  // Kept as a named exit language for route transitions.
  EXIT: [0.7, 0, 0.84, 0],
  // Backwards-compatible alias used by the shared background registry.
  LUXURY: [0.16, 1, 0.3, 1],
  SMOOTH: [0.25, 0.1, 0.25, 1],
});

export const DURATIONS = Object.freeze({
  BACKGROUND_REVEAL: 2.8,
  COLUMN_SLIDE: 1.45,
  POSTER_REVEAL: 1.55,
  TITLE_REVEAL: 1.0,
  TAGLINE_REVEAL: 0.82,
  OVERVIEW_REVEAL: 1.05,
  SECTION_HEADER: 0.95,
  CARD_REVEAL: 0.92,
  ACTION_BUTTON: 0.72,
  TAXONOMY_CHIP: 0.62,
  SIDEBAR_ROW: 0.66,
  DEFERRED_SECTION: 1.05,
  SCROLL_SECTION: 1.15,
  TAB_SWITCH: 0.48,
});

export const BLURS = Object.freeze({
  NONE: 'blur(0px)',
  SUBTLE: 'blur(5px)',
  LIGHT: 'blur(9px)',
  MEDIUM: 'blur(14px)',
  DEEP: 'blur(20px)',
  CINEMATIC: 'blur(28px)',
});

export const SCALES = Object.freeze({
  IDENTITY: 1,
  COMPACT: 0.975,
  CARD: 0.965,
  HERO: 0.94,
  DEEP: 0.9,
});

// This is the order of the visual story. It is shared by Movie and TV; TV only
// inserts its seasons chapter between cast and visual media.
export const TIMELINES = Object.freeze({
  BACKGROUND_DELAY: 0.12,
  SIDEBAR_COLUMN_DELAY: 0.16,
  POSTER_DELAY: 0.28,
  ACTION_BUTTON_BASE_DELAY: 0.92,
  ACTION_BUTTON_STEP: 0.075,
  TAXONOMY_BASE_DELAY: 1.35,
  TAXONOMY_STEP: 0.055,
  SIDEBAR_ROWS_DELAY: 1.68,
  SIDEBAR_ROW_STEP: 0.075,

  HERO_TITLE_DELAY: 0.48,
  TAGLINE_DELAY: 1.08,
  SOCIAL_PROOF_DELAY: 1.28,
  OVERVIEW_DELAY: 1.42,

  CAST_SECTION_BASE_DELAY: 2.05,
  CAST_CARD_STEP: 0.12,
  TV_SEASONS_SECTION_BASE_DELAY: 2.75,
  GALLERY_SECTION_BASE_DELAY: 3.35,
  IMAGES_SECTION_BASE_DELAY: 3.95,
  VIDEOS_SECTION_BASE_DELAY: 4.55,
  DISCOVERY_SECTION_BASE_DELAY: 5.1,
  REVIEWS_SECTION_BASE_DELAY: 5.7,
  GALLERY_CARD_STEP: 0.075,
  TAB_SWITCH_CARD_STEP: 0.045,
});

export const PERSON_TIMELINES = Object.freeze({
  HERO_TITLE_DELAY: 0.42,
  PORTRAIT_DELAY: 0.24,
  BIO_DELAY: 1.1,
  GALLERY_BASE_DELAY: 1.9,
  FILMOGRAPHY_BASE_DELAY: 2.5,
  TIMELINE_BASE_DELAY: 1.75,
  AWARDS_BASE_DELAY: 1.75,
});

export const MEDIA_DETAIL_TIMELINE = Object.freeze({
  opening: Object.freeze({
    background: TIMELINES.BACKGROUND_DELAY,
    sidebar: TIMELINES.SIDEBAR_COLUMN_DELAY,
    main: 0.3,
  }),
  sidebar: Object.freeze({
    poster: TIMELINES.POSTER_DELAY,
    actions: TIMELINES.ACTION_BUTTON_BASE_DELAY,
    taxonomy: TIMELINES.TAXONOMY_BASE_DELAY,
    rows: TIMELINES.SIDEBAR_ROWS_DELAY,
  }),
  hero: Object.freeze({
    title: TIMELINES.HERO_TITLE_DELAY,
    tagline: TIMELINES.TAGLINE_DELAY,
    socialProof: TIMELINES.SOCIAL_PROOF_DELAY,
    overview: TIMELINES.OVERVIEW_DELAY,
  }),
  chapters: Object.freeze({
    cast: TIMELINES.CAST_SECTION_BASE_DELAY,
    seasons: TIMELINES.TV_SEASONS_SECTION_BASE_DELAY,
    gallery: TIMELINES.GALLERY_SECTION_BASE_DELAY,
    images: TIMELINES.IMAGES_SECTION_BASE_DELAY,
    videos: TIMELINES.VIDEOS_SECTION_BASE_DELAY,
    discovery: TIMELINES.DISCOVERY_SECTION_BASE_DELAY,
    reviews: TIMELINES.REVIEWS_SECTION_BASE_DELAY,
  }),
});

// Deferred chapters are anchored to the opening scene instead of the moment
// their Suspense boundary resolves. This prevents a fast secondary response
// from overtaking the title, overview or cast chapter.
const DEFERRED_CHAPTER_TARGETS = Object.freeze({
  cast: MEDIA_DETAIL_TIMELINE.chapters.cast,
  seasons: MEDIA_DETAIL_TIMELINE.chapters.seasons,
  gallery: MEDIA_DETAIL_TIMELINE.chapters.gallery,
  images: MEDIA_DETAIL_TIMELINE.chapters.images,
  videos: MEDIA_DETAIL_TIMELINE.chapters.videos,
  discovery: MEDIA_DETAIL_TIMELINE.chapters.discovery,
  filmography: PERSON_TIMELINES.FILMOGRAPHY_BASE_DELAY,
  generic: PERSON_TIMELINES.GALLERY_BASE_DELAY,
});

export function getMotionTimestamp() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

export function getDeferredChapterDelay(chapterKey = 'generic', choreographyStartedAt = null) {
  const target = DEFERRED_CHAPTER_TARGETS[chapterKey] || DEFERRED_CHAPTER_TARGETS.generic;

  if (!Number.isFinite(Number(choreographyStartedAt))) {
    return target;
  }

  const elapsed = Math.max(0, (getMotionTimestamp() - Number(choreographyStartedAt)) / 1000);
  return Math.max(0.12, target - elapsed);
}

// These props keep text choreography in this file even though BlurryText owns
// the per-character implementation.
export const MEDIA_DETAIL_TEXT = Object.freeze({
  TITLE: Object.freeze({
    by: 'word',
    delay: TIMELINES.HERO_TITLE_DELAY,
    duration: 0.72,
    stagger: 0.04,
    initialBlur: BLURS.SUBTLE,
    initialY: 10,
    initialScale: 1,
    ease: EASINGS.TEXT,
  }),
  TAGLINE: Object.freeze({
    by: 'word',
    delay: TIMELINES.TAGLINE_DELAY,
    duration: 0.58,
    stagger: 0.045,
    initialBlur: BLURS.SUBTLE,
    initialY: 8,
    initialScale: 1,
    ease: EASINGS.TEXT,
  }),
});

export const PERSON_TEXT = Object.freeze({
  TITLE: Object.freeze({
    by: 'word',
    delay: PERSON_TIMELINES.HERO_TITLE_DELAY,
    duration: 0.72,
    stagger: 0.04,
    initialBlur: BLURS.SUBTLE,
    initialY: 10,
    initialScale: 1,
    ease: EASINGS.TEXT,
  }),
});

export const SCROLL_VIEWPORT_CONFIG = Object.freeze({
  once: true,
  amount: 0.12,
  margin: '0px 0px 120px 0px',
});

// ─── 2. OPENING SCENE ────────────────────────────────────────────────────────

export const MEDIA_BACKGROUND_ANIMATION = Object.freeze({
  initial: { opacity: 0, scale: 1.08, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, scale: 1, filter: BLURS.NONE },
  exit: { opacity: 0, scale: 1.06, filter: BLURS.DEEP },
  transition: {
    duration: DURATIONS.BACKGROUND_REVEAL,
    delay: TIMELINES.BACKGROUND_DELAY,
    ease: EASINGS.CINEMATIC,
  },
  exitDurationFactor: 0.45,
});

export const sidebarColumnVariants = Object.freeze({
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: {
    duration: DURATIONS.COLUMN_SLIDE,
    delay: TIMELINES.SIDEBAR_COLUMN_DELAY,
    ease: EASINGS.CINEMATIC,
  },
});

export const mainContentColumnVariants = Object.freeze({
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: {
    duration: DURATIONS.COLUMN_SLIDE,
    delay: 0.3,
    ease: EASINGS.CINEMATIC,
  },
});

export const sidebarPosterVariants = Object.freeze({
  initial: { opacity: 0, y: 22, scale: SCALES.DEEP, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.POSTER_REVEAL,
    delay: TIMELINES.POSTER_DELAY,
    ease: EASINGS.CINEMATIC,
  },
});

export const personPortraitVariants = Object.freeze({
  initial: { opacity: 0, scale: 0.86, y: 14, filter: BLURS.MEDIUM },
  animate: { opacity: 1, scale: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: 1.1,
    delay: PERSON_TIMELINES.PORTRAIT_DELAY,
    ease: EASINGS.CINEMATIC,
  },
});

export const heroTitleVariants = Object.freeze({
  initial: { opacity: 0, y: 20, scale: SCALES.HERO, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.TITLE_REVEAL,
    delay: TIMELINES.HERO_TITLE_DELAY,
    ease: EASINGS.TEXT,
  },
});

export const heroSocialProofVariants = Object.freeze({
  initial: { opacity: 0, scale: 0.9, y: 10, filter: BLURS.LIGHT },
  animate: { opacity: 1, scale: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: 0.86,
    delay: TIMELINES.SOCIAL_PROOF_DELAY,
    ease: EASINGS.CONTROL,
  },
});

export const heroTaglineVariants = Object.freeze({
  initial: { opacity: 0, y: 8, filter: BLURS.SUBTLE },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.TAGLINE_REVEAL,
    delay: TIMELINES.TAGLINE_DELAY,
    ease: EASINGS.TEXT,
  },
});

export const heroOverviewVariants = Object.freeze({
  initial: { opacity: 0, y: 14, filter: BLURS.MEDIUM },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.OVERVIEW_REVEAL,
    delay: TIMELINES.OVERVIEW_DELAY,
    ease: EASINGS.CINEMATIC,
  },
});

// ─── 3. SIDEBAR AND ACTIONS ──────────────────────────────────────────────────

export function getActionButtonProps(index = 0) {
  return {
    initial: { opacity: 0, y: 14, scale: 0.94, filter: BLURS.LIGHT },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.ACTION_BUTTON,
      delay: TIMELINES.ACTION_BUTTON_BASE_DELAY + index * TIMELINES.ACTION_BUTTON_STEP,
      ease: EASINGS.CONTROL,
    },
    whileHover: { y: -2, scale: 1.025, transition: { duration: 0.25, ease: EASINGS.CONTROL } },
    whileTap: { scale: 0.97, transition: { duration: 0.16, ease: EASINGS.CONTROL } },
  };
}

export function getCarouselButtonProps(baseDelay = 0.18) {
  return {
    initial: { opacity: 0, scale: 0.84, filter: BLURS.LIGHT },
    animate: { opacity: 1, scale: 1, filter: BLURS.NONE },
    exit: { opacity: 0, scale: 0.84, filter: BLURS.LIGHT },
    transition: {
      duration: 0.72,
      delay: baseDelay + 0.12,
      ease: EASINGS.CONTROL,
    },
    whileHover: { scale: 1.08, transition: { duration: 0.22, ease: EASINGS.CONTROL } },
    whileTap: { scale: 0.92, transition: { duration: 0.16, ease: EASINGS.CONTROL } },
  };
}

export function getTaxonomyHeaderProps(baseDelay = TIMELINES.TAXONOMY_BASE_DELAY) {
  return {
    initial: { opacity: 0, x: -16, clipPath: 'inset(0 100% 0 0)', filter: BLURS.LIGHT },
    animate: { opacity: 1, x: 0, clipPath: 'inset(0 0% 0 0)', filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.TAXONOMY_CHIP,
      delay: baseDelay,
      ease: EASINGS.TEXT,
    },
  };
}

export function getTaxonomyChipProps(currentIndex = 0, baseDelay = TIMELINES.TAXONOMY_BASE_DELAY) {
  return {
    initial: { opacity: 0, y: 8, scale: 0.88, filter: BLURS.LIGHT },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.TAXONOMY_CHIP,
      delay: baseDelay + (currentIndex + 1) * TIMELINES.TAXONOMY_STEP,
      ease: EASINGS.ACCENT,
    },
    whileHover: { y: -1, scale: 1.035, transition: { duration: 0.2 } },
  };
}

export function getSidebarRowProps(index = 0, baseDelay = TIMELINES.SIDEBAR_ROWS_DELAY) {
  return {
    initial: { opacity: 0, x: -12, filter: BLURS.SUBTLE },
    animate: { opacity: 1, x: 0, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.SIDEBAR_ROW,
      delay: baseDelay + index * TIMELINES.SIDEBAR_ROW_STEP,
      ease: EASINGS.CONTROL,
    },
  };
}

// ─── 4. CHAPTER-BASED SCROLL REVEALS ─────────────────────────────────────────

const SECTION_HEADER_PRESETS = Object.freeze({
  cast: Object.freeze({
    initial: { opacity: 0, y: 18, scale: 0.985, filter: BLURS.MEDIUM },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  }),
  seasons: Object.freeze({
    initial: { opacity: 0, y: 14, scale: 0.985, filter: BLURS.MEDIUM },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  }),
  gallery: Object.freeze({
    initial: { opacity: 0, y: 16, scale: 0.985, filter: BLURS.MEDIUM },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  }),
  images: Object.freeze({
    initial: { opacity: 0, y: 10, scale: 0.98, filter: BLURS.SUBTLE },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  }),
  videos: Object.freeze({
    initial: { opacity: 0, y: 18, scale: 0.985, filter: BLURS.MEDIUM },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  }),
  filmography: Object.freeze({
    initial: { opacity: 0, y: 16, filter: BLURS.MEDIUM },
    animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  }),
  generic: Object.freeze({
    initial: { opacity: 0, y: 16, filter: BLURS.LIGHT },
    animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  }),
});

const CARD_PRESETS = Object.freeze({
  cast: Object.freeze({ initial: { opacity: 0, y: 18, scale: 0.98 } }),
  seasons: Object.freeze({ initial: { opacity: 0, y: 16, scale: 0.97 } }),
  gallery: Object.freeze({ initial: { opacity: 0, y: 20, scale: 0.965 } }),
  images: Object.freeze({ initial: { opacity: 0, y: 18, scale: 0.965 } }),
  videos: Object.freeze({ initial: { opacity: 0, y: 18, scale: 0.975 } }),
  filmography: Object.freeze({ initial: { opacity: 0, y: 18, scale: 0.97 } }),
  related: Object.freeze({ initial: { opacity: 0, y: 20, scale: 0.97 } }),
  generic: Object.freeze({ initial: { opacity: 0, y: 18, scale: 0.975 } }),
});

function getSectionPreset(sectionKey, hasSwitchedTab = false) {
  const preset = SECTION_HEADER_PRESETS[sectionKey] || SECTION_HEADER_PRESETS.generic;
  if (!hasSwitchedTab) return preset;
  return {
    initial: { opacity: 0, y: 8, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
  };
}

function getCardPreset(sectionKey, hasSwitchedTab = false) {
  if (hasSwitchedTab) {
    return {
      initial: { opacity: 0, y: 8, scale: 0.985 },
    };
  }
  return CARD_PRESETS[sectionKey] || CARD_PRESETS.generic;
}

export function getSectionHeaderProps(
  baseDelay = 0,
  hasSwitchedTab = false,
  sectionKey = 'generic',
) {
  const preset = getSectionPreset(sectionKey, hasSwitchedTab);
  return {
    initial: preset.initial,
    animate: preset.animate,
    transition: {
      duration: hasSwitchedTab ? DURATIONS.TAB_SWITCH : DURATIONS.SECTION_HEADER,
      delay: hasSwitchedTab ? 0 : baseDelay,
      ease: hasSwitchedTab ? EASINGS.CONTROL : EASINGS.CINEMATIC,
    },
  };
}

export function getMediaCardProps(
  index = 0,
  baseDelay = 0,
  hasSwitchedTab = false,
  sectionKey = 'generic',
  enableHover = true,
) {
  const preset = getCardPreset(sectionKey, hasSwitchedTab);
  const cardStep = sectionKey === 'cast' ? TIMELINES.CAST_CARD_STEP : TIMELINES.GALLERY_CARD_STEP;
  const cardDelay = hasSwitchedTab
    ? index * TIMELINES.TAB_SWITCH_CARD_STEP
    : baseDelay + Math.min(index * cardStep, sectionKey === 'cast' ? 0.72 : 0.48);
  return {
    initial: preset.initial,
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    transition: {
      duration: hasSwitchedTab ? DURATIONS.TAB_SWITCH : DURATIONS.CARD_REVEAL,
      delay: cardDelay,
      ease: hasSwitchedTab ? EASINGS.CONTROL : EASINGS.CINEMATIC,
    },
    ...(enableHover
      ? {
          whileHover: {
            y: sectionKey === 'videos' ? -3 : -2,
            scale: sectionKey === 'cast' ? 1.012 : 1.025,
            transition: { duration: 0.28, ease: EASINGS.CONTROL },
          },
          whileTap: { scale: 0.98, transition: { duration: 0.16 } },
        }
      : {}),
  };
}

export function getCastHeaderProps(
  baseDelay = TIMELINES.CAST_SECTION_BASE_DELAY,
  hasSwitchedTab = false,
) {
  return getSectionHeaderProps(baseDelay, hasSwitchedTab, 'cast');
}

export function getCastCardProps(
  index = 0,
  baseDelay = TIMELINES.CAST_SECTION_BASE_DELAY,
  hasSwitchedTab = false,
) {
  return getMediaCardProps(index, baseDelay, hasSwitchedTab, 'cast', false);
}

export function getCastHoverProps() {
  return {
    initial: false,
    whileHover: { y: -2, scale: 1.012 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.28, ease: EASINGS.CONTROL },
  };
}

export function getScrollSectionProps(sectionKey = 'related', baseDelay = 0) {
  const presets = {
    related: {
      initial: { opacity: 0, y: 22, scale: 0.985, filter: BLURS.MEDIUM },
      whileInView: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    },
    reviews: {
      initial: { opacity: 0, y: 18, scale: 0.99, filter: BLURS.LIGHT },
      whileInView: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    },
    videos: {
      initial: { opacity: 0, y: 20, scale: 0.985, filter: BLURS.MEDIUM },
      whileInView: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    },
  };
  const preset = presets[sectionKey] || presets.related;
  return {
    initial: preset.initial,
    whileInView: preset.whileInView,
    viewport: SCROLL_VIEWPORT_CONFIG,
    transition: {
      duration: DURATIONS.SCROLL_SECTION,
      delay: Math.min(Math.max(baseDelay, 0), 0.14),
      ease: EASINGS.CINEMATIC,
    },
  };
}

export const scrollSectionVariants = Object.freeze(getScrollSectionProps('related'));
export const scrollReviewsSectionVariants = Object.freeze(getScrollSectionProps('reviews'));

// ─── 5. PERSON CHAPTERS ──────────────────────────────────────────────────────

export const personTitleVariants = Object.freeze({
  initial: { opacity: 0, y: 18, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.TITLE_REVEAL,
    delay: PERSON_TIMELINES.HERO_TITLE_DELAY,
    ease: EASINGS.TEXT,
  },
});

export const personBioVariants = Object.freeze({
  initial: { opacity: 0, y: 14, filter: BLURS.MEDIUM },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.OVERVIEW_REVEAL,
    delay: PERSON_TIMELINES.BIO_DELAY,
    ease: EASINGS.CINEMATIC,
  },
});

export const deferredContentFallbackVariants = Object.freeze({
  initial: { opacity: 0, y: 12, filter: BLURS.LIGHT },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: { duration: DURATIONS.DEFERRED_SECTION, ease: EASINGS.CINEMATIC },
});
