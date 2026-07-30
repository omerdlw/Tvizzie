const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: [0.16, 1, 0.24, 1],
  SOFT: [0.35, 0.1, 0.15, 1],
  EXIT: [0.4, 0, 0.2, 1],
});

const NOTIFICATION_TIERS = Object.freeze({
  MICRO:    { duration: 0.28, distance: 8,  scaleDelta: 0.01, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  FAST:     { duration: 0.46, distance: 60, scaleDelta: 0.05, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.68, distance: 80, scaleDelta: 0.05, ease: NOTIFICATION_EASINGS.EMPHASIZED },
});

const NOTIFICATION_SPRINGS = Object.freeze({
  TOAST: Object.freeze({ type: 'spring', stiffness: 340, damping: 26, mass: 0.85 }),
  MICRO: Object.freeze({ type: 'spring', stiffness: 420, damping: 28, mass: 0.45 }),
});

export const NOTIFICATION_SPRING = NOTIFICATION_SPRINGS.TOAST;
export const NOTIFICATION_MICRO_SPRING = NOTIFICATION_SPRINGS.MICRO;

export const NOTIFICATION_TAP_SCALE = 0.97;
export const NOTIFICATION_MICRO_TAP_SCALE = 0.95;

function buildVariants(
  tierName,
  { axis, includeScale = false, direction = 1, distanceScale = 1 } = {}
) {
  const tier = NOTIFICATION_TIERS[tierName];
  const distance = tier.distance * distanceScale;

  const hidden = { opacity: 0 };
  const visible = {
    opacity: 1,
    transition: { duration: tier.duration, ease: tier.ease },
  };
  const exit = {
    opacity: 0,
    transition: { duration: tier.duration * 0.65, ease: NOTIFICATION_EASINGS.EXIT },
  };

  if (axis) {
    hidden[axis] = distance * direction;
    visible[axis] = 0;
    exit[axis] = distance * direction * 0.75;
  }

  if (includeScale) {
    hidden.scale = 1 - tier.scaleDelta;
    visible.scale = 1;
    exit.scale = 1 - tier.scaleDelta * 0.5;
  }

  return Object.freeze({ hidden, visible, exit });
}

export const toastVariants = buildVariants('STANDARD', {
  axis: 'x',
  includeScale: true,
});
