import { createCsrfHeaders } from '@/core/auth/clients/csrf.client';
import { EVENT_TYPES, globalEvents } from '@/core/constants/events';
import { getUserAvatarUrl } from '@/core/utils';
import { FOLLOW_STATUSES } from '@/core/services/social/follows.service';

export {
  ACCOUNT_ROUTE_MAX_WIDTH_CLASS,
  ACCOUNT_ROUTE_SHELL_CLASS,
  ACCOUNT_SECTION_SHELL_CLASS,
} from '@/core/constants';

export const EDIT_TABS = [
  { key: 'general', icon: 'solar:user-circle-bold', label: 'General Info' },
  { key: 'security', icon: 'solar:shield-keyhole-bold', label: 'Security' },
];

export const AUTH_PURPOSE = {
  ACCOUNT_DELETE: 'account-delete',
  EMAIL_CHANGE: 'email-change',
  PASSWORD_CHANGE: 'password-change',
  PASSWORD_SET: 'password-set',
  PROVIDER_LINK: 'provider-link',
};

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
export const ACCOUNT_SECTION_KEYS = Object.freeze(['activity', 'likes', 'watched', 'watchlist', 'reviews', 'lists']);
export const RESERVED_ACCOUNT_SEGMENTS = new Set([...ACCOUNT_SECTION_KEYS, 'edit']);
export const ACCOUNT_LIST_CREATOR_PATH = '/account/lists/new';

export const INITIAL_EMAIL_FLOW = {
  currentPassword: '',
  isSubmitting: false,
  newEmail: '',
};

export const INITIAL_PASSWORD_FLOW = {
  confirmPassword: '',
  currentPassword: '',
  isSubmitting: false,
  newPassword: '',
};

export const INITIAL_DELETE_FLOW = {
  confirmText: '',
  currentPassword: '',
  isSubmitting: false,
};

const DEFAULT_ACCOUNT_FEEDBACK_PRIORITY = 112;
const DEFAULT_ACCOUNT_FEEDBACK_THEME_TYPE = 'LOGIN';

const ACCOUNT_FEEDBACK_CONFIG = Object.freeze({
  'account-delete': Object.freeze({
    description: 'Deleting account and removing active access',
    icon: 'solar:danger-triangle-bold',
    statusType: 'ACCOUNT_DELETE',
    successDescription: 'Account deleted successfully',
    successTitle: 'Account Deleted',
    title: 'Deleting Account',
  }),
  'account-update': Object.freeze({
    description: 'Saving profile changes',
    icon: 'solar:user-circle-bold',
    statusType: 'ACCOUNT_UPDATE',
    successDescription: 'Profile changes saved',
    successTitle: 'Account Updated',
    title: 'Updating Account',
  }),
  'email-change': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:letter-bold',
    statusType: 'EMAIL_CHANGE',
    successDescription: 'Please sign in again with your new email',
    successTitle: 'Email Updated',
    title: 'Updating Email',
  }),
  'google-link': Object.freeze({
    description: 'Preparing secure provider connection',
    icon: 'flat-color-icons:google',
    statusType: 'GOOGLE_LINK',
    successDescription: 'Google sign-in is now linked to this account',
    successTitle: 'Google Linked',
    title: 'Linking Google',
  }),
  'password-change': Object.freeze({
    description: 'Applying secure account changes',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'PASSWORD_CHANGE',
    successDescription: 'Please sign in again with your new password',
    successTitle: 'Password Updated',
    title: 'Updating Password',
  }),
  'password-set': Object.freeze({
    description: 'Adding password sign-in to your account',
    icon: 'solar:shield-keyhole-bold',
    statusType: 'PASSWORD_SET',
    successDescription: 'Please sign in again with your new password',
    successTitle: 'Password Added',
    title: 'Setting Password',
  }),
});

const SEED_QUERY_PARAM_MAP = Object.freeze({
  backdropPath: 'seedBackdropPath',
  entityId: 'seedId',
  entityType: 'seedType',
  first_air_date: 'seedFirstAirDate',
  name: 'seedName',
  poster_path: 'seedPosterPath',
  release_date: 'seedReleaseDate',
  title: 'seedTitle',
  vote_average: 'seedVoteAverage',
});

