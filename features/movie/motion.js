import { freezeMotion, getStaggerDelay, MOTION_EASE, withDelay } from '@/core/animation';

const MOVIE_FEATURE_TRANSITIONS = Object.freeze({
  section: freezeMotion({
    type: 'tween',
    duration: 1.05,
    ease: MOTION_EASE.emphasis,
  }),
  item: freezeMotion({
    type: 'tween',
    duration: 0.86,
    ease: MOTION_EASE.entrance,
  }),
  tab: freezeMotion({
    type: 'tween',
    duration: 0.44,
    ease: MOTION_EASE.emphasis,
  }),
  tabItem: freezeMotion({
    type: 'tween',
    duration: 0.4,
    ease: MOTION_EASE.entrance,
  }),
  action: freezeMotion({
    type: 'spring',
    stiffness: 320,
    damping: 30,
    mass: 0.8,
  }),
  exit: freezeMotion({
    type: 'tween',
    duration: 0.24,
    ease: MOTION_EASE.exit,
  }),
});

const MOVIE_FEATURE_STAGGER = Object.freeze({
  items: Object.freeze({
    interval: 0.24,
  }),
  tabItems: Object.freeze({
    interval: 0.08,
  }),
});

export const MOVIE_FEATURE_SOFT_STAGGER = Object.freeze({
  delay: 0.1,
  interval: 0.14,
  duration: 1.02,
  initialY: 12,
  initialScale: 0.992,
});

export const MOVIE_FEATURE_VIEWPORT = Object.freeze({
  once: true,
  amount: 0.2,
  margin: '0px 0px -6% 0px',
});

export const MOVIE_FEATURE_SECTION_MOTION = freezeMotion({
  initial: 'hidden',
  whileInView: 'visible',
  viewport: MOVIE_FEATURE_VIEWPORT,
  variants: freezeMotion({
    hidden: { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: freezeMotion({
        ...MOVIE_FEATURE_TRANSITIONS.section,
        delayChildren: 0.22,
        staggerChildren: MOVIE_FEATURE_STAGGER.items.interval,
      }),
    },
  }),
  exit: {
    opacity: 0,
    y: -6,
    transition: MOVIE_FEATURE_TRANSITIONS.exit,
  },
  transition: MOVIE_FEATURE_TRANSITIONS.section,
});

export const MOVIE_FEATURE_ACTION_MOTION = freezeMotion({
  transition: MOVIE_FEATURE_TRANSITIONS.action,
});

export function getMovieFeatureItemMotion(index = 0) {
  void index;

  return freezeMotion({
    variants: freezeMotion({
      hidden: { opacity: 0, y: 20, scale: 0.985 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: MOVIE_FEATURE_TRANSITIONS.item,
      },
    }),
    exit: {
      opacity: 0,
      y: -6,
      scale: 0.99,
      transition: MOVIE_FEATURE_TRANSITIONS.exit,
    },
  });
}

export const MOVIE_FEATURE_TAB_STAGGER_MOTION = freezeMotion({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: MOVIE_FEATURE_TRANSITIONS.tab,
});

export function getMovieFeatureTabItemMotion(index = 0) {
  return freezeMotion({
    initial: { opacity: 0, y: 18, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.99 },
    transition: withDelay(
      MOVIE_FEATURE_TRANSITIONS.tabItem,
      0.02 + getStaggerDelay(index, MOVIE_FEATURE_STAGGER.tabItems)
    ),
  });
}

export function getMovieFeatureDirectionalTabMotion(direction = 1) {
  const offset = direction >= 0 ? 26 : -26;

  return freezeMotion({
    initial: { opacity: 0, x: offset },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -offset },
    transition: MOVIE_FEATURE_TRANSITIONS.tab,
  });
}

export function getMovieFeatureDirectionalTabItemMotion(index = 0, direction = 1) {
  const offset = direction >= 0 ? 22 : -22;

  return freezeMotion({
    initial: { opacity: 0, x: offset, scale: 0.99 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -offset, scale: 0.99 },
    transition: withDelay(
      MOVIE_FEATURE_TRANSITIONS.tabItem,
      0.02 + getStaggerDelay(index, MOVIE_FEATURE_STAGGER.tabItems)
    ),
  });
}

export function getMovieFeatureRevealMotion(index = 0) {
  return freezeMotion({
    initial: { opacity: 0, y: 18, scale: 0.99 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: MOVIE_FEATURE_VIEWPORT,
    transition: withDelay(
      MOVIE_FEATURE_TRANSITIONS.item,
      0.1 + getStaggerDelay(index, MOVIE_FEATURE_STAGGER.items)
    ),
  });
}

export function getMovieFeatureInitialStaggerMotion(index = 0) {
  return freezeMotion({
    initial: { opacity: 0, y: 16, scale: 0.99 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: withDelay(
      MOVIE_FEATURE_TRANSITIONS.tabItem,
      0.04 + getStaggerDelay(index, MOVIE_FEATURE_STAGGER.tabItems)
    ),
  });
}
