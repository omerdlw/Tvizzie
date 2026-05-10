export {
  AUTH_PURPOSE,
  EMAIL_PATTERN,
  INITIAL_DELETE_FLOW,
  INITIAL_EMAIL_FLOW,
  INITIAL_PASSWORD_FLOW,
  completeEmailChangeRequest,
  completePasswordChangeRequest,
  completePasswordSetRequest,
  deleteAccountRequest,
  resolveSecurityErrorMessage,
  validatePassword,
} from './settings/security';
export {
  normalizeEmail,
  normalizeOptionalText,
  normalizeProviderDescriptors,
  normalizeProviderIds,
} from './settings/normalizers';
export { clearAccountFeedback, emitAccountFeedback } from './settings/account-feedback';
export { notifyAccountLoadError } from './shared/load-error';
export {
  buildAccountCollectionPageHref,
  formatPaginationSummaryLabel,
  getMediaTitle,
  removeAccountCollectionItem,
  sortAccountItems,
} from './collections/item-utils';
export {
  getAvatarFallback,
  getFollowState,
  getIsFullScreenEmpty,
  getNavDescription,
} from './profile/nav-utils';
export { ACCOUNT_SECTION_KEYS, RESERVED_ACCOUNT_SEGMENTS, isReservedAccountSegment } from '@/core/utils/account';

export {
  ACCOUNT_ROUTE_MAX_WIDTH_CLASS,
  ACCOUNT_ROUTE_SHELL_CLASS,
  ACCOUNT_SECTION_SHELL_CLASS,
} from '@/core/constants';

export const EDIT_TABS = [
  { key: 'general', icon: 'solar:user-circle-bold', label: 'General Info' },
  { key: 'security', icon: 'solar:shield-keyhole-bold', label: 'Security' },
];

export const PROFILE_TABS = [
  'activity',
  'likes',
  'watched',
  'watchlist',
  'reviews',
  'lists',
  'liked_reviews',
  'liked_lists',
];