function resolveAccountFeedbackConfig(flow) {
  return (
    ACCOUNT_FEEDBACK_CONFIG[
      String(flow || '')
        .trim()
        .toLowerCase()
    ] || {}
  );
}

export function getAvatarFallback(profile) {
  return getUserAvatarUrl(profile);
}

export function emitAccountFeedback(flow, phase, overrides = {}) {
  const config = resolveAccountFeedbackConfig(flow);

  globalEvents.emit(EVENT_TYPES.AUTH_FEEDBACK, {
    flow,
    phase,
    statusType:
      overrides.statusType ||
      config.statusType ||
      String(flow || 'ACCOUNT_FEEDBACK')
        .trim()
        .toUpperCase(),
    title:
      overrides.title ||
      (phase === 'success' ? config.successTitle || config.title || 'Account' : config.title || 'Account'),
    description:
      overrides.description ??
      (phase === 'success' ? config.successDescription || config.description || '' : config.description || ''),
    icon: overrides.icon || config.icon || 'solar:user-circle-bold',
    themeType: overrides.themeType || config.themeType || DEFAULT_ACCOUNT_FEEDBACK_THEME_TYPE,
    priority: overrides.priority ?? config.priority ?? DEFAULT_ACCOUNT_FEEDBACK_PRIORITY,
    ...(overrides.duration != null ? { duration: overrides.duration } : {}),
    ...(overrides.isOverlay != null ? { isOverlay: overrides.isOverlay } : {}),
  });
}

export function clearAccountFeedback(flow) {
  emitAccountFeedback(flow, 'clear');
}

export function buildListCreatorHref(seedMedia = null) {
  if (!seedMedia) {
    return ACCOUNT_LIST_CREATOR_PATH;
  }

  const entityType = seedMedia?.entityType || seedMedia?.media_type || 'movie';

  if (entityType !== 'movie') {
    return ACCOUNT_LIST_CREATOR_PATH;
  }

  const params = new URLSearchParams();
  const normalizedMedia = {
    backdropPath: seedMedia?.backdrop_path || seedMedia?.backdropPath || null,
    entityId: seedMedia?.entityId ?? seedMedia?.id ?? null,
    entityType,
    first_air_date: null,
    name: '',
    poster_path: seedMedia?.poster_path || seedMedia?.posterPath || null,
    release_date: seedMedia?.release_date || null,
    title: seedMedia?.title || seedMedia?.original_title || '',
    vote_average: seedMedia?.vote_average ?? null,
  };

  Object.entries(SEED_QUERY_PARAM_MAP).forEach(([field, queryKey]) => {
    const value = normalizedMedia[field];

    if (value === undefined || value === null || value === '') {
      return;
    }

    params.set(queryKey, String(value));
  });

  const queryString = params.toString();

  return queryString ? `${ACCOUNT_LIST_CREATOR_PATH}?${queryString}` : ACCOUNT_LIST_CREATOR_PATH;
}

