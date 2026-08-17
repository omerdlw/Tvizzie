export const Z_INDEX = {
  DEBUG_OVERLAY: 9999,
  MODAL_BACKDROP: 90,
  ERROR_OVERLAY: 200,
  NOTIFICATION: 110,
  NAV_BACKDROP: 40,
  BACKGROUND: -10,
  UI_ELEMENT: 10,
  DROPDOWN: 110,
  LOADING: 150,
  TOOLTIP: 250,
  SELECT: 120,
  MODAL: 100,
  NAV: 100,
};

export const SEMANTIC_SURFACE_CLASSES = Object.freeze({
  error: Object.freeze({
    icon: 'border border-error/10 bg-error/10 text-error',
    surface: 'bg-error/10 border border-error/50',
    description: 'text-error',
    title: 'text-error',
  }),
  info: Object.freeze({
    icon: 'border border-info/10 bg-info/10 text-info',
    surface: 'bg-info/10 border border-info/50',
    description: 'text-info',
    title: 'text-info',
  }),
  success: Object.freeze({
    icon: 'border border-success/10 bg-success/10 text-success',
    description: 'text-success',
    surface: 'bg-success/10 border border-success/50',
    title: 'text-success',
  }),
  warning: Object.freeze({
    icon: 'border border-warning/10 bg-warning/10 text-warning',
    description: 'text-warning',
    surface: 'bg-warning/20 border border-warning/50',
    title: 'text-warning',
  }),
});

export const DESTRUCTIVE_ACTION_TONE_CLASS =
  'border border-error/10 bg-error/10 text-error hover:bg-error hover:text-black hover:border-error';

export const INFO_ACTION_TONE_CLASS =
  'border border-info/10 bg-info/10 text-info hover:bg-info hover:text-black hover:border-info';

export const SUCCESS_ACTION_TONE_CLASS =
  'border border-success/10 bg-success/10 text-success hover:bg-success hover:text-black hover:border-success';

export const WARNING_ACTION_TONE_CLASS =
  'border border-warning/10 bg-warning/10 text-warning hover:bg-warning hover:text-black hover:border-warning';

export const API_URL = '';
export const AUTH_API_URL = '';
export const TMDB_API_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';
export const PAGE_SHELL_MAX_WIDTH_CLASS = 'max-w-6xl';
export const HOME_PAGE_MAX_WIDTH_CLASS = 'max-w-screen-2xl';
export const ACCOUNT_ROUTE_MAX_WIDTH_CLASS = PAGE_SHELL_MAX_WIDTH_CLASS;
export const ACCOUNT_ROUTE_SHELL_CLASS = `mx-auto box-border w-full ${ACCOUNT_ROUTE_MAX_WIDTH_CLASS}`;
export const ACCOUNT_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} account-detail-section-shell`;

export { globalEvents, EVENT_TYPES } from './events';
