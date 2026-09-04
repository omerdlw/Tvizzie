import { normalizeValue } from '@/shared';

export const MOVIE_MEDIA_TYPE = 'movie';
export const PERSON_MEDIA_TYPE = 'person';
export const TV_MEDIA_TYPE = 'tv';
export const LIST_SUBJECT_TYPE = 'list';

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
  return isTitleMediaType(value) || isListSubjectType(value);
}

export function getMediaDetailPath({ entityId, entityType, id, media_type: mediaType } = {}) {
  const resolvedType = normalizeMediaType(entityType || mediaType);
  const resolvedId = String(entityId ?? id ?? '').trim();

  if (!resolvedId || !isTitleMediaType(resolvedType)) {
    return null;
  }

  return `/${resolvedType}/${resolvedId}`;
}

export function buildMediaItemKey(entityType, entityId) {
  if (!entityType || entityId === undefined || entityId === null) {
    throw new Error('buildMediaItemKey requires both entityType and entityId');
  }

  return `${normalizeValue(entityType).toLowerCase()}_${normalizeValue(entityId)}`;
}

export function createMediaSnapshot(media = {}) {
  return {
    entityId: normalizeValue(media.entityId ?? media.id),
    entityType: normalizeMediaType(media.entityType ?? media.media_type ?? media.type),
    title: media.title || media.original_title || media.name || media.original_name || '',
    posterPath: media.posterPath || media.poster_path || null,
    backdropPath: media.backdropPath || media.backdrop_path || null,
  };
}

export function assertMovieMedia(media, message = 'Only movies are supported') {
  const mediaSnapshot = createMediaSnapshot(media);

  if (!isMovieMediaType(mediaSnapshot.entityType)) {
    throw new Error(message);
  }

  return mediaSnapshot;
}

export function assertTitleMedia(media, message = 'Only movies and TV series are supported') {
  const mediaSnapshot = createMediaSnapshot(media);

  if (!isTitleMediaType(mediaSnapshot.entityType)) {
    throw new Error(message);
  }

  return mediaSnapshot;
}
