/**
 * @file domains/auth/ui/auth-animation.js
 * @description Shared animation definitions for sign-in and sign-up flows.
 */

export const EASINGS = Object.freeze({
  LUXURY: [0.19, 1, 0.22, 1],
  CINEMATIC: [0.19, 1, 0.22, 1],
  SMOOTH: [0.25, 0.1, 0.25, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EXIT: [0.7, 0, 0.84, 0],
});

export const DURATIONS = Object.freeze({
  PAGE: 1.0,
  ITEM: 0.85,
  STAGGER: 0.14,
});

export const SPRINGS = Object.freeze({
  BUTTON: Object.freeze({ type: 'spring', stiffness: 360, damping: 28, mass: 0.5 }),
  LOGO: Object.freeze({ type: 'spring', stiffness: 320, damping: 26, mass: 0.6 }),
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

export const pageContainerVariants = Object.freeze({
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
    y: -24,
    scale: SCALES.COMPACT,
    filter: BLURS.MEDIUM,
    transition: {
      duration: 0.38,
      ease: EASINGS.EXIT,
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
});

export const headerContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: -28,
    scale: SCALES.CARD,
    filter: BLURS.MEDIUM,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.85,
      ease: EASINGS.LUXURY,
      staggerChildren: 0.12,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: BLURS.LIGHT,
    transition: {
      duration: 0.3,
      ease: EASINGS.EXIT,
    },
  },
});

export const logoVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: SCALES.DEEP,
    y: -20,
    filter: BLURS.DEEP,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: {
      duration: 0.9,
      ease: EASINGS.LUXURY,
    },
  },
  hover: {
    scale: 1.05,
    transition: SPRINGS.LOGO,
  },
  tap: {
    scale: 0.95,
    transition: SPRINGS.LOGO,
  },
});

export const titleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: -18,
    filter: BLURS.LIGHT,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: {
      duration: 0.8,
      ease: EASINGS.LUXURY,
    },
  },
});

export const fieldVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 36,
    scale: SCALES.CARD,
    filter: BLURS.MEDIUM,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.85,
      ease: EASINGS.LUXURY,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.95,
    filter: BLURS.LIGHT,
    transition: {
      duration: 0.32,
      ease: EASINGS.EXIT,
    },
  },
});

export const buttonVariants = fieldVariants;

export const dividerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scaleX: 0.85,
    filter: BLURS.LIGHT,
  },
  visible: {
    opacity: 1,
    scaleX: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.85,
      ease: EASINGS.LUXURY,
    },
  },
  exit: {
    opacity: 0,
    scaleX: 0.9,
    filter: BLURS.LIGHT,
    transition: {
      duration: 0.25,
      ease: EASINGS.EXIT,
    },
  },
});

export const oauthContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.25,
      ease: EASINGS.EXIT,
    },
  },
});

export const oauthItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 28,
    scale: SCALES.HERO,
    filter: BLURS.MEDIUM,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.75,
      ease: EASINGS.LUXURY,
    },
  },
  hover: {
    scale: 1.03,
    y: -2,
    transition: SPRINGS.BUTTON,
  },
  tap: {
    scale: 0.97,
    transition: SPRINGS.BUTTON,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    filter: BLURS.LIGHT,
    transition: {
      duration: 0.2,
      ease: EASINGS.EXIT,
    },
  },
});

export const stepContentVariants = Object.freeze({
  hidden: (direction = 1) => ({
    opacity: 0,
    x: direction > 0 ? 44 : -44,
    scale: SCALES.CARD,
    filter: BLURS.MEDIUM,
  }),
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.75,
      ease: EASINGS.LUXURY,
      staggerChildren: DURATIONS.STAGGER,
      delayChildren: 0.08,
    },
  },
  exit: (direction = 1) => ({
    opacity: 0,
    x: direction > 0 ? -38 : 38,
    scale: SCALES.CARD,
    filter: BLURS.MEDIUM,
    transition: {
      duration: 0.38,
      ease: EASINGS.EXIT,
    },
  }),
});

export const requirementContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    height: 0,
  },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: 0.65,
      ease: EASINGS.LUXURY,
      staggerChildren: 0.09,
    },
  },
});

export const requirementItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    x: -20,
    filter: BLURS.LIGHT,
  },
  visible: {
    opacity: 1,
    x: 0,
    filter: BLURS.NONE,
    transition: {
      duration: 0.6,
      ease: EASINGS.LUXURY,
    },
  },
});

export const footerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 24,
    filter: BLURS.LIGHT,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: {
      duration: 0.8,
      ease: EASINGS.LUXURY,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    filter: BLURS.LIGHT,
    transition: {
      duration: 0.2,
      ease: EASINGS.EXIT,
    },
  },
});

// Sign-in has its own opening score. The form wrapper only settles spatially;
// each visible part owns its opacity so the sequence remains legible.
export const SIGN_IN_TIMELINE = Object.freeze({
  PAGE_DELAY: 0.04,
  LOGO_DELAY: 0.08,
  TITLE_DELAY: 0.34,
  IDENTIFIER_DELAY: 0.58,
  PASSWORD_DELAY: 0.78,
  SUBMIT_DELAY: 0.98,
  DIVIDER_DELAY: 1.16,
  OAUTH_DELAY: 1.3,
  FOOTER_DELAY: 1.54,
  RESET_TITLE_DELAY: 0.16,
  RESET_FIELD_DELAY: 0.46,
  RESET_CONFIRM_DELAY: 0.66,
  RESET_ACTION_DELAY: 0.88,
});

