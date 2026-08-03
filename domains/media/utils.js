// ============================================================
// Media Type Utilities
// ============================================================

const MOVIE_MEDIA_TYPE = 'movie';
const PERSON_MEDIA_TYPE = 'person';
const TV_MEDIA_TYPE = 'tv';
const LIST_SUBJECT_TYPE = 'list';
const USER_SUBJECT_TYPE = 'user';

export function normalizeMediaType(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function isMovieMediaType(value) {
  return normalizeMediaType(value) === MOVIE_MEDIA_TYPE;
}

export function isPersonMediaType(value) {
  return normalizeMediaType(value) === PERSON_MEDIA_TYPE;
}

export function isTvMediaType(value) {
  return normalizeMediaType(value) === TV_MEDIA_TYPE;
}

export function isTitleMediaType(value) {
  const normalizedType = normalizeMediaType(value);
  return normalizedType === MOVIE_MEDIA_TYPE || normalizedType === TV_MEDIA_TYPE;
}

export function isListSubjectType(value) {
  return normalizeMediaType(value) === LIST_SUBJECT_TYPE;
}

export function isUserSubjectType(value) {
  return normalizeMediaType(value) === USER_SUBJECT_TYPE;
}

export function resolveExplicitMediaType(item = {}, fallbackValue = '') {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return normalizeMediaType(item || fallbackValue);
  }

  return normalizeMediaType(item?.entityType ?? item?.media_type ?? item?.type ?? fallbackValue);
}

export function isTvReference(value) {
  const normalizedValue = String(value || '').trim();

  return normalizedValue.startsWith('/tv/') || normalizedValue.includes('tv_');
}

export function isSupportedContentSubjectType(value) {
  return isTitleMediaType(value) || isListSubjectType(value) || isUserSubjectType(value);
}

export function getMediaDetailPath({ entityId, entityType, id, media_type: mediaType } = {}) {
  const resolvedType = normalizeMediaType(entityType || mediaType);
  const resolvedId = String(entityId ?? id ?? '').trim();

  if (!resolvedId || !isTitleMediaType(resolvedType)) {
    return null;
  }

  return `/${resolvedType}/${resolvedId}`;
}

export function getMediaTitle(item = {}) {
  return item?.title || item?.original_title || item?.name || item?.original_name || 'Untitled';
}

export function getMediaReleaseDate(item = {}) {
  return item?.release_date || item?.first_air_date || '';
}

// ============================================================
// Collection Utilities
// ============================================================

export function uniqueBy(items, key = 'id') {
  if (!Array.isArray(items)) return [];
  const getKey = typeof key === 'function' ? key : (item) => item?.[key];
  const map = new Map();
  items.forEach((item) => {
    const value = getKey(item);
    if (value === undefined || value === null) return;
    if (!map.has(value)) map.set(value, item);
  });
  return Array.from(map.values());
}

// ============================================================
// Media List Constants
// ============================================================

export const LIST_ROW_SELECT = [
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

export const LIST_ITEM_PREVIEW_SELECT = ['added_at', 'payload'].join(',');

