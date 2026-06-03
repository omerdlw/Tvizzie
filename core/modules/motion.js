const NAV_CARD_SPRINGS = Object.freeze([
  Object.freeze({ type: 'spring', stiffness: 210, damping: 32, mass: 0.98 }),
  Object.freeze({ type: 'spring', stiffness: 190, damping: 31, mass: 1 }),
  Object.freeze({ type: 'spring', stiffness: 170, damping: 30, mass: 1.02 }),
]);

export const NAV_DEFAULT_TRANSITION = Object.freeze({
  ease: [0.16, 1, 0.3, 1],
  duration: 0.34,
  type: 'tween',
});

export const NAV_CONTAINER_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 210,
  damping: 34,
  mass: 1,
});

export const NAV_CARD_WIDTH_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 220,
  damping: 34,
  mass: 0.95,
});

export const NAV_MICRO_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.6,
});

export const NAV_ACTION_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 260,
  damping: 32,
  mass: 0.86,
});

export const NAV_BADGE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.6,
});

export const NAV_CONTENT_TRANSITION = Object.freeze({
  duration: 0.22,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_CARD_OPACITY_TRANSITION = Object.freeze({
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_CARD_BLUR_TRANSITION = Object.freeze({
  duration: 0.38,
  ease: 'easeInOut',
});

export const NAV_BACKDROP_TRANSITION = Object.freeze({
  duration: 0.34,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_SEARCH_REVEAL_TRANSITION = Object.freeze({
  duration: 0.24,
  ease: [0.16, 1, 0.3, 1],
});

export const NAV_SURFACE_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 280,
  damping: 30,
  mass: 0.84,
});

export const NAV_SURFACE_ITEM_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 290,
  damping: 30,
  mass: 0.82,
});

const NAV_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.26,
  ease: [0.55, 0, 1, 0.45],
});

const NAV_MAX_STAGGER_DELAY = 0.08;
const NAV_STAGGER_STEP = 0.02;

export function getNavCardStaggerDelay(position, expanded) {
  if (!expanded) {
    return 0;
  }
  return Math.min(position * NAV_STAGGER_STEP, NAV_MAX_STAGGER_DELAY);
}

export function getNavCardSpring(position = 0) {
  return NAV_CARD_SPRINGS[position] || NAV_CARD_SPRINGS[NAV_CARD_SPRINGS.length - 1];
}

export function getNavCardTransition({ position = 0, expanded = false } = {}) {
  const delay = getNavCardStaggerDelay(position, expanded);
  const spring = getNavCardSpring(position);

  return Object.freeze({
    width: { ...NAV_CARD_WIDTH_SPRING, delay },
    y: { ...spring, delay },
    scale: { ...spring, delay },
    opacity: { ...NAV_CARD_OPACITY_TRANSITION, delay },
    filter: { ...NAV_CARD_BLUR_TRANSITION, delay },
    zIndex: { duration: 0, delay },
  });
}

export function getNavCardInteractionMotion(isInteractive = true) {
  if (!isInteractive) {
    return Object.freeze({});
  }
  return NAV_CARD_INTERACTION_MOTION;
}

export const NAV_CARD_INITIAL = Object.freeze({
  opacity: 0,
  scale: 0.96,
  y: 0,
});

export const NAV_CARD_EXIT = Object.freeze({
  opacity: 0,
  scale: 0.96,
  y: 6,
  transition: NAV_EXIT_TRANSITION,
});

export const NAV_CARD_INTERACTION_MOTION = Object.freeze({
  whileTap: { scale: 0.98 },
});

export const NAV_BADGE_MOTION = Object.freeze({
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.6, opacity: 0 },
  transition: NAV_BADGE_SPRING,
});

export const NAV_VIDEO_ICON_MOTION = Object.freeze({
  initial: { opacity: 0, scale: 0.84 },
  animate: { opacity: 1, scale: 1 },
  transition: NAV_MICRO_SPRING,
});

const NAV_CONTENT_OFFSET = 6;

export const NAV_ACTION_PANEL_MOTION = Object.freeze({
  layout: 'position',
  initial: { opacity: 0, y: 10, scale: 0.985, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.99,
    filter: 'blur(3px)',
    transition: NAV_EXIT_TRANSITION,
  },
  transition: NAV_ACTION_SPRING,
});

