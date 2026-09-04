export const Z_INDEX = Object.freeze({
  DEBUG_OVERLAY: 9999,
  MODAL_BACKDROP: 90,
  ERROR_OVERLAY: 200,
  NOTIFICATION: 110,
  NAV_BACKDROP: 40,
  BACKGROUND: 0,
  UI_ELEMENT: 10,
  DROPDOWN: 110,
  LOADING: 150,
  TOOLTIP: 250,
  SELECT: 120,
  MODAL: 100,
  NAV: 100,
});

export { SEMANTIC_SURFACE_CLASSES } from '@/modules/nav/constants';

export const DESTRUCTIVE_ACTION_TONE_CLASS =
  'ring-1 ring-inset ring-error/10 bg-error/10 text-error hover:bg-error hover:text-black hover:ring-error';

export const INFO_ACTION_TONE_CLASS =
  'ring-1 ring-inset ring-info/10 bg-info/10 text-info hover:bg-info hover:text-black hover:ring-info';

export const SUCCESS_ACTION_TONE_CLASS =
  'ring-1 ring-inset ring-success/10 bg-success/10 text-success hover:bg-success hover:text-black hover:ring-success';

export const WARNING_ACTION_TONE_CLASS =
  'ring-1 ring-inset ring-warning/10 bg-warning/10 text-warning hover:bg-warning hover:text-black hover:ring-warning';

export const TMDB_API_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMG = 'https://image.tmdb.org/t/p';
export const PAGE_SHELL_MAX_WIDTH_CLASS = 'max-w-6xl';
export const HOME_PAGE_MAX_WIDTH_CLASS = 'max-w-screen-2xl';
export const ACCOUNT_ROUTE_MAX_WIDTH_CLASS = PAGE_SHELL_MAX_WIDTH_CLASS;
export const ACCOUNT_ROUTE_SHELL_CLASS = `mx-auto box-border w-full ${ACCOUNT_ROUTE_MAX_WIDTH_CLASS}`;
export const ACCOUNT_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} account-detail-section-shell`;