export function buildAccountCollectionPageHref(basePath, pageNumber) {
  if (!basePath) {
    return '';
  }

  if (basePath.includes('?')) {
    const [pathname, search = ''] = basePath.split('?');
    const params = new URLSearchParams(search);

    if (pageNumber <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(pageNumber));
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  if (pageNumber <= 1) {
    return basePath;
  }

  return `${basePath}/page/${pageNumber}`;
}

export function formatPaginationSummaryLabel({ emptyLabel = '0 items', pageSize, startIndex, totalCount }) {
  if (!Number.isFinite(totalCount) || totalCount <= 0) {
    return emptyLabel;
  }

  const safeStart = Math.max(0, Number(startIndex) || 0);
  const safeSize = Math.max(1, Number(pageSize) || 1);
  const visibleFrom = safeStart + 1;
  const visibleTo = Math.min(safeStart + safeSize, totalCount);

  return `${visibleFrom}-${visibleTo} of ${totalCount}`;
}

export function normalizeProviderIds(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeProviderDescriptors(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((provider) => ({
      email: normalizeEmail(provider?.email),
      id: String(provider?.id || '')
        .trim()
        .toLowerCase(),
      uid: String(provider?.uid || '').trim() || null,
    }))
    .filter((provider) => provider.id);
}

export function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeOptionalText(value) {
  return String(value || '').trim();
}

export function isReservedAccountSegment(value) {
  return RESERVED_ACCOUNT_SEGMENTS.has(
    String(value || '')
      .trim()
      .toLowerCase()
  );
}

export function resolveSecurityErrorMessage(error, fallbackMessage) {
  const message = String(error?.message || '').trim();
  const code = String(error?.code || '').trim();

  if (
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'invalid_credentials' ||
    code === 'invalid_login_credentials' ||
    message.includes('auth/wrong-password') ||
    message.includes('auth/invalid-credential') ||
    message.includes('INVALID_LOGIN_CREDENTIALS') ||
    message.toLowerCase().includes('invalid login credentials') ||
    message.toLowerCase().includes('invaild login credantials')
  ) {
    return 'Current password is incorrect';
  }

  if (
    message.toLowerCase().includes('invalid jwt') ||
    message.toLowerCase().includes('token is malformed') ||
    message.toLowerCase().includes('invalid number of segments') ||
    message.includes('Authentication token has been revoked') ||
    message.includes('Invalid or expired authentication token')
  ) {
    return 'Session expired. Please sign in again';
  }

  if (message.includes('Recent authentication is required') || message.includes('auth/requires-recent-login')) {
    return 'Please re-enter your current password and try again';
  }

  if (message.includes('Verification code has expired')) {
    return 'Verification code has expired. Request a new code';
  }

  if (message.includes('Verification code is invalid')) {
    return 'Verification code is invalid';
  }

  if (message.includes('Verification code has already been used')) {
    return 'Verification code already used. Request a new code';
  }

  if (message.includes('Verification could not be completed')) {
    return 'Verification could not be completed. Request a new code and try again';
  }

  if (message.includes('Verification code attempts are exhausted')) {
    return 'Too many invalid code attempts. Request a new code';
  }

  if (message.includes('Step-up verification is required')) {
    return 'Verification is required before completing this action';
  }

  if (message.includes('already linked to this account')) {
    return 'Email/password sign-in is already linked to this account';
  }

  if (message.includes('supported email domains')) {
    return 'This email domain is not allowed';
  }

  if (message.includes('already in use')) {
    return 'This email address is already in use';
  }

  if (message.includes('email/password sign-in enabled')) {
    return 'Email/password sign-in must be enabled for this action';
  }

  if (message.includes('Google account email must match')) {
    return 'Google account email must match your current account email';
  }

  if (
    code === 'GOOGLE_LINK_EMAIL_MISMATCH' ||
    message.includes('current Tvizzie email to link') ||
    message.includes('current email to link')
  ) {
    return 'Google account email must match your current email to link';
  }

  if (code === 'GOOGLE_UNLINK_REQUIRES_PASSWORD' || message.includes('email/password sign-in remains enabled')) {
    return 'Google can only be unlinked while email/password sign-in remains enabled';
  }

  if (code === 'GOOGLE_UNLINK_DISABLED' || message.includes('Google unlink is disabled in Tvizzie 2.0')) {
    return 'Google unlink is disabled in this rollout';
  }

  if (code === 'single_identity_not_deletable' || message.includes('at least 1 identity after unlinking')) {
    return 'Google unlink failed because this account has no backup identity yet. Add email/password as a real linked identity first.';
  }

  if (
    code === 'GOOGLE_LINK_MANUAL_LINKING_DISABLED' ||
    code === 'GOOGLE_UNLINK_MANUAL_LINKING_DISABLED' ||
    message.includes('Manual linking is disabled')
  ) {
    return 'Google linking/unlinking is disabled in Supabase. Enable "Manual Linking" in Supabase Auth settings and try again';
  }

  if (
    code === 'GOOGLE_PROVIDER_COLLISION' ||
    message.includes('already linked to another Tvizzie account') ||
    message.includes('already linked to another account')
  ) {
    return 'This Google account is already linked to another account';
  }

  if (message && !message.includes('Supabase error')) {
    return message;
  }

  return fallbackMessage;
}

export function validatePassword(value) {
  const password = String(value || '');

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least 1 uppercase letter');
  }

  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least 1 number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must contain at least 1 symbol');
  }

  return password;
}

