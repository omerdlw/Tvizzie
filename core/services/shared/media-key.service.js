import { isMovieMediaType, normalizeMediaType } from '@/core/utils/media';

function normalizeValue(value) {
  return String(value || '').trim();
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
