export const ANIMATION_EASINGS = Object.freeze({
  STANDARD: [0.25, 0.1, 0.25, 1],
  SMOOTH: [0.25, 0.46, 0.45, 0.94],
  EMPHASIZED: [0.23, 1, 0.32, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EASE_OUT: [0, 0, 0.2, 1],
  EXPO_OUT: [0.16, 1, 0.3, 1],
  EXPO_IN_OUT: [0.87, 0, 0.13, 1],
  QUINT_OUT: [0.22, 1, 0.36, 1],
});

export const ANIMATION_DURATIONS = Object.freeze({
  SNAPPY: 0.25,
  NORMAL: 0.3,
  MEDIUM: 0.4,
  SLOW: 0.6,
  SLOWER: 0.7,
  PANEL: 0.6,
  ITEM: 0.72,
  SECTION: 1.1,
  SIDEBAR: 1.1,
  CLIP: 1.2,
  HERO: 1.4,
});

export const ANIMATION_STAGGER = Object.freeze({
  MICRO: 0.015,
  TIGHT: 0.028,
  CASCADE: 0.06,
  GROUP: 0.11,
  MAX_DELAY: 0.72,
});

export const ANIMATION_SPRINGS = Object.freeze({
  GENTLE: Object.freeze({ type: 'spring', stiffness: 130, damping: 30, mass: 1 }),
  REVEAL: Object.freeze({ type: 'spring', stiffness: 165, damping: 31, mass: 1 }),
  SEGMENTED_CONTROL: Object.freeze({ type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }),
});

export const ANIMATION_VIEWPORTS = Object.freeze({
  section: Object.freeze({
    once: true,
    amount: 0.14,
    margin: '0px 0px -6% 0px',
  }),
  relaxed: Object.freeze({
    once: true,
    amount: 0.08,
    margin: '0px 0px -12% 0px',
  }),
  dense: Object.freeze({
    once: true,
    amount: 0.2,
    margin: '0px 0px -4% 0px',
  }),
});
