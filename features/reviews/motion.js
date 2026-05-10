import { freezeMotion, getStaggerDelay, MOTION_EASE, withDelay } from '@/core/animation';

const REVIEWS_TRANSITIONS = Object.freeze({
  section: freezeMotion({
    type: 'tween',
    duration: 0.84,
    ease: MOTION_EASE.emphasis,
  }),
  item: freezeMotion({
    type: 'tween',
    duration: 0.74,
    ease: MOTION_EASE.entrance,
  }),
  action: freezeMotion({
    type: 'spring',
    stiffness: 300,
    damping: 28,
    mass: 0.78,
  }),
});

const REVIEWS_STAGGER = Object.freeze({
  list: Object.freeze({
    interval: 0.1,
  }),
});

export const REVIEWS_FEATURE_SECTION_MOTION = freezeMotion({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: REVIEWS_TRANSITIONS.section,
});

export function getReviewsFeatureItemMotion(index = 0) {
  return freezeMotion({
    initial: { opacity: 0, y: 14, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: withDelay(REVIEWS_TRANSITIONS.item, 0.06 + getStaggerDelay(index, REVIEWS_STAGGER.list)),
  });
}

export const REVIEWS_FEATURE_ACTION_MOTION = freezeMotion({
  whileHover: { scale: 1.01 },
  whileFocus: { scale: 1.01 },
  whileTap: { scale: 0.985 },
  transition: REVIEWS_TRANSITIONS.action,
});
