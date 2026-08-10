/**
 * @file app/(account)/motion.js
 * @description Shared animation definitions for account routes.
 */

// ─── 1. EASINGS ───────────────────────────────────────────────────────────────
// Roles are now differentiated instead of everything sharing LUXURY:
//   LUXURY    → hero-tier reveals (biggest, slowest, most "cinematic")
//   CINEMATIC → section/card-tier reveals (was an unused duplicate of LUXURY)
//   SMOOTH    → soft opacity-only fades (overlays)
//   CONTROL   → UI chrome: nav items, buttons, filter chips, pagination (snappier)
//   ACCENT    → small emphasis details (underline, selected state)
//   EXIT      → exits
// If any other account-route file imports EASINGS.CINEMATIC or EASINGS.ACCENT
// directly, double check them - their values below are new, not carried over
// (they were unused/duplicate before, so this should be safe).

export const EASINGS = Object.freeze({
  LUXURY: [0.16, 1, 0.3, 1],
  CINEMATIC: [0.19, 1, 0.22, 1],
  SMOOTH: [0.22, 1, 0.36, 1],
  CONTROL: [0.33, 1, 0.68, 1],
  ACCENT: [0.25, 0.8, 0.25, 1],
  EXIT: [0.7, 0, 0.84, 0],
});

// ─── 2. DURATIONS & TIMELINES ───────────────────────────────────────────────────

export const DURATIONS = Object.freeze({
  NAV: 0.75,
  HERO_AVATAR: 1.25,
  HERO_NAME: 1.1,
  HERO_STATS: 0.95,
  HERO_BIO: 0.85,
  SECTION: 1.05,
  SECTION_HEADING: 0.85,
  CARD: 0.85,
  CARD_FAST: 0.65,
  STAGGER: 0.08,
  MICRO_STAGGER: 0.045,
  PAGE: 1.0,
});

export const TIMELINES = Object.freeze({
  NAV_BASE_DELAY: 0.08,
  HERO_BASE_DELAY: 0.25,
  FIRST_SECTION_BASE_DELAY: 0.55,
});

// ─── 3. SPRINGS ───────────────────────────────────────────────────────────────

export const SPRINGS = Object.freeze({
  CARD: Object.freeze({ type: 'spring', stiffness: 220, damping: 24, mass: 0.8 }),
  POSTER_CARD: Object.freeze({ type: 'spring', stiffness: 240, damping: 24, mass: 0.7 }),
  BUTTON: Object.freeze({ type: 'spring', stiffness: 280, damping: 24, mass: 0.5 }),
  NAV_TAB: Object.freeze({ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }),
  HERO_AVATAR: Object.freeze({ type: 'spring', stiffness: 180, damping: 22, mass: 0.9 }),
  STAT_COUNTER: Object.freeze({ type: 'spring', stiffness: 240, damping: 22 }),
  // NEW - quick, high-stiffness snap for tap/press feedback, used across all
  // interactive elements below so tap always feels the same "weight".
  TAP: Object.freeze({ type: 'spring', stiffness: 500, damping: 30, mass: 0.5 }),
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

// ─── 5b. ACCESSIBILITY ─────────────────────────────────────────────────────────
// Same helper as the media-detail motion file - wrap any exported props with
// this at the call site to collapse to a short opacity fade when the user
// has requested reduced motion. Worth eventually moving to a shared
// core/motion module so both route groups use the exact same implementation
// instead of two copies drifting apart.

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function toOpacityOnly(state) {
  if (!state || typeof state !== 'object') return state;
  return { opacity: state.opacity ?? 1 };
}

export function getMotionSafeProps(props) {
  if (!props || !prefersReducedMotion()) return props;
  return {
    ...props,
    initial: toOpacityOnly(props.initial ?? { opacity: 0 }),
    animate: props.animate ? toOpacityOnly(props.animate) : undefined,
    whileInView: props.whileInView ? toOpacityOnly(props.whileInView) : undefined,
    exit: props.exit ? toOpacityOnly(props.exit) : undefined,
    transition: { duration: 0.2, ease: 'linear', delay: 0 },
    whileHover: undefined,
    whileTap: undefined,
  };
}

// ─── 6. TOP NAV BAR (STEP 1 IN TOP-TO-BOTTOM CHOREOGRAPHY) ─────────────────────

export const navBarVariants = Object.freeze({
  initial: { opacity: 0, y: -16, filter: BLURS.LIGHT },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.NAV,
    delay: TIMELINES.NAV_BASE_DELAY,
    ease: EASINGS.LUXURY,
  },
});

export function getNavItemProps(index = 0) {
  return {
    initial: { opacity: 0, y: -8, scale: SCALES.COMPACT, filter: BLURS.SUBTLE },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: 0.45,
      delay: TIMELINES.NAV_BASE_DELAY + 0.04 + index * 0.03,
      ease: EASINGS.CONTROL,
    },
    whileHover: { scale: 0.9, transition: SPRINGS.NAV_TAB },
    whileTap: { scale: 1.1, transition: SPRINGS.TAP },
  };
}

