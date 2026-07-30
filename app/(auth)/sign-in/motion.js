/**
 * @file app/(auth)/sign-in/motion.js
 * @description Sign-In sayfası için elit, sinematik ve belirgin blur odaklı animasyon tanımları.
 */

export const AUTH_EASINGS = Object.freeze({
  CINEMATIC: [0.16, 1, 0.3, 1],
  LUXURY: [0.19, 1, 0.22, 1],
  EXIT: [0.7, 0, 0.84, 0],
});

export const AUTH_DURATIONS = Object.freeze({
  PAGE: 1.0,
  ITEM: 0.85,
  STAGGER: 0.14,
});

export const AUTH_SPRINGS = Object.freeze({
  BUTTON: Object.freeze({ type: 'spring', stiffness: 320, damping: 20, mass: 0.6 }),
  LOGO: Object.freeze({ type: 'spring', stiffness: 220, damping: 16, mass: 0.85 }),
});

export const pageContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: AUTH_DURATIONS.PAGE,
      ease: AUTH_EASINGS.LUXURY,
      staggerChildren: AUTH_DURATIONS.STAGGER,
      delayChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -24,
    scale: 0.96,
    filter: 'blur(16px)',
    transition: {
      duration: 0.38,
      ease: AUTH_EASINGS.EXIT,
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
});

export const headerContainerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: -28,
    scale: 0.94,
    filter: 'blur(12px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.85,
      ease: AUTH_EASINGS.LUXURY,
      staggerChildren: 0.12,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: 'blur(10px)',
    transition: {
      duration: 0.3,
      ease: AUTH_EASINGS.EXIT,
    },
  },
});

export const logoVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scale: 0.7,
    y: -24,
    filter: 'blur(16px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.9,
      ease: AUTH_EASINGS.LUXURY,
    },
  },
  hover: {
    scale: 1.08,
    transition: AUTH_SPRINGS.LOGO,
  },
  tap: {
    scale: 0.92,
    transition: AUTH_SPRINGS.LOGO,
  },
});

export const titleVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: -18,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: AUTH_EASINGS.LUXURY,
    },
  },
});

export const fieldVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 44,
    scale: 0.92,
    filter: 'blur(16px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.85,
      ease: AUTH_EASINGS.LUXURY,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.95,
    filter: 'blur(12px)',
    transition: {
      duration: 0.32,
      ease: AUTH_EASINGS.EXIT,
    },
  },
});

export const buttonVariants = fieldVariants;

export const dividerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    scaleX: 0.4,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    scaleX: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.85,
      ease: AUTH_EASINGS.LUXURY,
    },
  },
  exit: {
    opacity: 0,
    scaleX: 0.8,
    filter: 'blur(8px)',
    transition: {
      duration: 0.25,
      ease: AUTH_EASINGS.EXIT,
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
      ease: AUTH_EASINGS.EXIT,
    },
  },
});

export const oauthItemVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 36,
    scale: 0.86,
    filter: 'blur(14px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.75,
      ease: AUTH_EASINGS.LUXURY,
    },
  },
  hover: {
    scale: 1.05,
    y: -3,
    transition: AUTH_SPRINGS.BUTTON,
  },
  tap: {
    scale: 0.95,
    transition: AUTH_SPRINGS.BUTTON,
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.92,
    filter: 'blur(8px)',
    transition: {
      duration: 0.2,
      ease: AUTH_EASINGS.EXIT,
    },
  },
});

export const footerVariants = Object.freeze({
  hidden: {
    opacity: 0,
    y: 28,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: AUTH_EASINGS.LUXURY,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    filter: 'blur(8px)',
    transition: {
      duration: 0.2,
      ease: AUTH_EASINGS.EXIT,
    },
  },
});
