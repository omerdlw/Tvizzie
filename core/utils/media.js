const MOVIE_MEDIA_TYPE = 'movie';
const PERSON_MEDIA_TYPE = 'person';
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
  return isMovieMediaType(value) || isListSubjectType(value) || isUserSubjectType(value);
}