export async function deleteAccountRequest({ currentPassword }) {
  const response = await fetch('/api/auth/account/delete', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword: currentPassword || null,
    }),
  });

  const payload = await response.json().catch(() => ({ error: 'Account could not be deleted' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Account could not be deleted');
  }

  return payload;
}

export async function completeEmailChangeRequest({ newEmail }) {
  const response = await fetch('/api/auth/account/change-email', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newEmail,
    }),
  });

  const payload = await response.json().catch(() => ({ error: 'Email could not be updated' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Email could not be updated');
  }

  return payload;
}

export async function completePasswordChangeRequest({ currentPassword, newPassword }) {
  const response = await fetch('/api/auth/account/change-password', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const payload = await response.json().catch(() => ({ error: 'Password could not be updated' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Password could not be updated');
  }

  return payload;
}

export async function completePasswordSetRequest({ newPassword }) {
  const response = await fetch('/api/auth/account/set-password', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...createCsrfHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newPassword,
    }),
  });

  const payload = await response.json().catch(() => ({ error: 'Password could not be set' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Password could not be set');
  }

  return payload;
}

export function getMediaTitle(item = {}) {
  return item?.title || item?.name || item?.original_title || item?.original_name || 'Untitled';
}

export function sortAccountItems(items, sortMethod) {
  if (!items || items.length === 0) return [];

  const sorted = [...items];
  const getPositionValue = (item) => {
    if (Number.isFinite(Number(item?.position))) {
      return Number(item.position);
    }

    const addedAt = new Date(item?.addedAt || '').getTime();
    return Number.isFinite(addedAt) ? addedAt : 0;
  };

  switch (sortMethod) {
    case 'default':
      return sorted.sort((first, second) => getPositionValue(second) - getPositionValue(first));
    case 'newest':
      return sorted.sort((first, second) => {
        return new Date(second.addedAt) - new Date(first.addedAt);
      });
    case 'oldest':
      return sorted.sort((first, second) => {
        return new Date(first.addedAt) - new Date(second.addedAt);
      });
    case 'rating_high':
      return sorted.sort((first, second) => (second.vote_average || 0) - (first.vote_average || 0));
    case 'rating_low':
      return sorted.sort((first, second) => (first.vote_average || 0) - (second.vote_average || 0));
    case 'title_az':
      return sorted.sort((first, second) => getMediaTitle(first).localeCompare(getMediaTitle(second)));
    default:
      return sorted;
  }
}

export function getFollowState(followRelationship) {
  if (followRelationship.outboundStatus === FOLLOW_STATUSES.ACCEPTED) {
    return 'following';
  }

  if (followRelationship.outboundStatus === FOLLOW_STATUSES.PENDING) {
    return 'requested';
  }

  if (followRelationship.showFollowBack) {
    return 'follow_back';
  }

  return 'follow';
}

export function getNavDescription({ activeTab, auth, selectedList, username }) {
  if (!username && auth.isReady && !auth.isAuthenticated) {
    return 'Sign in to see your account';
  }

  if (activeTab === 'likes') return 'Likes';
  if (activeTab === 'activity') return 'Recent Activity';
  if (activeTab === 'watched') return 'Watched';
  if (activeTab === 'watchlist') return 'Watchlist';
  if (activeTab === 'reviews') return 'Reviews';
  if (activeTab === 'liked_reviews') return 'Liked Reviews';
  if (activeTab === 'liked_lists') return 'Liked Lists';

  if (activeTab === 'lists') {
    if (selectedList) {
      return `Lists / ${selectedList.title}`;
    }

    return 'Custom Lists';
  }

  return '';
}

export function getIsFullScreenEmpty({
  activeTab,
  canViewPrivateContent,
  likes,
  isLoadingCollections,
  isLoadingListItems,
  isOwner,
  isPrivateProfile,
  listItems,
  lists,
  selectedList,
  watchlist,
}) {
  if (!isOwner && isPrivateProfile && !canViewPrivateContent) {
    return true;
  }

  if (activeTab === 'likes') {
    return isLoadingCollections || likes.length === 0;
  }

  if (activeTab === 'watchlist') {
    return isLoadingCollections || watchlist.length === 0;
  }

  if (activeTab === 'lists') {
    if (isLoadingCollections) return true;
    if (!selectedList) return lists.length === 0;
    return isLoadingListItems || listItems.length === 0;
  }

  return false;
}
