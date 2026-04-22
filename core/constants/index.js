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
};

export const SEMANTIC_SURFACE_CLASSES = Object.freeze({
  error: Object.freeze({
    icon: 'text-black bg-transparent border-none',
    description: 'text-black/70',
    surface: 'border border-error bg-error/30',
    title: 'text-black',
  }),
  info: Object.freeze({
    icon: 'text-black bg-transparent border-none',
    description: 'text-black/70',
    surface: 'border border-info bg-info/30',
    title: 'text-black',
  }),
  success: Object.freeze({
    icon: 'text-black bg-transparent border-none',
    description: 'text-black/70',
    surface: 'border border-success bg-success/30',
    title: 'text-black',
  }),
  warning: Object.freeze({
    icon: 'text-black bg-transparent border-none',
    description: 'text-black/70',
    surface: 'border border-warning bg-warning/30',
    title: 'text-black',
  }),
});

export const DESTRUCTIVE_ACTION_TONE_CLASS =
  'border border-error/20 bg-error/20 text-error hover:bg-error hover:text-white hover:border-error';
export const MEDIA_CARD_DESTRUCTIVE_ACTION_TONE_CLASS =
  'border border-black/15 bg-white text-error hover:border-error hover:bg-error hover:text-white';

export const INFO_ACTION_TONE_CLASS =
  'border border-info/20 bg-info/20 text-info hover:bg-info hover:text-white hover:border-info';

export const SUCCESS_ACTION_TONE_CLASS =
  'border border-success/20 bg-success/20 text-success hover:bg-success hover:text-white hover:border-success';

export const WARNING_ACTION_TONE_CLASS =
  'border border-warning/20 bg-warning/20 text-warning hover:bg-warning hover:text-white hover:border-warning';

export const API_URL = '';
export const AUTH_API_URL = '';
export const TMDB_API_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';
export const PAGE_SHELL_MAX_WIDTH_CLASS = 'max-w-6xl';
export const HOME_PAGE_MAX_WIDTH_CLASS = 'max-w-screen-2xl';
export const ACCOUNT_ROUTE_MAX_WIDTH_CLASS = PAGE_SHELL_MAX_WIDTH_CLASS;
export const ACCOUNT_ROUTE_SHELL_CLASS = `mx-auto box-border w-full ${ACCOUNT_ROUTE_MAX_WIDTH_CLASS}`;
export const ACCOUNT_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} px-4 py-8 sm:px-8 sm:py-10`;