export const signInPageVariants = Object.freeze({
  hidden: { y: 18, scale: 0.99 },
  visible: {
    y: 0,
    scale: 1,
    transition: {
      duration: 0.96,
      delay: SIGN_IN_TIMELINE.PAGE_DELAY,
      ease: EASINGS.CINEMATIC,
    },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: SCALES.COMPACT,
    filter: BLURS.MEDIUM,
    transition: { duration: 0.42, ease: EASINGS.EXIT },
  },
});

export const signInHeaderVariants = Object.freeze({
  hidden: { y: 0, opacity: 1 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.01 },
  },
});

export const signInLogoVariants = Object.freeze({
  hidden: { opacity: 0, y: -18, scale: 0.9, filter: BLURS.MEDIUM },
  visible: (delay = SIGN_IN_TIMELINE.LOGO_DELAY) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: { duration: 0.68, delay, ease: EASINGS.CINEMATIC },
  }),
  hover: { scale: 1.04, y: -2, transition: { duration: 0.28, ease: EASINGS.SMOOTH } },
  tap: { scale: 0.97, transition: { duration: 0.16, ease: EASINGS.SMOOTH } },
});

export const signInTitleVariants = Object.freeze({
  hidden: { opacity: 0, y: 14, filter: BLURS.LIGHT },
  visible: (delay = SIGN_IN_TIMELINE.TITLE_DELAY) => ({
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: { duration: 0.62, delay, ease: EASINGS.LUXURY },
  }),
});

export const signInFieldVariants = Object.freeze({
  hidden: { opacity: 0, y: 22, scale: 0.985, filter: BLURS.LIGHT },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: { duration: 0.64, delay, ease: EASINGS.CINEMATIC },
  }),
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.98,
    filter: BLURS.LIGHT,
    transition: { duration: 0.3, ease: EASINGS.EXIT },
  },
});

export const signInDividerVariants = Object.freeze({
  hidden: { opacity: 0, scaleX: 0.88, filter: BLURS.LIGHT },
  visible: (delay = SIGN_IN_TIMELINE.DIVIDER_DELAY) => ({
    opacity: 1,
    scaleX: 1,
    filter: BLURS.NONE,
    transition: { duration: 0.58, delay, ease: EASINGS.CINEMATIC },
  }),
  exit: { opacity: 0, scaleX: 0.92, transition: { duration: 0.24, ease: EASINGS.EXIT } },
});

export const signInOAuthContainerVariants = Object.freeze({
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
});

export const signInOAuthItemVariants = Object.freeze({
  hidden: { opacity: 0, y: 18, scale: 0.97, filter: BLURS.LIGHT },
  visible: (delay = SIGN_IN_TIMELINE.OAUTH_DELAY) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: { duration: 0.58, delay, ease: EASINGS.CINEMATIC },
  }),
  hover: { y: -2, scale: 1.018, transition: { duration: 0.28, ease: EASINGS.SMOOTH } },
  tap: { scale: 0.98, transition: { duration: 0.16, ease: EASINGS.SMOOTH } },
});

export const signInFooterVariants = Object.freeze({
  hidden: { opacity: 0, y: 12, filter: BLURS.LIGHT },
  visible: (delay = SIGN_IN_TIMELINE.FOOTER_DELAY) => ({
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: { duration: 0.54, delay, ease: EASINGS.CINEMATIC },
  }),
});

export const SIGN_UP_TIMELINE = Object.freeze({
  PAGE_DELAY: 0.04,
  LOGO_DELAY: 0.08,
  TITLE_DELAY: 0.34,
  FIELD_START: 0.56,
  FIELD_STEP: 0.16,
  DIVIDER_DELAY: 0.96,
  OAUTH_DELAY: 1.1,
  REQUIREMENTS_DELAY: 0.82,
  CONFIRM_DELAY: 1.08,
  ACTION_DELAY: 1.3,
  FOOTER_DELAY: 1.56,
});

// Sign-up shares the same motion language as sign-in while keeping its own
// timeline and step transition behavior.
export const signUpPageVariants = signInPageVariants;
export const signUpHeaderVariants = signInHeaderVariants;
export const signUpLogoVariants = signInLogoVariants;
export const signUpTitleVariants = signInTitleVariants;
export const signUpFieldVariants = signInFieldVariants;
export const signUpDividerVariants = signInDividerVariants;
export const signUpOAuthContainerVariants = signInOAuthContainerVariants;
export const signUpOAuthItemVariants = signInOAuthItemVariants;
export const signUpFooterVariants = signInFooterVariants;

export const signUpStepVariants = Object.freeze({
  hidden: (direction = 1) => ({
    opacity: 0,
    y: direction > 0 ? 18 : -18,
    scale: 0.99,
    filter: BLURS.LIGHT,
  }),
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: { duration: 0.62, ease: EASINGS.CINEMATIC },
  },
  exit: (direction = 1) => ({
    opacity: 0,
    y: direction > 0 ? -12 : 12,
    scale: 0.99,
    filter: BLURS.LIGHT,
    transition: { duration: 0.3, ease: EASINGS.EXIT },
  }),
});

export const signUpRequirementContainerVariants = Object.freeze({
  hidden: { opacity: 0, height: 0 },
  visible: (delay = SIGN_UP_TIMELINE.REQUIREMENTS_DELAY) => ({
    opacity: 1,
    height: 'auto',
    transition: {
      duration: 0.48,
      delay,
      ease: EASINGS.CINEMATIC,
      staggerChildren: 0.055,
    },
  }),
});

export const signUpRequirementItemVariants = Object.freeze({
  hidden: { opacity: 0, y: 8, filter: BLURS.LIGHT },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: { duration: 0.42, delay, ease: EASINGS.CINEMATIC },
  }),
});
