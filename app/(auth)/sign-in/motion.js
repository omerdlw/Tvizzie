/**
 * @file app/(auth)/sign-in/motion.js
 * @description Sign-In sayfası sinematik animasyon tanımları.
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
