import { normalizeValue, resolveVersionedImageUrl, isValidUrl } from '@/shared/utils';

// ============================================================
// Account Constants & Validation
// ============================================================

export const ACCOUNT_SECTION_KEYS = Object.freeze([
  'activity',
  'likes',
  'watched',
  'watchlist',
  'reviews',
  'lists',
]);

export const RESERVED_ACCOUNT_SEGMENTS = new Set([...ACCOUNT_SECTION_KEYS, 'edit']);

export function isReservedAccountSegment(value) {
  return RESERVED_ACCOUNT_SEGMENTS.has(
    String(value || '')
      .trim()
      .toLowerCase(),
  );
}

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
const USERNAME_PATTERN = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

const TURKISH_USERNAME_MAP = Object.freeze({
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
});

export function sanitizeUsername(value) {
  const normalized = normalizeValue(value)
    .toLowerCase()
    .replace(/[çğışüö]/g, (char) => TURKISH_USERNAME_MAP[char] || char);

  return normalized
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

export function validateUsername(value) {
  const username = sanitizeUsername(value);

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    throw new Error(
      `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters long`,
    );
  }

  if (!USERNAME_PATTERN.test(username)) {
    throw new Error('Username can only contain lowercase letters, numbers, and hyphens');
  }

  if (isReservedAccountSegment(username)) {
    throw new Error('This username is reserved');
  }

  return username;
}

export function normalizeAccountDisplayNameSearchValue(value) {
  return normalizeValue(value).toLocaleLowerCase();
}

// ============================================================
// Avatar Utilities
// ============================================================

const DEFAULT_USER_AVATAR = '/images/default-avatar.svg';

function resolveAvatarSource(user) {
  if (typeof user === 'string') {
    return user;
  }

  return user?.displayName || user?.name || user?.username || user?.email || user?.id || '';
}

function normalizeAvatarUrl(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '';
  }

  const lowered = normalized.toLowerCase();

  if (
    lowered === 'null' ||
    lowered === 'undefined' ||
    lowered === 'http://' ||
    lowered === 'https://'
  ) {
    return '';
  }

  if (normalized.startsWith('/') || normalized.startsWith('data:image/')) {
    return normalized;
  }

  return isValidUrl(normalized) ? resolveVersionedImageUrl(normalized) : '';
}

