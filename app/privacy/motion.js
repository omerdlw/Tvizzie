/**
 * @file app/privacy/motion.js
 * @description Privacy Policy sayfası sinematik animasyon tanımları.
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
  SECTION: 0.85,
  ITEM: 0.7,
  STAGGER: 0.12,
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
    y: -20,
    scale: SCALES.COMPACT,
    filter: BLURS.MEDIUM,
    transition: {
      duration: 0.4,
      ease: EASINGS.EXIT,
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
      staggerChildren: 0.1,
    },
  },
});

export const titleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: -16,
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

export const articleContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 36,
    scale: SCALES.CARD,
    filter: BLURS.DEEP,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.9,
      ease: EASINGS.LUXURY,
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
});

export const sectionItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.95,
    filter: BLURS.MEDIUM,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.8,
      ease: EASINGS.LUXURY,
      staggerChildren: 0.08,
    },
  },
});

export const listItemVariants = Object.freeze({
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
      duration: 0.65,
      ease: EASINGS.LUXURY,
    },
  },
});

export const asideVariants = Object.freeze({
  hidden: {
    opacity: 0,
    x: 32,
    scale: SCALES.CARD,
    filter: BLURS.MEDIUM,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: BLURS.NONE,
    transition: {
      duration: 0.85,
      ease: EASINGS.LUXURY,
    },
  },
});
