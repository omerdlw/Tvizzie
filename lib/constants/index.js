const DURATION_VALUES = Object.freeze({
  INSTANT: 0,
  CASCADE: 0.03,
  STAGGER: 0.05,
  MICRO: 0.075,
  RAPID: 0.08,
  VERY_FAST: 0.1,
  QUICK: 0.15,
  FAST: 0.2,
  SNAPPY: 0.25,
  NORMAL: 0.3,
  MEDIUM: 0.4,
  BALANCED: 0.45,
  MODERATE: 0.5,
  SLOW: 0.6,
  SLOWER: 0.7,
  VERY_SLOW: 0.8,
  HERO: 1,
  PULSE: 2,
  AMBIENT: 8,
  REDUCED_MOTION: 0.00001,
})

const EASING_VALUES = Object.freeze({
  STANDARD: [0.25, 0.1, 0.25, 1],
  SMOOTH: [0.25, 0.46, 0.45, 0.94],
  EMPHASIZED: [0.23, 1, 0.32, 1],
  ACCENT: [0.32, 0.72, 0, 1],
  EASE_IN_OUT: [0.4, 0, 0.2, 1],
  EASE_OUT: [0, 0, 0.2, 1],
  EASE_IN: [0.4, 0, 1, 1],
  LINEAR: 'linear',
  SPRING: 'spring',
})

const toCssDuration = (seconds) => `${seconds * 1000}ms`
const toCssEasing = (easing) =>
  Array.isArray(easing) ? `cubic-bezier(${easing.join(', ')})` : easing

const DURATION_VARIABLES = Object.freeze(
  Object.fromEntries(
    Object.entries(DURATION_VALUES).map(([key]) => [
      key,
      `--motion-duration-${key.toLowerCase().replace(/_/g, '-')}`,
    ])
  )
)

const EASING_VARIABLES = Object.freeze(
  Object.fromEntries(
    Object.entries(EASING_VALUES)
      .filter(([, value]) => value !== EASING_VALUES.SPRING)
      .map(([key]) => [
        key,
        `--motion-easing-${key.toLowerCase().replace(/_/g, '-')}`,
      ])
  )
)

const DURATION_CLASSES = Object.freeze(
  Object.fromEntries(
    Object.entries(DURATION_VARIABLES).map(([key, variable]) => [
      key,
      `duration-[var(${variable})]`,
    ])
  )
)

const EASING_CLASSES = Object.freeze(
  Object.fromEntries(
    Object.entries(EASING_VARIABLES).map(([key, variable]) => [
      key,
      `ease-[var(${variable})]`,
    ])
  )
)

export const DURATION = Object.freeze({
  ...DURATION_VALUES,
  VARIABLE: DURATION_VARIABLES,
  CLASS: DURATION_CLASSES,
  RATIO: Object.freeze({
    EXIT: 0.6,
  }),
})

export const EASING = Object.freeze({
  ...EASING_VALUES,
  VARIABLE: EASING_VARIABLES,
  CLASS: EASING_CLASSES,
  SPRING_CONFIG: Object.freeze({
    MODAL: Object.freeze({
      type: EASING_VALUES.SPRING,
      stiffness: 260,
      damping: 20,
    }),
    CONTROL: Object.freeze({
      type: EASING_VALUES.SPRING,
      stiffness: 300,
      damping: 20,
    }),
    NOTIFICATION: Object.freeze({
      type: EASING_VALUES.SPRING,
      bounce: 0.3,
      duration: DURATION_VALUES.NORMAL,
    }),
  }),
})