function resolveAvatarUrlCandidate(user = {}) {
  if (typeof user === 'string') {
    return normalizeAvatarUrl(user);
  }

  const candidates = [
    user?.avatarUrl,
    user?.avatar_url,
    user?.photoURL,
    user?.photoUrl,
    user?.picture,
    user?.image,
    user?.user_metadata?.avatar_url,
    user?.user_metadata?.picture,
    user?.user_metadata?.avatar,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAvatarUrl(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function getAvatarInitial(user, fallback = 'A') {
  const source = String(resolveAvatarSource(user) || '')
    .trim()
    .replace(/^@+/, '');

  if (!source) {
    return fallback;
  }

  const firstCharacter = source.includes('@') ? source.split('@')[0]?.[0] : source[0];

  return String(firstCharacter || fallback).toUpperCase();
}

function createInitialAvatarDataUrl(letter = 'A') {
  const normalizedLetter = String(letter || 'A')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const svg = `
 <svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
 <rect width="256" height="256" fill="#F5F5F4"/>
 <text
 x="50%"
 y="50%"
 text-anchor="middle"
 dominant-baseline="central"
 fill="#111111"
 font-family="ui-sans-serif, system-ui, sans-serif"
 font-size="104"
 font-weight="600"
 >
 ${normalizedLetter}
 </text>
 </svg>
 `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getUserAvatarFallbackUrl(user = {}, fallbackUrl = DEFAULT_USER_AVATAR) {
  const fallbackInitial = getAvatarInitial(user);

  if (fallbackInitial) {
    return createInitialAvatarDataUrl(fallbackInitial);
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl);
  return normalizedFallback || DEFAULT_USER_AVATAR;
}

export function getUserAvatarUrl(user = {}) {
  const rawAvatarUrl = resolveAvatarUrlCandidate(user);

  if (rawAvatarUrl) {
    return rawAvatarUrl;
  }

  return getUserAvatarFallbackUrl(user);
}

export function applyAvatarFallback(event, fallbackUrl = DEFAULT_USER_AVATAR) {
  const target = event?.currentTarget;

  if (!target || typeof target !== 'object') {
    return;
  }

  if (target.dataset?.avatarFallbackApplied === 'true') {
    return;
  }

  const normalizedFallback = normalizeAvatarUrl(fallbackUrl) || DEFAULT_USER_AVATAR;

  if (target.dataset) {
    target.dataset.avatarFallbackApplied = 'true';
  }

  target.src = normalizedFallback;
}

// ============================================================
// Data Error Utilities
// ============================================================

function getDataErrorCode(error) {
  return typeof error?.code === 'string' ? error.code.trim().toLowerCase() : '';
}

export function isPermissionDeniedError(error) {
  const errorCode = getDataErrorCode(error);

  if (errorCode === 'permission-denied') {
    return true;
  }

  const message = typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '';

  return (
    message.includes('missing or insufficient permissions') || message.includes('permission denied')
  );
}

export function logDataError(message, error, options = {}) {
  const { suppressPermissionDenied = true } = options;

  if (suppressPermissionDenied && isPermissionDeniedError(error)) {
    return false;
  }

  console.error(message, error);
  return true;
}

// ============================================================
// Media, Collection, Feed, Profile & Route Constants
// ============================================================

export const DEFAULT_MEDIA_BUCKET = 'profile-media';
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_UPLOAD_BYTES_BY_TARGET = Object.freeze({
  avatar: 3 * 1024 * 1024,
  banner: MAX_UPLOAD_BYTES,
});
export const MIME_EXTENSION_MAP = Object.freeze({
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
});
export const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION_MAP));
export const AVIF_BRANDS = new Set(['avif', 'avis']);

export const MEDIA_COLLECTION_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const LIST_COLLECTION_SELECT = [
  'created_at',
  'description',
  'id',
  'likes_count',
  'payload',
  'poster_path',
  'reviews_count',
  'slug',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const LIST_ITEM_SELECT = [
  'added_at',
  'backdrop_path',
  'entity_id',
  'entity_type',
  'media_key',
  'payload',
  'poster_path',
  'position',
  'title',
  'updated_at',
  'user_id',
].join(',');

export const WATCHED_SELECT = [
  'backdrop_path',
  'created_at',
  'entity_id',
  'entity_type',
  'last_watched_at',
  'media_key',
  'payload',
  'poster_path',
  'title',
  'updated_at',
  'user_id',
  'watch_count',
].join(',');

export const ACTIVITY_SELECT = [
  'created_at',
  'dedupe_key',
  'event_type',
  'id',
  'payload',
  'updated_at',
  'user_id',
].join(',');
export const ACTIVITY_SUBJECT_FILTERS = new Set(['all', 'list', 'movie']);
export const ACTIVITY_SORT_MODES = new Set(['newest', 'oldest']);
export const FOLLOW_STATUS_ACCEPTED = 'accepted';

export const ACCOUNT_READ_FUNCTION = 'account-read';
export const ACCOUNT_WRITE_FUNCTION = 'account-write';

export const EMPTY_EDITABLE_ACCOUNT_COUNTS = Object.freeze({
  followers: 0,
  following: 0,
  likes: 0,
  lists: 0,
  watched: 0,
  watchlist: 0,
});

export const ACCOUNT_PROFILE_SELECT = [
  'avatar_url',
  'banner_url',
  'created_at',
  'description',
  'display_name',
  'display_name_lower',
  'email',
  'favorite_showcase',
  'id',
  'is_private',
  'last_activity_at',
  'updated_at',
  'username',
  'username_lower',
].join(',');

export const COUNTER_SELECT = [
  'follower_count',
  'following_count',
  'likes_count',
  'lists_count',
  'watched_count',
  'watchlist_count',
].join(',');

export const PROFILE_COUNTERS_TIMEOUT_MS = 1200;
export const FOLLOW_COUNTS_TIMEOUT_MS = 1200;

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

