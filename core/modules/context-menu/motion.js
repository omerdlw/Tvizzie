const CONTEXT_MENU_EASINGS = Object.freeze({
  EMPHASIZED: [0.16, 1, 0.24, 1],
  SOFT: [0.35, 0.1, 0.15, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

const CONTEXT_MENU_TIERS = Object.freeze({
  MICRO:    { duration: 0.22, distance: 4,  scaleDelta: 0.008, ease: CONTEXT_MENU_EASINGS.EMPHASIZED },
  FAST:     { duration: 0.32, distance: 8,  scaleDelta: 0.020, ease: CONTEXT_MENU_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.44, distance: 12, scaleDelta: 0.035, ease: CONTEXT_MENU_EASINGS.EMPHASIZED },
});

const CONTEXT_MENU_SPRINGS = Object.freeze({
  MENU:  Object.freeze({ type: 'spring', stiffness: 280, damping: 26, mass: 0.75 }),
  MICRO: Object.freeze({ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }),
});

export const CONTEXT_MENU_MICRO_SPRING = CONTEXT_MENU_SPRINGS.MICRO;
export const CONTEXT_MENU_TAP_SCALE = 0.97;

function buildVariants(
  tierName,
  { includeScale = false, distanceScale = 1 } = {}
) {
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

  if (includeScale) {
    hidden.scale = 1 - tier.scaleDelta;
    visible.scale = 1;
    exit.scale = 1 - tier.scaleDelta * 0.5;
  }

  return Object.freeze({ hidden, visible, exit });
}

export const menuPopVariants = buildVariants('STANDARD', { includeScale: true });
