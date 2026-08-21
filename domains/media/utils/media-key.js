import { normalizeValue } from '@/shared/normalize';
import { isMovieMediaType, isTitleMediaType, normalizeMediaType } from '@/shared/media-type';

export {
  getMediaDetailPath,
  isListSubjectType,
  isMovieMediaType,
  isPersonMediaType,
  isSupportedContentSubjectType,
  isTitleMediaType,
  isTvMediaType,
  isTvReference,
  isUserSubjectType,
  LIST_SUBJECT_TYPE,
  MOVIE_MEDIA_TYPE,
  normalizeMediaType,
  PERSON_MEDIA_TYPE,
  resolveExplicitMediaType,
  TV_MEDIA_TYPE,
  USER_SUBJECT_TYPE,
} from '@/shared/media-type';

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
