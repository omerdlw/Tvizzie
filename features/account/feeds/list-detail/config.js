import { ACCOUNT_ROUTE_SHELL_CLASS } from '@/features/account/utils';
import { REVIEW_SORT_MODE } from '@/features/reviews/utils';

export const LIST_SECTION_SHELL_CLASS = `${ACCOUNT_ROUTE_SHELL_CLASS} flex flex-col gap-6 px-4 sm:px-8`;

export const REVIEW_ITEMS_PER_PAGE = 36;

export const LIST_COMMENT_SORT_OPTIONS = Object.freeze([
  { value: REVIEW_SORT_MODE.NEWEST, label: 'Newest to oldest' },
  { value: REVIEW_SORT_MODE.OLDEST, label: 'Oldest to newest' },
  { value: REVIEW_SORT_MODE.LIKES_DESC, label: 'Most liked to least liked' },
  { value: REVIEW_SORT_MODE.LIKES_ASC, label: 'Least liked to most liked' },
]);

export const LIST_COMMENT_SORT_SET = new Set(LIST_COMMENT_SORT_OPTIONS.map((option) => option.value));

export const LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS = Object.freeze([
  Object.freeze({ key: 'hide_watched', label: 'Hide watched films' }),
  Object.freeze({ key: 'hide_liked', label: 'Hide liked films' }),
  Object.freeze({ key: 'hide_watchlist', label: 'Hide films in watchlist' }),
  Object.freeze({ key: 'hide_unreleased', label: 'Hide unreleased titles' }),
  Object.freeze({ key: 'hide_documentaries', label: 'Hide documentaries' }),
]);

export const LIST_DETAIL_ALLOWED_EYE_FLAGS = LIST_DETAIL_MEDIA_VISIBILITY_OPTIONS.map((option) => option.key);