// ─── 7. HERO ANIMATIONS (STEP 2 IN TOP-TO-BOTTOM CHOREOGRAPHY) ───────────────

export const heroBannerVariants = Object.freeze({
  initial: { opacity: 0, scale: 1.06, filter: BLURS.CINEMATIC },
  animate: { opacity: 1, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: 1.4,
    ease: EASINGS.LUXURY,
  },
});

export const heroOverlayVariants = Object.freeze({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: {
    duration: 1.0,
    ease: EASINGS.SMOOTH,
    delay: 0.15,
  },
});

export const heroAvatarVariants = Object.freeze({
  initial: { opacity: 0, y: 16, scale: 0.9, filter: BLURS.DEEP },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.HERO_AVATAR,
    delay: TIMELINES.HERO_BASE_DELAY,
    ease: EASINGS.LUXURY,
  },
  // SPRINGS.HERO_AVATAR existed but was never referenced anywhere. Added a
  // subtle hover lift here (common on profile pages, e.g. "change photo"
  // affordance) - remove whileHover/whileTap if the avatar isn't interactive.
  whileHover: { scale: 1.02, transition: SPRINGS.HERO_AVATAR },
  whileTap: { scale: 0.98, transition: SPRINGS.TAP },
});

export const heroNameVariants = Object.freeze({
  initial: { opacity: 0, y: 16, scale: SCALES.CARD, filter: BLURS.MEDIUM },
  animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.HERO_NAME,
    delay: TIMELINES.HERO_BASE_DELAY + 0.08,
    ease: EASINGS.LUXURY,
  },
});

export function getHeroStatProps(index = 0) {
  return {
    initial: { opacity: 0, y: 12, scale: SCALES.HERO, filter: BLURS.LIGHT },
    animate: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    transition: {
      duration: DURATIONS.HERO_STATS,
      delay: TIMELINES.HERO_BASE_DELAY + 0.16 + index * DURATIONS.MICRO_STAGGER,
      ease: EASINGS.LUXURY,
    },
    whileHover: { scale: 1.06, transition: SPRINGS.STAT_COUNTER },
    whileTap: { scale: 0.95, transition: SPRINGS.TAP },
  };
}

export const heroBioVariants = Object.freeze({
  initial: { opacity: 0, y: 10, filter: BLURS.SUBTLE },
  animate: { opacity: 1, y: 0, filter: BLURS.NONE },
  transition: {
    duration: DURATIONS.HERO_BIO,
    delay: TIMELINES.HERO_BASE_DELAY + 0.26,
    ease: EASINGS.LUXURY,
  },
});

// ─── 8. PAGE CONTAINER & SECTIONS (STEP 3 IN TOP-TO-BOTTOM CHOREOGRAPHY) ──────

