const CONTEXT_MENU_EASINGS = Object.freeze({
  EMPHASIZED: [0.22, 1, 0.36, 1],
  SOFT: [0.32, 0.72, 0, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

const CONTEXT_MENU_TIERS = Object.freeze({
  MICRO: { duration: 0.2, distance: 4, ease: CONTEXT_MENU_EASINGS.EMPHASIZED },
  FAST: { duration: 0.34, distance: 8, ease: CONTEXT_MENU_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.46, distance: 12, ease: CONTEXT_MENU_EASINGS.EMPHASIZED },
});

const CONTEXT_MENU_SPRINGS = Object.freeze({
  MICRO: Object.freeze({ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }),
});

export const CONTEXT_MENU_MICRO_SPRING = CONTEXT_MENU_SPRINGS.MICRO;
export const CONTEXT_MENU_TAP_Y = 1;

export const menuContentVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: CONTEXT_MENU_TIERS.FAST.duration, ease: CONTEXT_MENU_EASINGS.SOFT, delay: 0.04 },
  },
  exit: {
    opacity: 0,
    transition: { duration: CONTEXT_MENU_TIERS.MICRO.duration, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

export const menuItemVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: (index = 0) => ({
    opacity: 1,
    transition: {
      duration: CONTEXT_MENU_TIERS.FAST.duration,
      ease: CONTEXT_MENU_EASINGS.SOFT,
      delay: 0.08 + Math.min(Math.max(index, 0) * 0.035, 0.21),
    },
  }),
  exit: {
    opacity: 0,
    transition: { duration: CONTEXT_MENU_TIERS.MICRO.duration, ease: CONTEXT_MENU_EASINGS.EXIT },
  },
});

function buildVariants(tierName, { distanceScale = 1 } = {}) {
  const tier = CONTEXT_MENU_TIERS[tierName];
  const distance = tier.distance * distanceScale;

  const hidden = { opacity: 0 };
  const visible = {
    opacity: 1,
    transition: { duration: tier.duration, ease: tier.ease },
  };
  const exit = {
    opacity: 0,
    transition: { duration: tier.duration * 0.65, ease: CONTEXT_MENU_EASINGS.EXIT },
  };

  if (distance) {
    hidden.y = distance;
    visible.y = 0;
    exit.y = -distance * 0.4;
  }

  return Object.freeze({ hidden, visible, exit });
}

export const menuPopVariants = buildVariants('STANDARD');
