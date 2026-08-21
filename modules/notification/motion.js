import { MOTION_EASINGS, MOTION_SPRINGS } from '@/shared/motion';

const NOTIFICATION_EASINGS = Object.freeze({
  EMPHASIZED: MOTION_EASINGS.EMPHASIZED,
  SOFT: MOTION_EASINGS.SOFT,
  EXIT: MOTION_EASINGS.SOFT_EXIT,
});

const NOTIFICATION_TIERS = Object.freeze({
  MICRO: { duration: 0.24, distance: 4, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  FAST: { duration: 0.42, distance: 8, ease: NOTIFICATION_EASINGS.EMPHASIZED },
  STANDARD: { duration: 0.58, distance: 18, ease: NOTIFICATION_EASINGS.EMPHASIZED },
});

const NOTIFICATION_SPRINGS = Object.freeze({
  MICRO: MOTION_SPRINGS.FEEDBACK,
});

export const NOTIFICATION_MICRO_SPRING = NOTIFICATION_SPRINGS.MICRO;

export const NOTIFICATION_MICRO_TAP_SCALE = 0.95;
export const NOTIFICATION_ACTION_TAP_Y = 1;

export const notificationContentVariants = Object.freeze({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: NOTIFICATION_TIERS.FAST.duration,
      ease: NOTIFICATION_EASINGS.SOFT,
      delay: 0.06,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: NOTIFICATION_TIERS.MICRO.duration, ease: NOTIFICATION_EASINGS.EXIT },
  },
});

function buildVariants(tierName, { axis, direction = 1, distanceScale = 1 } = {}) {
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

  return Object.freeze({ hidden, visible, exit });
}

export const toastVariants = buildVariants('STANDARD', {
  axis: 'x',
});
