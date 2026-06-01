import { SEARCH_TYPES } from './constants';

export function normalizeResult(item, type = item?.media_type) {
  return {
    ...item,
    media_type: type,
  };
}

export function getDetailPath(item) {
  if (!item?.id || !item?.media_type) return null;

  switch (item.media_type) {
    case SEARCH_TYPES.MOVIE:
      return `/movie/${item.id}`;
    case SEARCH_TYPES.TV:
      return `/tv/${item.id}`;
    case SEARCH_TYPES.PERSON:
      return `/person/${item.id}`;
    case SEARCH_TYPES.USER:
      return `/account/${item.username || item.id}`;
    default:
      return null;
  }
}

export function getItemTitle(item) {
  if (item.media_type === SEARCH_TYPES.USER) {
    return item.displayName || item.username || 'Unknown User';
  }

  return item.title || item.name || 'Untitled';
}

export function getItemSubtitle(item) {
  switch (item.media_type) {
    case SEARCH_TYPES.USER:
      return 'USER';
    case SEARCH_TYPES.MOVIE:
      return 'MOVIE';
    case SEARCH_TYPES.TV:
      return 'TV SERIES';
    case SEARCH_TYPES.PERSON:
    default:
      return 'PERSON';
  }
}

export function getItemYear(item) {
  const date = item.release_date || item.first_air_date || '';
  return date.substring(0, 4);
}

export function getItemDirector(item) {
  return item.director || null;
}

export function getImagePath(item) {
  if (item.media_type === SEARCH_TYPES.USER) return null;
  return item.poster_path || item.profile_path || item.backdrop_path || null;
}