export const MOTION_CSS_VARIABLES = Object.freeze({
  '--default-transition-duration': toCssDuration(DURATION.NORMAL),
  '--default-transition-timing-function': toCssEasing(EASING.SMOOTH),
  '--motion-duration-instant': toCssDuration(DURATION.INSTANT),
  '--motion-duration-cascade': toCssDuration(DURATION.CASCADE),
  '--motion-duration-stagger': toCssDuration(DURATION.STAGGER),
  '--motion-duration-micro': toCssDuration(DURATION.MICRO),
  '--motion-duration-rapid': toCssDuration(DURATION.RAPID),
  '--motion-duration-very-fast': toCssDuration(DURATION.VERY_FAST),
  '--motion-duration-quick': toCssDuration(DURATION.QUICK),
  '--motion-duration-fast': toCssDuration(DURATION.FAST),
  '--motion-duration-snappy': toCssDuration(DURATION.SNAPPY),
  '--motion-duration-normal': toCssDuration(DURATION.NORMAL),
  '--motion-duration-medium': toCssDuration(DURATION.MEDIUM),
  '--motion-duration-balanced': toCssDuration(DURATION.BALANCED),
  '--motion-duration-moderate': toCssDuration(DURATION.MODERATE),
  '--motion-duration-slow': toCssDuration(DURATION.SLOW),
  '--motion-duration-slower': toCssDuration(DURATION.SLOWER),
  '--motion-duration-very-slow': toCssDuration(DURATION.VERY_SLOW),
  '--motion-duration-hero': toCssDuration(DURATION.HERO),
  '--motion-duration-pulse': toCssDuration(DURATION.PULSE),
  '--motion-duration-ambient': toCssDuration(DURATION.AMBIENT),
  '--motion-duration-reduced-motion': toCssDuration(DURATION.REDUCED_MOTION),
  '--motion-easing-standard': toCssEasing(EASING.STANDARD),
  '--motion-easing-smooth': toCssEasing(EASING.SMOOTH),
  '--motion-easing-emphasized': toCssEasing(EASING.EMPHASIZED),
  '--motion-easing-accent': toCssEasing(EASING.ACCENT),
  '--motion-easing-ease-in-out': toCssEasing(EASING.EASE_IN_OUT),
  '--motion-easing-ease-out': toCssEasing(EASING.EASE_OUT),
  '--motion-easing-ease-in': toCssEasing(EASING.EASE_IN),
  '--motion-easing-linear': toCssEasing(EASING.LINEAR),
})

export const Z_INDEX = {
  DEBUG_OVERLAY: 9999,
  MODAL_BACKDROP: 90,
  ERROR_OVERLAY: 200,
  NOTIFICATION: 110,
  NAV_BACKDROP: 40,
  BACKGROUND: -10,
  UI_ELEMENT: 10,
  COUNTDOWN: 50,
  DROPDOWN: 110,
  LOADING: 150,
  TOOLTIP: 250,
  SELECT: 120,
  MODAL: 100,
  NAV: 100,
}

export const SEMANTIC_SURFACE_CLASSES = Object.freeze({
  error: Object.freeze({
    icon: 'surface-icon-error',
    description: 'text-error',
    surface: 'surface-error',
    title: 'text-white',
  }),
  info: Object.freeze({
    surface: 'surface-info',
    icon: 'surface-icon-info',
    title: 'text-white',
    description: 'text-info',
  }),
  success: Object.freeze({
    surface: 'surface-success',
    icon: 'surface-icon-success',
    title: 'text-white',
    description: 'text-success',
  }),
  warning: Object.freeze({
    surface: 'surface-warning',
    icon: 'surface-icon-warning',
    title: 'text-white',
    description: 'text-warning',
  }),
})

export const API_URL = ''
export const AUTH_API_URL = ''
export const TMDB_API_URL = 'https://api.themoviedb.org/3'
export const TMDB_IMG = 'https://image.tmdb.org/t/p'
export const PAGE_SHELL_MAX_WIDTH_CLASS = 'max-w-6xl'
export const HOME_PAGE_MAX_WIDTH_CLASS = 'max-w-screen-2xl'
export const ACCOUNT_ROUTE_MAX_WIDTH_CLASS = PAGE_SHELL_MAX_WIDTH_CLASS
export const ACCOUNT_ROUTE_SHELL_CLASS =
  `mx-auto box-border w-full ${ACCOUNT_ROUTE_MAX_WIDTH_CLASS}`
export const ACCOUNT_SECTION_SHELL_CLASS =
  `${ACCOUNT_ROUTE_SHELL_CLASS} px-4 py-8 sm:px-8 sm:py-10`