export const NAV_ACTION_ITEM_MOTION = Object.freeze({
  layout: 'position',
  initial: { opacity: 0, scale: 0.88, y: 4, filter: 'blur(3px)' },
  animate: { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' },
  exit: {
    opacity: 0,
    scale: 0.88,
    y: -4,
    filter: 'blur(2px)',
    transition: NAV_EXIT_TRANSITION,
  },
  transition: NAV_ACTION_SPRING,
});

export const NAV_ACTION_GROUP_MOTION = Object.freeze({
  layout: 'position',
  transition: NAV_CONTENT_TRANSITION,
});

export const NAV_SURFACE_MOTION = Object.freeze({
  initial: { opacity: 0, y: 10, scale: 0.985, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.99,
    filter: 'blur(3px)',
    transition: NAV_EXIT_TRANSITION,
  },
  transition: NAV_SURFACE_SPRING,
});

export const NAV_INLINE_SURFACE_PANEL_MOTION = Object.freeze({
  initial: {
    height: 0,
    opacity: 0,
    clipPath: 'inset(100% 0% 0% 0%)',
    filter: 'blur(8px)',
  },
  animate: {
    height: 'auto',
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0%)',
    filter: 'blur(0px)',
  },
  exit: {
    height: 0,
    opacity: 0,
    clipPath: 'inset(0% 0% 100% 0%)',
    filter: 'blur(5px)',
    transition: Object.freeze({
      height: { duration: 0.26, ease: [0.55, 0, 1, 0.45] },
      opacity: { duration: 0.16, ease: [0.55, 0, 1, 0.45] },
      clipPath: { duration: 0.26, ease: [0.55, 0, 1, 0.45] },
      filter: { duration: 0.22, ease: [0.55, 0, 1, 0.45] },
    }),
  },
  transition: Object.freeze({
    height: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
    opacity: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
    clipPath: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
    filter: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
  }),
});

export function getNavSurfaceMotion({ openedFromCompact = false } = {}) {
  if (!openedFromCompact) {
    return NAV_SURFACE_MOTION;
  }

  return Object.freeze({
    initial: { opacity: 0, y: 18, scale: 0.972, filter: 'blur(10px)' },
    animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
    exit: NAV_SURFACE_MOTION.exit,
    transition: Object.freeze({
      opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
      y: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 },
      scale: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
      filter: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
    }),
  });
}

export const NAV_DESCRIPTION_MOTION = Object.freeze({
  initial: { opacity: 0, y: NAV_CONTENT_OFFSET, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: {
    opacity: 0,
    y: -NAV_CONTENT_OFFSET,
    filter: 'blur(2px)',
    transition: NAV_EXIT_TRANSITION,
  },
  transition: NAV_CONTENT_TRANSITION,
});

export const NAV_SEARCH_PANEL_MOTION = Object.freeze({
  initial: { opacity: 0, y: -NAV_CONTENT_OFFSET, height: 0, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, height: 'auto', filter: 'blur(0px)' },
  exit: {
    opacity: 0,
    y: -NAV_CONTENT_OFFSET,
    height: 0,
    filter: 'blur(4px)',
    transition: NAV_EXIT_TRANSITION,
  },
  transition: NAV_SEARCH_REVEAL_TRANSITION,
});

export const NAV_SEARCH_FADE_MOTION = Object.freeze({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: NAV_EXIT_TRANSITION },
  transition: NAV_SEARCH_REVEAL_TRANSITION,
});

export const NAV_BUTTON_TAP_MOTION = Object.freeze({
  whileTap: { scale: 0.97 },
  transition: NAV_ACTION_SPRING,
});

export const NAV_BUTTON_INTERACTION_MOTION = Object.freeze({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: 0.97 },
  transition: NAV_ACTION_SPRING,
});

export const NAV_ICON_OVERLAY_MOTION = Object.freeze({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: 0.97 },
  transition: NAV_ACTION_SPRING,
});

export const NAV_MEDIA_ACTION_MOTION = Object.freeze({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: 0.97 },
  transition: NAV_ACTION_SPRING,
});

export const NAV_BACKDROP_INITIAL = Object.freeze({
  opacity: 0,
  backdropFilter: 'blur(0px)',
});

export function getNavBackdropMotion(isVisible) {
  if (isVisible) {
    return Object.freeze({
      opacity: 1,
      backdropFilter: 'blur(12px)',
      display: 'block',
    });
  }
  return Object.freeze({
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transitionEnd: { display: 'none' },
  });
}

export function getNavContainerMotion(height) {
  return Object.freeze({ height });
}

export function getNavDescriptionAnimate(opacity) {
  return Object.freeze({ ...NAV_DESCRIPTION_MOTION.animate, opacity });
}

export function getNavMediaProgressMotion(progressRatio = 0) {
  return Object.freeze({
    width: `${Math.max(0, Math.min(Number(progressRatio) || 0, 1)) * 100}%`,
  });
}

export function getNavSubmittingMotion(isSubmitting) {
  return Object.freeze(isSubmitting ? { scale: 0.98 } : { scale: 1 });
}

export function getNavDragSurfaceMotion(isActive) {
  return Object.freeze(isActive ? { scale: 1.01 } : { scale: 1 });
}

export function getNavDragIconMotion(isActive) {
  return Object.freeze(isActive ? { scale: 1.03, y: -2 } : { scale: 1, y: 0 });
}

function getNavStaggerDelay(index) {
  return Math.min(index * NAV_STAGGER_STEP, NAV_MAX_STAGGER_DELAY);
}

export function getNavActionItemMotion(index = 0) {
  return {
    ...NAV_ACTION_ITEM_MOTION,
    transition: { ...NAV_ACTION_SPRING, delay: getNavStaggerDelay(index) },
  };
}

