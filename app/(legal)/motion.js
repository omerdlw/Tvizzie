/**
 * @file app/(legal)/motion.js
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
  PAGE: 1.05,
  SECTION: 0.62,
  ITEM: 0.44,
  STAGGER: 0.13,
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
    y: 18,
  },
  visible: {
    y: 0,
    transition: {
      duration: DURATIONS.PAGE,
      ease: EASINGS.LUXURY,
      delay: 0.04,
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
    y: -14,
  },
  visible: {
    y: 0,
    transition: {
      duration: 0.72,
      ease: EASINGS.LUXURY,
      staggerChildren: 0.09,
    },
  },
});

export const titleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 12,
    filter: BLURS.MEDIUM,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: {
      duration: 0.64,
      ease: EASINGS.LUXURY,
    },
  },
});

export const articleContainerVariants = Object.freeze({
  hidden: {
    y: 22,
  },
  visible: {
    y: 0,
    transition: {
      duration: 0.86,
      ease: EASINGS.LUXURY,
      staggerChildren: DURATIONS.STAGGER,
      delayChildren: 0.76,
    },
  },
});

export const contentDividerVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.7,
      ease: EASINGS.LUXURY,
      delay: 0.5,
    },
  },
});

export const legalQuickLinksVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.58,
      ease: EASINGS.LUXURY,
      delay: 0.08,
    },
  },
});

export const sectionItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 18,
    filter: BLURS.MEDIUM,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: BLURS.NONE,
    transition: {
      duration: DURATIONS.SECTION,
      ease: EASINGS.LUXURY,
      staggerChildren: 0.055,
    },
  },
});

export const listItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 8,
    filter: BLURS.LIGHT,
  },
  visible: {
    opacity: 1,
    x: 0,
    filter: BLURS.NONE,
    transition: {
      duration: DURATIONS.ITEM,
      ease: EASINGS.LUXURY,
    },
  },
});
