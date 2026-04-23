export const ANIMATION_EASINGS = Object.freeze({
  STANDARD: [0.25, 0.1, 0.25, 1],
  SMOOTH: [0.25, 0.46, 0.45, 0.94],
  EMPHASIZED: [0.23, 1, 0.32, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EASE_IN_OUT: [0.4, 0, 0.2, 1],
  EASE_OUT: [0, 0, 0.2, 1],
  EASE_IN: [0.4, 0, 1, 1],
  EXPO_OUT: [0.16, 1, 0.3, 1],
  EXPO_IN_OUT: [0.87, 0, 0.13, 1],
  QUINT_OUT: [0.22, 1, 0.36, 1],
  BACK_OUT: [0.34, 1.4, 0.64, 1],
  LINEAR: 'linear',
});

export const ANIMATION_DURATIONS = Object.freeze({
  MICRO: 0.075,
  FAST: 0.2,
  SNAPPY: 0.25,
  NORMAL: 0.3,
  MEDIUM: 0.4,
  MODERATE: 0.5,
  SLOW: 0.6,
  SLOWER: 0.7,
  PANEL: 0.6,
  ITEM: 0.72,
  GROUP: 0.84,
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
  LOOSE: 0.18,
  MAX_DELAY: 0.72,
});

export const ANIMATION_SPRINGS = Object.freeze({
  GENTLE: Object.freeze({ type: 'spring', stiffness: 130, damping: 30, mass: 1 }),
  REVEAL: Object.freeze({ type: 'spring', stiffness: 165, damping: 31, mass: 1 }),
  PANEL: Object.freeze({ type: 'spring', stiffness: 260, damping: 28, mass: 0.92 }),
  SHARED_ELEMENT: Object.freeze({ type: 'spring', stiffness: 320, damping: 30, mass: 0.82 }),
  SEGMENTED_CONTROL: Object.freeze({ type: 'spring', stiffness: 380, damping: 34, mass: 0.75 }),
});

export const ANIMATION_PROFILES = Object.freeze({
  SOFT: Object.freeze({
    easings: Object.freeze({
      reveal: ANIMATION_EASINGS.STANDARD,
      opacity: ANIMATION_EASINGS.EASE_OUT,
      clip: ANIMATION_EASINGS.STANDARD,
      exit: ANIMATION_EASINGS.EASE_IN_OUT,
      emphasis: ANIMATION_EASINGS.STANDARD,
      sidebar: ANIMATION_EASINGS.STANDARD,
    }),
    durations: Object.freeze({
      panel: 0.6,
      item: 0.68,
      section: 0.98,
      sidebar: 0.94,
      clip: 1,
      hero: 1.12,
      text: 0.72,
    }),
    offsets: Object.freeze({
      sidebarX: 28,
      heroY: 34,
      sectionY: 28,
      surfaceY: 14,
      itemY: 18,
      panelY: 14,
      panelExitY: -8,
      textY: 10,
    }),
    scales: Object.freeze({
      sidebar: 0.974,
      hero: 0.982,
      section: 0.986,
      surface: 0.978,
      item: 0.988,
      panelInitial: 0.988,
      panelExit: 0.994,
      text: 0.982,
    }),
    stagger: Object.freeze({
      item: 0.032,
      group: 0.11,
      textByWord: 0.026,
    }),
    transition: Object.freeze({
      opacityDurationFactor: 0.7,
    }),
  }),
});