export function getNavSearchItemMotion(index = 0) {
  return Object.freeze({
    initial: { opacity: 0, y: -NAV_CONTENT_OFFSET },
    animate: { opacity: 1, y: 0 },
    exit: {
      opacity: 0,
      y: -NAV_CONTENT_OFFSET,
      transition: NAV_EXIT_TRANSITION,
    },
    transition: { ...NAV_SEARCH_REVEAL_TRANSITION, delay: getNavStaggerDelay(index) },
  });
}

export function getNavDelayedSearchTransition(index = 0) {
  return Object.freeze({ ...NAV_SEARCH_REVEAL_TRANSITION, delay: getNavStaggerDelay(index) });
}

const MODAL_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.8,
});

const MODAL_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.2,
  ease: [0.55, 0, 1, 0.45],
});

const MODAL_FADE_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.22,
  ease: [0.25, 0.46, 0.45, 0.94],
});

const MODAL_ACTION_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.68,
});

export const MODAL_LAYER_MOTION = Object.freeze({
  initial: false,
});

export const MODAL_BACKDROP_MOTION = Object.freeze({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: MODAL_EXIT_TRANSITION },
  transition: MODAL_FADE_TRANSITION,
});

export const MODAL_HEADER_MOTION = Object.freeze({
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, transition: MODAL_EXIT_TRANSITION },
  transition: MODAL_FADE_TRANSITION,
});

export const MODAL_BODY_MOTION = Object.freeze({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: MODAL_EXIT_TRANSITION },
  transition: { ...MODAL_FADE_TRANSITION, delay: 0.04 },
});

export const MODAL_FOOTER_MOTION = Object.freeze({
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4, transition: MODAL_EXIT_TRANSITION },
  transition: { ...MODAL_FADE_TRANSITION, delay: 0.06 },
});

export const MODAL_TITLE_MOTION = Object.freeze({
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, transition: MODAL_EXIT_TRANSITION },
  transition: MODAL_FADE_TRANSITION,
});

export const MODAL_ACTION_MOTION = Object.freeze({
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: MODAL_ACTION_SPRING,
});

export const MODAL_LAYER_SWITCHER_MOTION = Object.freeze({
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4, transition: MODAL_EXIT_TRANSITION },
  transition: MODAL_FADE_TRANSITION,
});

export function getModalPanelMotion(position, isTopModal) {
  if (!isTopModal) {
    return Object.freeze({
      animate: { opacity: 0.9, scale: 0.98 },
      transition: MODAL_FADE_TRANSITION,
    });
  }

  if (position === 'center') {
    return Object.freeze({
      initial: { opacity: 0, scale: 0.94 },
      animate: { opacity: 1, scale: 1 },
      exit: {
        opacity: 0,
        scale: 0.94,
        transition: MODAL_EXIT_TRANSITION,
      },
      transition: MODAL_SPRING,
    });
  }

  const xOffset = position === 'left' ? -24 : position === 'right' ? 24 : 0;
  const yOffset = position === 'top' ? -24 : position === 'bottom' ? 24 : 0;

  return Object.freeze({
    initial: { opacity: 0, x: xOffset, y: yOffset },
    animate: { opacity: 1, x: 0, y: 0 },
    exit: {
      opacity: 0,
      x: xOffset,
      y: yOffset,
      transition: MODAL_EXIT_TRANSITION,
    },
    transition: MODAL_SPRING,
  });
}

export function getModalContentMotion(index = 0) {
  return Object.freeze({
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 4, transition: MODAL_EXIT_TRANSITION },
    transition: { ...MODAL_FADE_TRANSITION, delay: index * 0.03 },
  });
}

const NOTIFICATION_SPRING = Object.freeze({
  type: 'spring',
  stiffness: 340,
  damping: 28,
  mass: 0.78,
});

const NOTIFICATION_EXIT_TRANSITION = Object.freeze({
  type: 'tween',
  duration: 0.2,
  ease: [0.55, 0, 1, 0.45],
});

export const NOTIFICATION_STACK_MOTION = Object.freeze({
  layout: true,
  transition: NOTIFICATION_SPRING,
});

export const NOTIFICATION_CONTENT_MOTION = Object.freeze({
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.95,
    transition: NOTIFICATION_EXIT_TRANSITION,
  },
  transition: NOTIFICATION_SPRING,
});

export function getNotificationItemMotion(index = 0) {
  return Object.freeze({
    layout: true,
    initial: { opacity: 0, y: 12, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: {
      opacity: 0,
      y: 12,
      scale: 0.95,
      transition: NOTIFICATION_EXIT_TRANSITION,
    },
    transition: { ...NOTIFICATION_SPRING, delay: index * 0.04 },
  });
}

export function getNotificationActionMotion(index = 0) {
  return Object.freeze({
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.94, transition: NOTIFICATION_EXIT_TRANSITION },
    transition: { ...NOTIFICATION_SPRING, delay: 0.06 + index * 0.04 },
    whileTap: { scale: 0.97 },
  });
}
