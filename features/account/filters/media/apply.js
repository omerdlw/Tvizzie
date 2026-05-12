import { DEFAULT_MEDIA_FILTERS } from './options';
import { normalizeString } from '../shared';
import {
  collectGenreValues,
  resolveUserRating,
} from './values';
import {
  resolveMediaTitle,
  resolveReleaseDate,
  resolveReleaseYear,
  toMediaKey,
} from './identity';
import { sortMediaItems } from './sort';

export { buildMediaKeySet } from './identity';

export function applyMediaFilters(items = [], filters = DEFAULT_MEDIA_FILTERS, context = {}) {
  const sourceItems = Array.isArray(items) ? items : [];
  const normalizedFilters = {
    ...DEFAULT_MEDIA_FILTERS,
    ...(filters || {}),
  };
  const normalizedQuery = normalizeString(normalizedFilters.query).toLocaleLowerCase();
  const watchedKeys = context.watchedKeys instanceof Set ? context.watchedKeys : new Set();
  const likedKeys = context.likedKeys instanceof Set ? context.likedKeys : new Set();
  const reviewedKeys = context.reviewedKeys instanceof Set ? context.reviewedKeys : new Set();
  const watchlistKeys = context.watchlistKeys instanceof Set ? context.watchlistKeys : new Set();
  const hasGenreMetadata = sourceItems.some((item) => collectGenreValues(item).size > 0);

  const filteredItems = sourceItems.filter((item) => {
    const mediaKey = toMediaKey(item);
    const title = resolveMediaTitle(item).toLocaleLowerCase();

    if (normalizedQuery && !title.includes(normalizedQuery)) {
      return false;
    }

    if (normalizedFilters.decade !== 'all') {
      const decadeValue = Number.parseInt(normalizedFilters.decade, 10);
      const releaseYear = resolveReleaseYear(item);

      if (
        !Number.isFinite(decadeValue) ||
        !Number.isFinite(releaseYear) ||
        releaseYear < decadeValue ||
        releaseYear >= decadeValue + 10
      ) {
        return false;
      }
    }

    if (normalizedFilters.genre !== 'all' && hasGenreMetadata) {
      const genreValues = collectGenreValues(item);

      if (!genreValues.has(normalizedFilters.genre)) {
        return false;
      }
    }

    const eyeFlags = normalizedFilters.eyeFlags;

    if (eyeFlags.has('hide_watched') && watchedKeys.has(mediaKey)) {
      return false;
    }

    if (eyeFlags.has('hide_liked') && likedKeys.has(mediaKey)) {
      return false;
    }

    if (eyeFlags.has('hide_reviewed') && reviewedKeys.has(mediaKey)) {
      return false;
    }

    if (eyeFlags.has('hide_watchlist') && watchlistKeys.has(mediaKey)) {
      return false;
    }

    if (eyeFlags.has('hide_rewatched') && Number(item?.watchCount || 0) > 1) {
      return false;
    }

    if (eyeFlags.has('hide_rated') && resolveUserRating(item) !== null) {
      return false;
    }

    if (eyeFlags.has('hide_unreleased')) {
      const releaseDate = resolveReleaseDate(item);

      if (releaseDate) {
        const releaseTime = new Date(releaseDate).getTime();

        if (Number.isFinite(releaseTime) && releaseTime > Date.now()) {
          return false;
        }
      }
    }

    if (eyeFlags.has('hide_documentaries') && collectGenreValues(item).has('documentary')) {
      return false;
    }

    return true;
  });

  return sortMediaItems(filteredItems, normalizedFilters.sort);
}
