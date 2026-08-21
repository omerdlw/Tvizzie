import { TMDB_IMG } from '@/shared/constants';
import { getPreferredMoviePosterSrc } from '@/domains/media/utils/poster-preferences';

export function toAccountMediaCard(item = {}) {
  const mediaType = item.media_type || item.entityType;
  const detailId = item.entityId || item.id;
  if (!detailId || (mediaType !== 'movie' && mediaType !== 'tv')) return null;

  const title = item.title || item.original_title || item.name || item.original_name || 'Untitled';
  const year = item.release_date?.slice?.(0, 4) || item.first_air_date?.slice?.(0, 4) || null;
  const preferredPoster = mediaType === 'movie' ? getPreferredMoviePosterSrc(item, 'w342') : null;
  const imageSrc =
    preferredPoster ||
    item.poster_path_full ||
    (item.poster_path ? `${TMDB_IMG}/w342${item.poster_path}` : null);

  return {
    href: `/${mediaType}/${detailId}`,
    id: item.mediaKey || `${mediaType}-${detailId}`,
    imageAlt: title,
    imageSrc,
    item,
    tooltipText: year ? `${title} (${year})` : title,
  };
}

export function getCanonicalMediaKey(item = {}) {
  if (!item) return '';
  const rawType = item?.entityType || item?.media_type || item?.type || '';
  const rawId = String(item?.entityId ?? item?.id ?? '').trim();

  if (item?.mediaKey) {
    const key = String(item.mediaKey).trim();
    if (key.includes('-')) return key.replace('-', '_');
    return key;
  }

  let entityId = rawId;
  let resolvedType = rawType;

  if (rawId.includes('-') || rawId.includes('_')) {
    const parts = rawId.split(/[-_]/);
    if (parts.length >= 2) {
      if (!resolvedType) resolvedType = parts[0];
      entityId = parts[parts.length - 1];
    }
  }

  const normalizedType =
    String(resolvedType).trim().toLowerCase() === 'tv' ||
    String(resolvedType).trim().toLowerCase() === 'show'
      ? 'tv'
      : 'movie';

  return `${normalizedType}_${entityId}`;
}

export function createListItemPayload(media) {
  let entityId = Number(media.entityId);
  let rawType = media.entityType || media.media_type || media.type || '';

  if (!Number.isFinite(entityId) || entityId <= 0) {
    const rawId = String(media.id || media.mediaKey || media.media_key || '').trim();
    if (rawId.includes('-') || rawId.includes('_')) {
      const parts = rawId.split(/[-_]/);
      if (parts.length >= 2) {
        if (!rawType) rawType = parts[0];
        const parsed = Number(parts[parts.length - 1]);
        if (Number.isFinite(parsed) && parsed > 0) {
          entityId = parsed;
        }
      }
    } else {
      const parsed = Number(rawId);
      if (Number.isFinite(parsed) && parsed > 0) {
        entityId = parsed;
      }
    }
  }

  const entityType =
    String(rawType).trim().toLowerCase() === 'tv' || String(rawType).trim().toLowerCase() === 'show'
      ? 'tv'
      : 'movie';

  return {
    entityId: Number.isFinite(entityId) && entityId > 0 ? entityId : Number(media.id || 0),
    entityType,
    title: media.title || media.name || '',
    posterPath: media.poster_path || media.posterPath || null,
    backdropPath: media.backdrop_path || media.backdropPath || null,
    release_date: media.release_date || null,
    first_air_date: media.first_air_date || null,
    genreNames: media.genreNames || media.genre_names || [],
    genre_ids: media.genre_ids || media.genreIds || [],
    genres: media.genres || [],
    name: media.name || media.title || '',
    popularity: media.popularity || null,
    providerIds: [],
    providerNames: [],
    providers: [],
    runtime: media.runtime || null,
    vote_average: media.vote_average || null,
    vote_count: media.vote_count || null,
  };
}
