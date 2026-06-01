import { SEARCH_TYPES } from './constants';
import { normalizeString, normalizeToken } from './text';

export const SEARCH_MOVIE_FILTER_DEFAULTS = Object.freeze({
  decade: 'all',
  genre: 'all',
  year: 'all',
});

const SEARCH_GENRE_TOKEN_TO_ID = Object.freeze({
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  science_fiction: 878,
  tv_movie: 10770,
  thriller: 53,
  war: 10752,
  western: 37,
});

function isYearFilterValue(value) {
  return value === 'all' || /^\d{4}$/.test(value);
}

function normalizeYearFilter(value, fallback) {
  const normalizedValue = normalizeString(value).toLowerCase();
  return isYearFilterValue(normalizedValue) ? normalizedValue || fallback : fallback;
}

function resolveMovieReleaseYear(item = {}) {
  const rawValue = normalizeString(item?.release_date || item?.first_air_date);

  if (!rawValue) {
    return null;
  }

  const numericYear = Number.parseInt(rawValue.slice(0, 4), 10);
  return Number.isFinite(numericYear) ? numericYear : null;
}

function findGenreTokenById(genreId) {
  return Object.entries(SEARCH_GENRE_TOKEN_TO_ID).find(([, id]) => id === Number(genreId))?.[0] || null;
}

function collectMovieGenreTokens(item = {}) {
  const tokens = new Set();
  const genreIds = Array.isArray(item?.genre_ids) ? item.genre_ids : [];
  const genres = Array.isArray(item?.genres) ? item.genres : [];

  genreIds.forEach((genreId) => {
    const matchedToken = findGenreTokenById(genreId);

    if (matchedToken) {
      tokens.add(matchedToken);
    }
  });

  genres.forEach((genre) => {
    if (genre && typeof genre === 'object') {
      const matchedToken = findGenreTokenById(genre.id);
      const nameToken = normalizeToken(genre.name);

      if (matchedToken) {
        tokens.add(matchedToken);
      }

      if (nameToken) {
        tokens.add(nameToken);
      }

      return;
    }

    const genreToken = normalizeToken(genre);

    if (genreToken) {
      tokens.add(genreToken);
    }
  });

  return tokens;
}

export function normalizeSearchMovieFilters(filters = {}) {
  const normalizedDecade = normalizeYearFilter(filters?.decade, SEARCH_MOVIE_FILTER_DEFAULTS.decade);
  const normalizedGenre = normalizeToken(filters?.genre);
  const normalizedYear = normalizeYearFilter(filters?.year, SEARCH_MOVIE_FILTER_DEFAULTS.year);

  return {
    decade: normalizedDecade,
    genre:
      normalizedGenre && (normalizedGenre === 'all' || SEARCH_GENRE_TOKEN_TO_ID[normalizedGenre])
        ? normalizedGenre
        : SEARCH_MOVIE_FILTER_DEFAULTS.genre,
    year: normalizedYear,
  };
}

export function hasActiveSearchMovieFilters(filters = SEARCH_MOVIE_FILTER_DEFAULTS) {
  const normalizedFilters = normalizeSearchMovieFilters(filters);

  return Object.keys(SEARCH_MOVIE_FILTER_DEFAULTS).some(
    (key) => normalizedFilters[key] !== SEARCH_MOVIE_FILTER_DEFAULTS[key]
  );
}

export function applySearchMovieFilters(items = [], filters = SEARCH_MOVIE_FILTER_DEFAULTS) {
  const normalizedFilters = normalizeSearchMovieFilters(filters);

  if (!hasActiveSearchMovieFilters(normalizedFilters)) {
    return Array.isArray(items) ? items : [];
  }

  return (Array.isArray(items) ? items : []).filter((item) => {
    if (item?.media_type !== SEARCH_TYPES.MOVIE && item?.media_type !== SEARCH_TYPES.TV) {
      return false;
    }

    const releaseYear = resolveMovieReleaseYear(item);

    if (normalizedFilters.year !== 'all' && String(releaseYear || '') !== normalizedFilters.year) {
      return false;
    }

    if (normalizedFilters.decade !== 'all') {
      const decadeValue = Number.parseInt(normalizedFilters.decade, 10);

      if (
        !Number.isFinite(decadeValue) ||
        !Number.isFinite(releaseYear) ||
        releaseYear < decadeValue ||
        releaseYear >= decadeValue + 10
      ) {
        return false;
      }
    }

    if (normalizedFilters.genre !== 'all') {
      return collectMovieGenreTokens(item).has(normalizedFilters.genre);
    }

    return true;
  });
}
