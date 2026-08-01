import 'server-only';

export const OVERVIEW_ACTIVITY_LIMIT = 36;
export const OVERVIEW_LISTS_LIMIT = 3;
export const OVERVIEW_REVIEW_LIMIT = 3;
export const OVERVIEW_WATCHED_LIMIT = 12;
export const OVERVIEW_WATCHLIST_LIMIT = 12;
export const ACCOUNT_ROUTE_OPTIONAL_LOAD_TIMEOUT_MS = 2400;
export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_ROUTE_FEED = Object.freeze({
  hasMore: false,
  items: EMPTY_ARRAY,
  nextCursor: null,
});
