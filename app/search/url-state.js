import { SEARCH_TYPES } from '@/features/search/constants';
import { hasActiveSearchMovieFilters, normalizeSearchMovieFilters } from '@/features/search/utils';

export const DEFAULT_SEARCH_MOVIE_FILTERS = Object.freeze({
  decade: 'all',
  genre: 'all',
  year: 'all',
});

export function resolveSearchType(value) {
  if (
    value === SEARCH_TYPES.MOVIE ||
    value === SEARCH_TYPES.PERSON ||
    value === SEARCH_TYPES.USER ||
    value === SEARCH_TYPES.LIST ||
    value === SEARCH_TYPES.REVIEW
  ) {
    return value;
  }

  return SEARCH_TYPES.ALL;
}

export function parseSearchMovieFilters(searchParams) {
  return normalizeSearchMovieFilters({
    decade: searchParams?.get('decade'),
    genre: searchParams?.get('genre'),
    year: searchParams?.get('year'),
  });
}

export function getReleaseYearOptions(minYear = 1900) {
  const currentYear = new Date().getUTCFullYear();
  const options = [];

  for (let year = currentYear; year >= minYear; year -= 1) {
    options.push({
      label: String(year),
      value: String(year),
    });
  }

  return [{ label: 'Any year', value: 'all' }, ...options];
}

export function applySearchMovieFilterParams(params, filters) {
  const normalizedFilters = normalizeSearchMovieFilters(filters);

  if (normalizedFilters.genre !== DEFAULT_SEARCH_MOVIE_FILTERS.genre) {
    params.set('genre', normalizedFilters.genre);
  } else {
    params.delete('genre');
  }

  if (normalizedFilters.decade !== DEFAULT_SEARCH_MOVIE_FILTERS.decade) {
    params.set('decade', normalizedFilters.decade);
  } else {
    params.delete('decade');
  }

  if (normalizedFilters.year !== DEFAULT_SEARCH_MOVIE_FILTERS.year) {
    params.set('year', normalizedFilters.year);
  } else {
    params.delete('year');
  }
}

export function areMovieFiltersEqual(left, right) {
  return left?.genre === right?.genre && left?.decade === right?.decade && left?.year === right?.year;
}

export function getMovieFiltersKey(filters) {
  const normalizedFilters = normalizeSearchMovieFilters(filters);
  return `${normalizedFilters.genre}|${normalizedFilters.decade}|${normalizedFilters.year}`;
}

export function buildSearchHref({ pathname, query, searchParamsString, searchType, movieFilters }) {
  const params = new URLSearchParams(searchParamsString);
  const normalizedQuery = query.trim();
  const normalizedMovieFilters = normalizeSearchMovieFilters(movieFilters);
  const nextSearchType =
    searchType === SEARCH_TYPES.ALL && hasActiveSearchMovieFilters(normalizedMovieFilters)
      ? SEARCH_TYPES.MOVIE
      : searchType;

  if (normalizedQuery) {
    params.set('q', normalizedQuery);
  } else {
    params.delete('q');
  }

  if (normalizedQuery && nextSearchType !== SEARCH_TYPES.ALL) {
    params.set('type', nextSearchType);
  } else {
    params.delete('type');
  }

  applySearchMovieFilterParams(params, normalizedMovieFilters);

  const nextQueryString = params.toString();

  return nextQueryString ? `${pathname}?${nextQueryString}` : pathname;
}
