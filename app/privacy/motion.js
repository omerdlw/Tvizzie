/**
 * @file app/privacy/motion.js
 * @description Privacy Policy sayfası için elit sinematik animasyon tanımları.
 */

export const LEGAL_EASINGS = Object.freeze({
  CINEMATIC: [0.16, 1, 0.3, 1],
  LUXURY: [0.19, 1, 0.22, 1],
  EXIT: [0.7, 0, 0.84, 0],
});

export const LEGAL_DURATIONS = Object.freeze({
  PAGE: 1.0,
  SECTION: 0.85,
  ITEM: 0.7,
  STAGGER: 0.12,
});

export const pageContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: LEGAL_DURATIONS.PAGE,
      ease: LEGAL_EASINGS.LUXURY,
      staggerChildren: LEGAL_DURATIONS.STAGGER,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    filter: 'blur(14px)',
    transition: {
      duration: 0.35,
      ease: LEGAL_EASINGS.EXIT,
    },
  },
});

export const headerContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: -28,
    scale: 0.96,
    filter: 'blur(12px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.85,
      ease: LEGAL_EASINGS.LUXURY,
      staggerChildren: 0.1,
    },
  },
});

export const titleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: -16,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: LEGAL_EASINGS.LUXURY,
    },
  },
});

export const articleContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.95,
    filter: 'blur(16px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.9,
      ease: LEGAL_EASINGS.LUXURY,
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
});

export const sectionItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 32,
    scale: 0.96,
    filter: 'blur(12px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: LEGAL_EASINGS.LUXURY,
      staggerChildren: 0.08,
    },
  },
});

export const listItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    x: -18,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.6,
      ease: LEGAL_EASINGS.LUXURY,
    },
  },
});

export const asideVariants = Object.freeze({
  hidden: {
    opacity: 0,
    x: 32,
    scale: 0.94,
    filter: 'blur(14px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.85,
      ease: LEGAL_EASINGS.LUXURY,
    },
  },
});