export const pageContainerVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATIONS.PAGE,
      ease: EASINGS.LUXURY,
      // NOTE: getSectionRevealProps below computes its own explicit `delay`
      // per section rather than using named variants ("hidden"/"visible"),
      // so it doesn't participate in this staggerChildren/delayChildren
      // orchestration - it likely has no effect unless some other child in
      // the tree uses the hidden/visible variant names directly. Worth
      // verifying against how <motion.div variants={pageContainerVariants}>
      // is actually consumed before assuming this stagger is doing anything.
      staggerChildren: DURATIONS.STAGGER,
      delayChildren: TIMELINES.FIRST_SECTION_BASE_DELAY,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: SCALES.COMPACT,
    filter: BLURS.MEDIUM,
    transition: {
      duration: 0.35,
      ease: EASINGS.EXIT,
    },
  },
});

export function getSectionRevealProps(index = 0, isInitialSection = false) {
  const calculatedDelay = isInitialSection
    ? TIMELINES.FIRST_SECTION_BASE_DELAY
    : index * 0.1;

  return {
    initial: { opacity: 0, y: 32, scale: SCALES.CARD, filter: BLURS.MEDIUM },
    whileInView: { opacity: 1, y: 0, scale: 1, filter: BLURS.NONE },
    viewport: SCROLL_VIEWPORT,
    transition: {
      duration: DURATIONS.SECTION,
      delay: calculatedDelay,
      // Section tier, one notch below hero - CINEMATIC instead of LUXURY.
      ease: EASINGS.CINEMATIC,
    },
  };
}

export const sectionHeadingVariants = Object.freeze({
  initial: { opacity: 0, x: -16, filter: BLURS.LIGHT },
  whileInView: { opacity: 1, x: 0, filter: BLURS.NONE },
  viewport: SCROLL_VIEWPORT,
  transition: {
    duration: DURATIONS.SECTION_HEADING,
    ease: EASINGS.CINEMATIC,
  },
});

export const sectionTitleUnderlineVariants = Object.freeze({
  initial: { scaleX: 0, opacity: 0 },
  whileInView: { scaleX: 1, opacity: 1 },
  viewport: SCROLL_VIEWPORT,
  transition: {
    duration: 0.6,
    // ACCENT existed but was never used - a snapping underline is exactly
    // the kind of small emphasis detail it was named for.
    ease: EASINGS.ACCENT,
    delay: 0.1,
  },
});

// ─── 9. CARD & FEED ANIMATIONS ───────────────────────────────────────────────

export function getCardProps(index = 0, baseDelay = 0) {
  const safeBaseDelay = typeof baseDelay === 'number' ? Math.min(Math.max(0, baseDelay), 0.4) : 0;
  return {
    // Blur dropped: this fires on every card in a grid at once, and
    // filter:blur() on many simultaneously-animating elements is the
    // single most common cause of perceived jank in card grids/feeds.
    // Opacity + transform alone still reads as a soft reveal and is much
    // cheaper to composite.
    initial: { opacity: 0, y: 20, scale: SCALES.HERO },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: DURATIONS.CARD,
      delay: safeBaseDelay + Math.min(index * DURATIONS.MICRO_STAGGER, 0.35),
      ease: EASINGS.CINEMATIC,
    },
    whileHover: { scale: 1.03, y: -4, transition: SPRINGS.POSTER_CARD },
    whileTap: { scale: 0.96, transition: SPRINGS.TAP },
  };
}

export function getListCardProps(index = 0, baseDelay = 0) {
  const safeBaseDelay = typeof baseDelay === 'number' ? Math.min(Math.max(0, baseDelay), 0.4) : 0;
  return {
    initial: { opacity: 0, y: 24, scale: SCALES.CARD },
    // Was setting both `animate` and `whileInView` to the same values.
    // `animate` fires immediately on mount and effectively overrides the
    // scroll-triggered reveal - `whileInView` was likely a no-op. Dropped
    // `animate` so list/feed cards actually reveal as they scroll in.
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: SCROLL_VIEWPORT,
    transition: {
      duration: DURATIONS.CARD,
      delay: safeBaseDelay + Math.min(index * DURATIONS.STAGGER, 0.3),
      ease: EASINGS.CINEMATIC,
    },
    whileHover: { scale: 1.02, y: -3, transition: SPRINGS.CARD },
    whileTap: { scale: 0.98, transition: SPRINGS.TAP },
  };
}

export function getActivityItemProps(index = 0, baseDelay = 0) {
  const safeBaseDelay = typeof baseDelay === 'number' ? Math.min(Math.max(0, baseDelay), 0.4) : 0;
  return {
    initial: { opacity: 0, x: -16, filter: BLURS.LIGHT },
    // Same fix as getListCardProps: dropped the redundant `animate` so the
    // scroll-triggered `whileInView` reveal actually controls this.
    whileInView: { opacity: 1, x: 0, filter: BLURS.NONE },
    viewport: SCROLL_VIEWPORT,
    transition: {
      duration: DURATIONS.CARD_FAST,
      delay: safeBaseDelay + Math.min(index * DURATIONS.STAGGER, 0.24),
      ease: EASINGS.CINEMATIC,
    },
  };
}

export const activityLineVariants = Object.freeze({
  initial: { scaleY: 0, opacity: 0 },
  whileInView: { scaleY: 1, opacity: 1 },
  viewport: SCROLL_VIEWPORT,
  transition: {
    duration: 0.8,
    ease: EASINGS.CINEMATIC,
  },
});

// ─── 10. PAGINATION & ACTION BUTTONS ──────────────────────────────────────────

export const paginationVariants = Object.freeze({
  initial: { opacity: 0, y: 16, filter: BLURS.SUBTLE },
  whileInView: { opacity: 1, y: 0, filter: BLURS.NONE },
  viewport: SCROLL_VIEWPORT,
  transition: {
    duration: DURATIONS.SECTION_HEADING,
    ease: EASINGS.CONTROL,
  },
});

export const actionButtonVariants = Object.freeze({
  initial: { opacity: 0, scale: SCALES.COMPACT, filter: BLURS.SUBTLE },
  animate: { opacity: 1, scale: 1, filter: BLURS.NONE },
  transition: {
    duration: 0.5,
    ease: EASINGS.CONTROL,
  },
  whileHover: { scale: 1.05, transition: SPRINGS.BUTTON },
  whileTap: { scale: 0.94, transition: SPRINGS.TAP },
});

// ─── 11. EDIT PAGE ────────────────────────────────────────────────────────────

export const editFieldVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 24,
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
      ease: EASINGS.CINEMATIC,
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
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: SCALES.COMPACT,
    filter: BLURS.MEDIUM,
    transition: {
      duration: 0.35,
      ease: EASINGS.EXIT,
    },
  },
});

// ─── 12. FILTER / TOOLBAR ─────────────────────────────────────────────────────

export const filterBarVariants = Object.freeze({
  hidden: { opacity: 0, y: -12, filter: BLURS.SUBTLE },
  visible: {
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: {
      duration: 0.5,
      ease: EASINGS.CONTROL,
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
      duration: 0.4,
      ease: EASINGS.CONTROL,
    },
  },
  // Renamed from `hover`/`tap` to the standard `whileHover`/`whileTap` props
  // so this matches every other export in the file - as `hover`/`tap` they
  // only work if the consuming JSX explicitly writes
  // whileHover="hover" whileTap="tap", which is easy to forget and silently
  // does nothing if missed.
  whileHover: { scale: 1.06, transition: SPRINGS.BUTTON },
  whileTap: { scale: 0.94, transition: SPRINGS.TAP },
});
