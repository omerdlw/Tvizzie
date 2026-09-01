import {
  TMDB_API_URL,
  toFiniteNumber,
  isPersonMediaType,
  isTvMediaType,
} from '@/shared';

const DEFAULT_WATCH_REGION = 'US';
const UNKNOWN_REGION_CODES = new Set(['A1', 'A2', 'AP', 'EU', 'T1', 'XX']);
const GEO_COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'cloudfront-viewer-country',
  'fastly-client-country',
  'x-appengine-country',
  'x-country-code',
];

export { DEFAULT_WATCH_REGION };

export function normalizeWatchRegion(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized) || UNKNOWN_REGION_CODES.has(normalized)) {
    return null;
  }

  return normalized;
}

export function resolveWatchRegionFromLocale(value) {
  const locale = String(value || '')
    .split(';')[0]
    .trim()
    .replace(/_/g, '-');

  if (!locale) {
    return null;
  }

  const parts = locale.split('-');

  for (const part of parts.slice(1)) {
    const region = normalizeWatchRegion(part);

    if (region) {
      return region;
    }
  }

  return null;
}

export function resolveWatchRegionFromAcceptLanguage(value) {
  return String(value || '')
    .split(',')
    .map((entry) => resolveWatchRegionFromLocale(entry))
    .find(Boolean);
}

export function resolveWatchRegionFromBrowser() {
  if (typeof navigator === 'undefined') {
    return null;
  }

  const locales = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ];

  return locales.map((locale) => resolveWatchRegionFromLocale(locale)).find(Boolean) || null;
}

export function resolveWatchRegionFromRequestHeaders(requestHeaders) {
  const getHeader =
    requestHeaders && typeof requestHeaders.get === 'function'
      ? (key) => requestHeaders.get(key)
      : () => null;

  for (const headerName of GEO_COUNTRY_HEADERS) {
    const region = normalizeWatchRegion(getHeader(headerName));

    if (region) {
      return { region, source: 'geo' };
    }
  }

  const languageRegion = resolveWatchRegionFromAcceptLanguage(getHeader('accept-language'));

  if (languageRegion) {
    return { region: languageRegion, source: 'locale' };
  }

  return { region: DEFAULT_WATCH_REGION, source: 'fallback' };
}

const MOVIE_IMAGES_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const MOVIE_IMAGES_STORAGE_KEY_PREFIX = 'tmdb:movie-images:';

const movieImagesMemoryCache = new Map();
const movieImagesInFlightRequests = new Map();

function createMovieImagesStorageKey(id) {
  return `${MOVIE_IMAGES_STORAGE_KEY_PREFIX}${id}`;
}

export function readMovieImagesCache(id) {
  const now = Date.now();
  const memoryEntry = movieImagesMemoryCache.get(id);

  if (memoryEntry && memoryEntry.expiresAt > now) {
    return memoryEntry.value;
  }

  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const serializedValue = window.localStorage.getItem(createMovieImagesStorageKey(id));

    if (!serializedValue) {
      return null;
    }

    const parsedEntry = JSON.parse(serializedValue);

    if (!parsedEntry || parsedEntry.expiresAt <= now) {
      window.localStorage.removeItem(createMovieImagesStorageKey(id));
      return null;
    }

    movieImagesMemoryCache.set(id, parsedEntry);
    return parsedEntry.value;
  } catch {
    return null;
  }
}

export function writeMovieImagesCache(id, value) {
  const entry = {
    value,
    expiresAt: Date.now() + MOVIE_IMAGES_CACHE_TTL_MS,
  };

  movieImagesMemoryCache.set(id, entry);

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(createMovieImagesStorageKey(id), JSON.stringify(entry));
  } catch {}
}

export async function withMovieImageInFlightRequest(id, requestFactory) {
  if (movieImagesInFlightRequests.has(id)) {
    return movieImagesInFlightRequests.get(id);
  }

  const requestPromise = Promise.resolve().then(() => requestFactory());
  movieImagesInFlightRequests.set(id, requestPromise);

  try {
    return await requestPromise;
  } finally {
    movieImagesInFlightRequests.delete(id);
  }
}

export const TMDB_SEARCH_REQUEST_TIMEOUT_MS = Object.freeze({
  full: 12000,
  preview: 7000,
});

function createHttpErrorResponse(status, fallbackMessage = 'Request failed') {
  return {
    data: null,
    error: status ? `Request failed with status ${status}` : fallbackMessage,
    status: status || 503,
  };
}

export async function requestJson(
  url,
  { method = 'GET', cache = 'default', timeoutMs = 0, headers = {} } = {},
) {
  const controller = new AbortController();
  const timeoutId =
    Number.isFinite(Number(timeoutMs)) && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  let response;

  try {
    response = await fetch(url, {
      method,
      cache,
      signal: timeoutId ? controller.signal : undefined,
      headers: {
        accept: 'application/json',
        ...headers,
      },
    });
  } catch (error) {
    return {
      data: null,
      error:
        error?.name === 'AbortError' ? 'Request timed out' : error?.message || 'Request failed',
      status: error?.name === 'AbortError' ? 408 : 503,
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  if (!response.ok) {
    return createHttpErrorResponse(response.status);
  }

  return {
    data: await response.json().catch(() => null),
    error: null,
    status: response.status,
  };
}

export function createApiUrl(pathname, params = {}) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';
  const url = new URL(pathname, origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function requestTmdbMovieImages(id) {
  const readToken = process.env.NEXT_PUBLIC_TMDB_READ_TOKEN || '';
  if (!readToken) {
    return null;
  }

  const normalizedBaseUrl = TMDB_API_URL.replace(/\/$/, '');

  return requestJson(`${normalizedBaseUrl}/movie/${id}/images?include_image_language=en,null`, {
    headers: {
      Authorization: `Bearer ${readToken}`,
    },
  });
}


function toRequiredId(value) {
  const normalizedId = String(value || '').trim();

  if (!normalizedId) {
    return null;
  }

  return normalizedId;
}

export class TmdbService {
  static async searchContent(query, searchType = 'movie', page = 1, options = {}) {
    const scope = normalizeSearchScope(options.scope);

    return requestJson(
      createApiUrl('/api/tmdb', {
        action: 'search',
        page,
        q: query,
        scope,
        type: searchType,
      }),
      {
        timeoutMs: options.timeoutMs ?? TMDB_SEARCH_REQUEST_TIMEOUT_MS[scope],
      },
    );
  }

  static async getMovieImages(id) {
    const normalizedId = toRequiredId(id);

    if (!normalizedId) {
      return {
        data: null,
        error: 'Movie id is required',
        status: 400,
      };
    }

    const cachedValue = readMovieImagesCache(normalizedId);

    if (cachedValue) {
      return {
        data: cachedValue,
        error: null,
        status: 200,
      };
    }

    return withMovieImageInFlightRequest(normalizedId, async () => {
      const directResponse = await requestTmdbMovieImages(normalizedId);

      if (directResponse?.data) {
        writeMovieImagesCache(normalizedId, directResponse.data);
        return directResponse;
      }

      return {
        data: null,
        error:
          directResponse?.error ||
          'TMDB movie images request failed. Set NEXT_PUBLIC_TMDB_READ_TOKEN for client access.',
        status: directResponse?.status || 503,
      };
    });
  }

  static async getGenres(mediaType = 'movie') {
    return requestJson(createApiUrl('/api/tmdb', { action: 'genres', mediaType }));
  }

  static async discoverContent({
    genreId,
    mediaType = 'movie',
    page = 1,
    sortBy = 'popularity.desc',
  }) {
    return requestJson(
      createApiUrl('/api/tmdb', {
        action: 'discover',
        genreId,
        mediaType,
        page,
        sortBy,
      }),
    );
  }
}

function getTextLength(value) {
  return String(value || '').trim().length;
}

function hasText(value) {
  return getTextLength(value) > 0;
}

function hasMoviePoster(movie = {}) {
  return hasText(movie?.poster_path);
}

function hasMovieBackdrop(movie = {}) {
  return hasText(movie?.backdrop_path);
}

function getMovieRuntime(movie = {}) {
  return toFiniteNumber(movie?.runtime);
}

function getTvRuntime(tv = {}) {
  const runtimes = Array.isArray(tv?.episode_run_time) ? tv.episode_run_time : [];
  const firstRuntime = runtimes.find((runtime) => toFiniteNumber(runtime) > 0);
  return toFiniteNumber(
    firstRuntime || tv?.last_episode_to_air?.runtime || tv?.next_episode_to_air?.runtime,
  );
}

function getMovieVoteCount(movie = {}) {
  return toFiniteNumber(movie?.vote_count);
}

function getMovieVoteAverage(movie = {}) {
  return toFiniteNumber(movie?.vote_average);
}

function getMoviePopularity(movie = {}) {
  return toFiniteNumber(movie?.popularity);
}

function getPersonPopularity(person = {}) {
  return toFiniteNumber(person?.popularity);
}

function resolvePersonMovieCreditCount(person = {}) {
  const movieCreditsCast = Array.isArray(person?.movie_credits?.cast)
    ? person.movie_credits.cast.length
    : 0;
  const movieCreditsCrew = Array.isArray(person?.movie_credits?.crew)
    ? person.movie_credits.crew.length
    : 0;
  const knownFor = Array.isArray(person?.known_for) ? person.known_for.length : 0;

  return movieCreditsCast + movieCreditsCrew + knownFor;
}

function isPrimaryCrewJob(person = {}) {
  return [
    'Director',
    'Writer',
    'Screenplay',
    'Producer',
    'Director of Photography',
    'Original Music Composer',
  ].includes(String(person?.job || '').trim());
}

function getMovieListThreshold(context = 'browse') {
  switch (context) {
    case 'credits':
      return 5;
    case 'search':
      return 6;
    case 'detail':
      return 9;
    case 'browse':
    default:
      return 7;
  }
}

function getTvListThreshold(context = 'browse') {
  switch (context) {
    case 'credits':
      return 4;
    case 'search':
      return 6;
    case 'detail':
      return 8;
    case 'browse':
    default:
      return 6;
  }
}

function getPersonListThreshold(context = 'credits') {
  switch (context) {
    case 'search':
      return 4;
    case 'detail':
      return 5;
    case 'credits':
    default:
      return 4;
  }
}

function failsMovieHardReject(movie = {}, context = 'browse') {
  const runtime = getMovieRuntime(movie);
  const voteCount = getMovieVoteCount(movie);
  const voteAverage = getMovieVoteAverage(movie);
  const popularity = getMoviePopularity(movie);
  const hasPoster = hasMoviePoster(movie);
  const hasBackdrop = hasMovieBackdrop(movie);

  if (voteCount < 1 || voteAverage < 4) {
    return true;
  }

  if (runtime > 0 && runtime < 40) {
    return true;
  }

  if (context !== 'credits' && !hasPoster && !hasBackdrop && voteCount < 150 && popularity < 20) {
    return true;
  }

  if (
    context === 'detail' &&
    runtime > 0 &&
    runtime < 40 &&
    !hasPoster &&
    voteCount < 150 &&
    popularity < 20
  ) {
    return true;
  }

  if (context === 'detail' && !hasPoster && voteCount < 75 && popularity < 12) {
    return true;
  }

  return false;
}

function failsTvHardReject(tv = {}, context = 'browse') {
  const voteCount = getMovieVoteCount(tv);
  const voteAverage = getMovieVoteAverage(tv);
  const popularity = getMoviePopularity(tv);
  const hasPoster = hasMoviePoster(tv);
  const hasBackdrop = hasMovieBackdrop(tv);

  if (voteCount < 1 || voteAverage < 3.5) {
    return true;
  }

  if (context !== 'credits' && !hasPoster && !hasBackdrop && voteCount < 80 && popularity < 12) {
    return true;
  }

  if (context === 'detail' && !hasPoster && voteCount < 40 && popularity < 8) {
    return true;
  }

  return false;
}

function failsPersonHardReject(person = {}, { context = 'credits', role = 'cast' } = {}) {
  const personName = String(person?.name || person?.original_name || '').trim();
  const popularity = getPersonPopularity(person);
  const movieCreditCount = resolvePersonMovieCreditCount(person);
  const hasProfile = hasText(person?.profile_path);
  const hasDepartment = hasText(person?.known_for_department);

  if (!personName || personName.startsWith('@')) {
    return true;
  }

  if (!hasProfile && popularity < 1 && movieCreditCount === 0 && !hasDepartment) {
    return true;
  }

  if (
    context === 'credits' &&
    role === 'crew' &&
    !hasProfile &&
    popularity < 2 &&
    movieCreditCount < 2
  ) {
    return true;
  }

  if (context === 'search' && popularity < 2 && movieCreditCount < 3) {
    return true;
  }

  if (context === 'search' && !hasDepartment && popularity < 5 && movieCreditCount < 6) {
    return true;
  }

  return false;
}

function getMovieQualityScore(movie = {}) {
  let score = 0;

  if (hasText(movie?.title || movie?.name || movie?.original_title || movie?.original_name)) {
    score += 1;
  } else {
    score -= 5;
  }

  if (hasMoviePoster(movie)) score += 3;
  if (hasMovieBackdrop(movie)) score += 2;

  if (!hasMoviePoster(movie) && !hasMovieBackdrop(movie)) {
    score -= 5;
  }

  const overviewLength = getTextLength(movie?.overview);

  if (overviewLength >= 120) {
    score += 2;
  } else if (overviewLength >= 40) {
    score += 1;
  }

  if (hasText(movie?.release_date || movie?.first_air_date)) {
    score += 1;
  }

  const voteCount = getMovieVoteCount(movie);

  if (voteCount >= 200) {
    score += 4;
  } else if (voteCount >= 50) {
    score += 3;
  } else if (voteCount >= 10) {
    score += 2;
  } else if (voteCount >= 3) {
    score += 1;
  }

  const popularity = getMoviePopularity(movie);

  if (popularity >= 30) {
    score += 4;
  } else if (popularity >= 12) {
    score += 3;
  } else if (popularity >= 4) {
    score += 2;
  } else if (popularity >= 1.5) {
    score += 1;
  }

  if (getMovieVoteAverage(movie) >= 6 && voteCount >= 5) {
    score += 1;
  }

  const runtime = getMovieRuntime(movie);

  if (runtime >= 70) {
    score += 3;
  } else if (runtime >= 40) {
    score += 2;
  } else if (runtime >= 25) {
    score += 1;
  } else if (runtime > 0) {
    score -= 4;
  }

  if (movie?.status === 'Released') {
    score += 1;
  }

  if (movie?.adult) score -= 4;
  if (movie?.video) score -= 2;

  return score;
}

function getTvQualityScore(tv = {}) {
  let score = 0;

  if (hasText(tv?.name || tv?.original_name || tv?.title || tv?.original_title)) {
    score += 1;
  } else {
    score -= 5;
  }

  if (hasMoviePoster(tv)) score += 3;
  if (hasMovieBackdrop(tv)) score += 2;

  if (!hasMoviePoster(tv) && !hasMovieBackdrop(tv)) {
    score -= 5;
  }

  const overviewLength = getTextLength(tv?.overview);

  if (overviewLength >= 120) {
    score += 2;
  } else if (overviewLength >= 40) {
    score += 1;
  }

  if (hasText(tv?.first_air_date)) {
    score += 1;
  }

  const voteCount = getMovieVoteCount(tv);

  if (voteCount >= 200) {
    score += 4;
  } else if (voteCount >= 50) {
    score += 3;
  } else if (voteCount >= 10) {
    score += 2;
  } else if (voteCount >= 3) {
    score += 1;
  }

  const popularity = getMoviePopularity(tv);

  if (popularity >= 30) {
    score += 4;
  } else if (popularity >= 12) {
    score += 3;
  } else if (popularity >= 4) {
    score += 2;
  } else if (popularity >= 1.5) {
    score += 1;
  }

  if (getMovieVoteAverage(tv) >= 6 && voteCount >= 5) {
    score += 1;
  }

  const runtime = getTvRuntime(tv);

  if (runtime >= 20) {
    score += 2;
  } else if (runtime > 0) {
    score += 1;
  }

  if (Number(tv?.number_of_seasons) > 0 || Number(tv?.number_of_episodes) > 0) {
    score += 1;
  }

  if (tv?.adult) score -= 4;

  return score;
}

function getPersonQualityScore(person = {}, role = 'cast') {
  let score = 0;

  if (hasText(person?.name || person?.original_name)) {
    score += 1;
  } else {
    score -= 5;
  }

  if (hasText(person?.profile_path)) {
    score += 3;
  }

  const biographyLength = getTextLength(person?.biography);

  if (biographyLength >= 80) {
    score += 2;
  } else if (biographyLength >= 24) {
    score += 1;
  }

  const popularity = getPersonPopularity(person);

  if (popularity >= 20) {
    score += 4;
  } else if (popularity >= 8) {
    score += 3;
  } else if (popularity >= 3) {
    score += 2;
  } else if (popularity >= 1) {
    score += 1;
  }

  const movieCreditCount = resolvePersonMovieCreditCount(person);

  if (movieCreditCount >= 30) {
    score += 3;
  } else if (movieCreditCount >= 10) {
    score += 2;
  } else if (movieCreditCount >= 3) {
    score += 1;
  }

  if (hasText(person?.known_for_department)) {
    score += 1;
  }

  if (role === 'crew' && isPrimaryCrewJob(person)) {
    score += 1;
  }

  if (person?.adult) score -= 4;

  return score;
}

export function isDisplayableMovie(movie, context = 'browse') {
  if (!movie || typeof movie !== 'object' || !movie?.id) {
    return false;
  }

  if (failsMovieHardReject(movie, context)) {
    return false;
  }

  return getMovieQualityScore(movie) >= getMovieListThreshold(context);
}

export function isDisplayableTv(tv, context = 'browse') {
  if (!tv || typeof tv !== 'object' || !tv?.id) {
    return false;
  }

  if (failsTvHardReject(tv, context)) {
    return false;
  }

  return getTvQualityScore(tv) >= getTvListThreshold(context);
}

export function isDisplayablePerson(person, { context = 'credits', role = 'cast' } = {}) {
  if (!person || typeof person !== 'object' || !person?.id) {
    return false;
  }

  if (failsPersonHardReject(person, { context, role })) {
    return false;
  }

  return getPersonQualityScore(person, role) >= getPersonListThreshold(context);
}

function isValidCreditPerson(person = {}) {
  return Boolean(
    person &&
    typeof person === 'object' &&
    person?.id &&
    hasText(person?.name || person?.original_name),
  );
}

export function sanitizeMovieResults(items = [], context = 'browse') {
  return (Array.isArray(items) ? items : []).filter((item) => isDisplayableMovie(item, context));
}

export function sanitizeTvResults(items = [], context = 'browse') {
  return (Array.isArray(items) ? items : []).filter((item) => isDisplayableTv(item, context));
}

export function sanitizePersonResults(items = [], { context = 'credits', role = 'cast' } = {}) {
  const entries = Array.isArray(items) ? items : [];

  if (context === 'credits') {
    return entries.filter(isValidCreditPerson);
  }

  return entries.filter((item) => isDisplayablePerson(item, { context, role }));
}

export function sanitizeMovieDetail(movie) {
  if (!movie || typeof movie !== 'object') {
    return movie;
  }

  return {
    ...movie,
    credits: movie?.credits
      ? {
          ...movie.credits,
          cast: sanitizePersonResults(movie.credits.cast, {
            context: 'credits',
            role: 'cast',
          }),
          crew: sanitizePersonResults(movie.credits.crew, {
            context: 'credits',
            role: 'crew',
          }),
        }
      : movie?.credits,
    recommendations: movie?.recommendations
      ? {
          ...movie.recommendations,
          results: sanitizeMovieResults(movie.recommendations.results, 'browse'),
        }
      : movie?.recommendations,
    similar: movie?.similar
      ? {
          ...movie.similar,
          results: sanitizeMovieResults(movie.similar.results, 'browse'),
        }
      : movie?.similar,
  };
}

export function sanitizeTvDetail(tv) {
  if (!tv || typeof tv !== 'object') {
    return tv;
  }

  const credits = tv.aggregate_credits || tv.credits;

  return {
    ...tv,
    aggregate_credits: credits
      ? {
          ...credits,
          cast: sanitizePersonResults(credits.cast, {
            context: 'credits',
            role: 'cast',
          }),
          crew: sanitizePersonResults(credits.crew, {
            context: 'credits',
            role: 'crew',
          }),
        }
      : tv?.aggregate_credits,
    credits: tv?.credits
      ? {
          ...tv.credits,
          cast: sanitizePersonResults(tv.credits.cast, {
            context: 'credits',
            role: 'cast',
          }),
          crew: sanitizePersonResults(tv.credits.crew, {
            context: 'credits',
            role: 'crew',
          }),
        }
      : tv?.credits,
    recommendations: tv?.recommendations
      ? {
          ...tv.recommendations,
          results: sanitizeTvResults(tv.recommendations.results, 'browse'),
        }
      : tv?.recommendations,
    similar: tv?.similar
      ? {
          ...tv.similar,
          results: sanitizeTvResults(tv.similar.results, 'browse'),
        }
      : tv?.similar,
  };
}

export function sanitizePersonDetail(person) {
  if (!person || typeof person !== 'object') {
    return person;
  }

  return {
    ...person,
    movie_credits: person?.movie_credits
      ? {
          ...person.movie_credits,
          cast: sanitizeMovieResults(person.movie_credits.cast, 'credits'),
          crew: sanitizeMovieResults(person.movie_credits.crew, 'credits'),
        }
      : person?.movie_credits,
    tv_credits: person?.tv_credits
      ? {
          ...person.tv_credits,
          cast: sanitizeTvResults(person.tv_credits.cast, 'credits'),
          crew: sanitizeTvResults(person.tv_credits.crew, 'credits'),
        }
      : person?.tv_credits,
  };
}

export const TMDB_FETCH_TIMEOUT_MS = 10000;

export const TMDB_HEADERS = Object.freeze({
  accept: 'application/json',
});

export const TMDB_REVALIDATE = Object.freeze({
  TRENDING: 600,
  IMDB_TOP_100_ENRICHMENT: 60 * 60 * 6,
  DISCOVER: 1800,
  GENRES: 60 * 60 * 24 * 7,
  DETAIL_BASE: 3600,
  DETAIL_SECONDARY: 60 * 60 * 6,
  SEARCH: 300,
});

export const SEARCH_PAGE_SIZE = 20;
export const SEARCH_SCAN_CONCURRENCY = 6;
export const SEARCH_MIN_MOVIE_VOTE_COUNT = 100;
export const SEARCH_MIN_MOVIE_VOTE_AVERAGE = 4;
export const SEARCH_MIN_MOVIE_RUNTIME = 40;

export const SEARCH_RUNTIME_CHECK_LIMITS = Object.freeze({
  full: 24,
  preview: 4,
});

export const SEARCH_SCAN_PAGE_LIMITS = Object.freeze({
  full: Object.freeze({
    long: 14,
    medium: 14,
    short: 16,
  }),
  preview: Object.freeze({
    long: 5,
    medium: 8,
    short: 10,
  }),
});

const SEARCH_TEXT_BASE_SCORES = Object.freeze({
  exact: 1200,
  includes: 650,
  prefix: 900,
});

const SEARCH_TOKEN_SIMILARITY = Object.freeze({
  fuzzyHigh: 0.9,
  fuzzyLow: 0.82,
  fuzzyMin: 0.74,
  minMatch: 0.55,
});

const SEARCH_IGNORED_TOKENS = Object.freeze(
  new Set([
    'a',
    'an',
    'and',
    'as',
    'at',
    'by',
    'for',
    'from',
    'in',
    'into',
    'of',
    'on',
    'or',
    'the',
    'to',
    'vs',
    'with',
  ]),
);

export function dedupeSearchItems(items = []) {
  const seen = new Set();

  return (Array.isArray(items) ? items : []).filter((item) => {
    const itemId = item?.id;
    const itemType = item?.media_type;
    const key = `${itemType || 'unknown'}:${itemId || 'unknown'}`;

    if (!itemId || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function withMediaType(items = [], mediaType) {
  return (items || []).map((item) => ({
    ...item,
    media_type: item?.media_type || mediaType,
  }));
}

export function normalizeSearchScope(scope = 'preview') {
  return scope === 'full' ? 'full' : 'preview';
}

export function normalizeSearchQuery(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getSearchQueryLength(query = '') {
  return normalizeSearchQuery(query).replace(/\s+/g, '').length;
}

export function resolveSearchScanPageLimit(query = '', type = 'movie', scope = 'preview') {
  const normalizedScope = normalizeSearchScope(scope);
  const queryLength = getSearchQueryLength(query);
  const limitBucket = queryLength <= 3 ? 'short' : queryLength <= 5 ? 'medium' : 'long';
  const limit = SEARCH_SCAN_PAGE_LIMITS[normalizedScope][limitBucket];

  if (isPersonMediaType(type)) {
    return Math.min(limit, normalizedScope === 'full' ? 6 : 3);
  }

  return limit;
}

export function resolveSearchRuntimeCheckLimit(scope = 'preview') {
  return SEARCH_RUNTIME_CHECK_LIMITS[normalizeSearchScope(scope)];
}

export function normalizeSearchComparableText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripSearchLeadingArticles(value = '') {
  return normalizeSearchComparableText(value).replace(/^(the|a|an)\s+/, '');
}

export function tokenizeSearchComparableText(value) {
  return normalizeSearchComparableText(value).split(' ').filter(Boolean);
}

function createSearchTokenBigrams(token = '') {
  const normalizedToken = String(token || '').trim();

  if (normalizedToken.length < 2) {
    return new Set();
  }

  const bigrams = new Set();

  for (let index = 0; index < normalizedToken.length - 1; index += 1) {
    bigrams.add(normalizedToken.slice(index, index + 2));
  }

  return bigrams;
}

function getSearchTokenDiceSimilarity(left = '', right = '') {
  const normalizedLeft = String(left || '').trim();
  const normalizedRight = String(right || '').trim();

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  const leftBigrams = createSearchTokenBigrams(normalizedLeft);
  const rightBigrams = createSearchTokenBigrams(normalizedRight);

  if (!leftBigrams.size || !rightBigrams.size) {
    return 0;
  }

  let overlapCount = 0;

  leftBigrams.forEach((value) => {
    if (rightBigrams.has(value)) {
      overlapCount += 1;
    }
  });

  return (2 * overlapCount) / (leftBigrams.size + rightBigrams.size);
}

function getSearchTokenSimilarity(queryToken = '', candidateToken = '') {
  const normalizedQueryToken = String(queryToken || '').trim();
  const normalizedCandidateToken = String(candidateToken || '').trim();

  if (!normalizedQueryToken || !normalizedCandidateToken) {
    return 0;
  }

  if (normalizedQueryToken === normalizedCandidateToken) {
    return 1;
  }

  if (normalizedCandidateToken.startsWith(normalizedQueryToken)) {
    return 0.9;
  }

  if (
    normalizedQueryToken.startsWith(normalizedCandidateToken) &&
    normalizedQueryToken.length - normalizedCandidateToken.length <= 2
  ) {
    return 0.82;
  }

  if (
    normalizedQueryToken.length >= 4 &&
    normalizedCandidateToken.length >= 4 &&
    (normalizedQueryToken.includes(normalizedCandidateToken) ||
      normalizedCandidateToken.includes(normalizedQueryToken))
  ) {
    return 0.72;
  }

  const diceSimilarity = getSearchTokenDiceSimilarity(
    normalizedQueryToken,
    normalizedCandidateToken,
  );

  if (diceSimilarity >= SEARCH_TOKEN_SIMILARITY.fuzzyHigh) {
    return 0.78;
  }

  if (diceSimilarity >= SEARCH_TOKEN_SIMILARITY.fuzzyLow) {
    return 0.58;
  }

  if (diceSimilarity >= SEARCH_TOKEN_SIMILARITY.fuzzyMin) {
    return 0.36;
  }

  return 0;
}

function resolveBestSearchTokenMatch(queryToken = '', candidateTokens = []) {
  let bestSimilarity = 0;
  let bestIndex = -1;

  candidateTokens.forEach((candidateToken, candidateIndex) => {
    const nextSimilarity = getSearchTokenSimilarity(queryToken, candidateToken);

    if (nextSimilarity > bestSimilarity) {
      bestSimilarity = nextSimilarity;
      bestIndex = candidateIndex;
    }
  });

  return {
    bestIndex,
    bestSimilarity,
  };
}

function getSearchTokenMatchMetrics(queryTokens = [], candidateTokens = []) {
  if (!queryTokens.length || !candidateTokens.length) {
    return {
      coverageRatio: 0,
      orderedRatio: 0,
      startAligned: false,
      weightedCoverageRatio: 0,
    };
  }

  let weightedMatches = 0;
  let matchedTokenCount = 0;
  let orderedMatchCount = 0;
  let lastMatchedIndex = -1;
  let startAligned = false;

  queryTokens.forEach((queryToken, queryTokenIndex) => {
    const { bestIndex, bestSimilarity } = resolveBestSearchTokenMatch(queryToken, candidateTokens);

    if (bestSimilarity < SEARCH_TOKEN_SIMILARITY.minMatch || bestIndex === -1) {
      return;
    }

    weightedMatches += bestSimilarity;
    matchedTokenCount += 1;

    if (queryTokenIndex === 0 && bestIndex === 0 && bestSimilarity >= 0.75) {
      startAligned = true;
    }

    if (bestIndex > lastMatchedIndex) {
      orderedMatchCount += 1;
      lastMatchedIndex = bestIndex;
    }
  });

  return {
    coverageRatio: matchedTokenCount / queryTokens.length,
    orderedRatio: orderedMatchCount / queryTokens.length,
    startAligned,
    weightedCoverageRatio: weightedMatches / queryTokens.length,
  };
}

export function getSearchTokenPrefixScore(queryTokens = [], candidateTokens = []) {
  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  return queryTokens.reduce((score, queryToken) => {
    const { bestSimilarity } = resolveBestSearchTokenMatch(queryToken, candidateTokens);

    if (bestSimilarity >= 0.99) {
      return score + 120;
    }

    if (bestSimilarity >= 0.9) {
      return score + 90;
    }

    if (bestSimilarity >= 0.75) {
      return score + 60;
    }

    if (bestSimilarity >= SEARCH_TOKEN_SIMILARITY.minMatch) {
      return score + 40;
    }

    return score;
  }, 0);
}

function resolveSearchQueryProfile(queryOrProfile = '') {
  if (
    queryOrProfile &&
    typeof queryOrProfile === 'object' &&
    typeof queryOrProfile.normalizedQuery === 'string'
  ) {
    return queryOrProfile;
  }

  return createSearchQueryProfile(queryOrProfile);
}

function resolveSearchQueryYear(queryTokens = []) {
  const currentYear = new Date().getFullYear() + 1;
  const yearToken = queryTokens.find((token) => /^(18|19|20)\d{2}$/.test(token));

  if (!yearToken) {
    return 0;
  }

  const parsedYear = Number.parseInt(yearToken, 10);
  return parsedYear >= 1888 && parsedYear <= currentYear ? parsedYear : 0;
}

export function createSearchQueryProfile(query = '') {
  const normalizedQuery = normalizeSearchComparableText(query);
  const queryTokens = tokenizeSearchComparableText(query);
  const relevantQueryTokens = queryTokens.filter((token) => !SEARCH_IGNORED_TOKENS.has(token));

  return {
    normalizedQuery,
    queryLength: getSearchQueryLength(query),
    queryTokens,
    queryYear: resolveSearchQueryYear(queryTokens),
    relevantQueryTokens: relevantQueryTokens.length ? relevantQueryTokens : queryTokens,
  };
}

export function getSearchTextMatch(text = '', queryOrProfile = '') {
  const queryProfile = resolveSearchQueryProfile(queryOrProfile);
  const { normalizedQuery, relevantQueryTokens } = queryProfile;

  if (!normalizedQuery) {
    return {
      coverage: 0,
      isExactMatch: false,
      isPrefixMatch: false,
      isStrongMatch: false,
      isVeryStrongMatch: false,
      normalizedText: '',
      orderedCoverage: 0,
      score: 0,
      weightedCoverage: 0,
    };
  }

  const normalizedText = normalizeSearchComparableText(text);
  const articleStrippedText = stripSearchLeadingArticles(text);
  const candidateTokens = tokenizeSearchComparableText(text);

  if (!normalizedText || !candidateTokens.length) {
    return {
      coverage: 0,
      isExactMatch: false,
      isPrefixMatch: false,
      isStrongMatch: false,
      isVeryStrongMatch: false,
      normalizedText,
      orderedCoverage: 0,
      score: 0,
      weightedCoverage: 0,
    };
  }

  const isExactMatch =
    normalizedText === normalizedQuery || articleStrippedText === normalizedQuery;
  const isPrefixMatch =
    !isExactMatch &&
    (normalizedText.startsWith(normalizedQuery) || articleStrippedText.startsWith(normalizedQuery));
  const isIncludesMatch =
    !isExactMatch && !isPrefixMatch && normalizedText.includes(normalizedQuery);
  const tokenPrefixScore = getSearchTokenPrefixScore(relevantQueryTokens, candidateTokens);
  const tokenMatchMetrics = getSearchTokenMatchMetrics(relevantQueryTokens, candidateTokens);
  const fullTextSimilarity = getSearchTokenDiceSimilarity(normalizedQuery, normalizedText);
  let score = 0;

  if (isExactMatch) {
    score += SEARCH_TEXT_BASE_SCORES.exact;
  } else if (isPrefixMatch) {
    score += SEARCH_TEXT_BASE_SCORES.prefix;
  } else if (isIncludesMatch) {
    score += SEARCH_TEXT_BASE_SCORES.includes;
  }

  score += tokenPrefixScore;
  score += Math.round(tokenMatchMetrics.weightedCoverageRatio * 480);
  score += Math.round(tokenMatchMetrics.coverageRatio * 260);
  score += Math.round(tokenMatchMetrics.orderedRatio * 160);

  if (tokenMatchMetrics.startAligned) {
    score += 80;
  }

  if (fullTextSimilarity >= 0.96) {
    score += 220;
  } else if (fullTextSimilarity >= 0.9) {
    score += 140;
  } else if (fullTextSimilarity >= 0.84) {
    score += 70;
  } else if (fullTextSimilarity >= 0.76) {
    score += 30;
  }

  if (!isExactMatch && tokenMatchMetrics.coverageRatio < 0.4 && fullTextSimilarity < 0.78) {
    score -= 120;
  }

  const finalScore = Math.max(0, Math.round(score));
  const isStrongMatch =
    finalScore >= 980 ||
    tokenMatchMetrics.weightedCoverageRatio >= 0.78 ||
    (tokenMatchMetrics.coverageRatio >= 0.75 && fullTextSimilarity >= 0.82);
  const isVeryStrongMatch =
    isExactMatch ||
    finalScore >= 1250 ||
    (tokenMatchMetrics.weightedCoverageRatio >= 0.9 && tokenMatchMetrics.orderedRatio >= 0.8);

  return {
    coverage: tokenMatchMetrics.coverageRatio,
    isExactMatch,
    isPrefixMatch,
    isStrongMatch,
    isVeryStrongMatch,
    normalizedText,
    orderedCoverage: tokenMatchMetrics.orderedRatio,
    score: finalScore,
    weightedCoverage: tokenMatchMetrics.weightedCoverageRatio,
  };
}

export function getBestSearchTextMatch(texts = [], queryOrProfile = '') {
  const queryProfile = resolveSearchQueryProfile(queryOrProfile);
  const safeTexts = Array.isArray(texts) ? texts : [];
  let bestMatch = null;

  safeTexts.forEach((text) => {
    const nextMatch = getSearchTextMatch(text, queryProfile);

    if (!bestMatch || nextMatch.score > bestMatch.score) {
      bestMatch = nextMatch;
    }
  });

  return (
    bestMatch || {
      coverage: 0,
      isExactMatch: false,
      isPrefixMatch: false,
      isStrongMatch: false,
      isVeryStrongMatch: false,
      normalizedText: '',
      orderedCoverage: 0,
      score: 0,
      weightedCoverage: 0,
    }
  );
}

export function getBestSearchTextScore(texts = [], queryOrProfile = '') {
  return getBestSearchTextMatch(texts, queryOrProfile).score;
}

export function sortSearchItemsByAuthority(
  items = [],
  resolveAuthority,
  resolveId = (item) => item?.id,
) {
  const safeItems = Array.isArray(items) ? [...items] : [];

  return safeItems.sort((left, right) => {
    const leftAuthority = resolveAuthority(left);
    const rightAuthority = resolveAuthority(right);

    if (rightAuthority !== leftAuthority) {
      return rightAuthority - leftAuthority;
    }

    return Number(resolveId(right) || 0) - Number(resolveId(left) || 0);
  });
}

export function resolveSearchPageSize(items = []) {
  return Array.isArray(items) && items.length > 0 ? items.length : SEARCH_PAGE_SIZE;
}

export function paginateSearchItems(items = [], page = 1, pageSize = SEARCH_PAGE_SIZE) {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : SEARCH_PAGE_SIZE;
  const totalResults = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / safePageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;

  return {
    page: currentPage,
    results: safeItems.slice(startIndex, startIndex + safePageSize),
    total_pages: totalPages,
    total_results: totalResults,
  };
}

const FALLBACK_QUERY_MAX_COUNT = 12;

const SEARCH_QUERY_ALIASES = Object.freeze({
  bttf: 'back to the future',
  ce3k: 'close encounters of the third kind',
  got: 'game of thrones',
  hp: 'harry potter',
  id4: 'independence day',
  lotr: 'lord of the rings',
  mst3k: 'mystery science theater 3000',
  pota: 'planet of the apes',
  potc: 'pirates of the caribbean',
  sw: 'star wars',
  tlou: 'the last of us',
});

export function resolveSearchAliasQuery(query) {
  const normalizedQuery = normalizeSearchQuery(query);

  return SEARCH_QUERY_ALIASES[normalizedQuery.toLowerCase()] || normalizedQuery;
}

function addFallbackQueryVariant(variants, value, sourceQuery = '') {
  const normalizedVariant = normalizeSearchQuery(value);
  const normalizedSource = normalizeSearchQuery(sourceQuery);

  if (!normalizedVariant || normalizedVariant === normalizedSource) {
    return;
  }

  variants.add(normalizedVariant);
}

function createSearchRewriteQueries(query) {
  const normalizedQuery = normalizeSearchQuery(query);
  const lowerCaseQuery = normalizedQuery.toLowerCase();
  const variants = new Set();
  const joinedUponQuery = lowerCaseQuery.replace(/\bup\s+on\b/g, 'upon');
  const punctuationNormalizedQuery = lowerCaseQuery
    .replace(/[._,:;!?()[\]{}]+/g, ' ')
    .replace(/[-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  addFallbackQueryVariant(variants, joinedUponQuery, normalizedQuery);
  addFallbackQueryVariant(variants, punctuationNormalizedQuery, normalizedQuery);

  [lowerCaseQuery, joinedUponQuery, punctuationNormalizedQuery].forEach((candidate) => {
    const expandedOnceUponTime = candidate.replace(/\bonce\s+upon\s+time\b/g, 'once upon a time');

    addFallbackQueryVariant(variants, expandedOnceUponTime, normalizedQuery);

    if (candidate.includes(' and ')) {
      addFallbackQueryVariant(variants, candidate.replace(/\band\b/g, '&'), normalizedQuery);
    }

    if (candidate.includes('&')) {
      addFallbackQueryVariant(variants, candidate.replace(/&/g, 'and'), normalizedQuery);
    }
  });

  const articleStrippedQuery = punctuationNormalizedQuery.replace(/^(the|a|an)\s+/i, '').trim();

  addFallbackQueryVariant(variants, articleStrippedQuery, normalizedQuery);

  const withoutYear = punctuationNormalizedQuery
    .replace(/\b(18|19|20)\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  addFallbackQueryVariant(variants, withoutYear, normalizedQuery);

  return [...variants];
}

export function createSearchFallbackQueries(query) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const rewrittenQueries = createSearchRewriteQueries(normalizedQuery);
  const tokens = normalizedQuery.split(' ').filter(Boolean);

  if (!tokens.length) {
    return rewrittenQueries.slice(0, FALLBACK_QUERY_MAX_COUNT);
  }

  const lastToken = tokens[tokens.length - 1];
  const variants = new Set(rewrittenQueries);

  if (lastToken.length >= 4) {
    for (let trimCount = 1; trimCount <= 3; trimCount += 1) {
      const nextToken = lastToken.slice(0, Math.max(0, lastToken.length - trimCount));

      if (nextToken.length < 3) {
        break;
      }

      addFallbackQueryVariant(
        variants,
        [...tokens.slice(0, -1), nextToken].join(' '),
        normalizedQuery,
      );
    }
  }

  if (tokens.length > 1 && tokens[tokens.length - 1].length >= 3) {
    addFallbackQueryVariant(variants, tokens.slice(0, -1).join(' '), normalizedQuery);
  }

  if (tokens.length > 2) {
    addFallbackQueryVariant(variants, tokens.slice(0, -2).join(' '), normalizedQuery);
  }

  return [...variants].slice(0, FALLBACK_QUERY_MAX_COUNT);
}

function getMovieSearchTexts(movie = {}) {
  return [movie?.title, movie?.original_title, movie?.name, movie?.original_name].filter(Boolean);
}

function getMovieAuthorityValue(movie = {}) {
  const popularity = Number(movie?.popularity) || 0;
  const voteCount = Number(movie?.vote_count) || 0;
  const voteAverage = Number(movie?.vote_average) || 0;
  const releaseYear =
    Number.parseInt(String(movie?.release_date || movie?.first_air_date || '').slice(0, 4), 10) ||
    0;
  const visualBonus = movie?.poster_path ? 20 : movie?.backdrop_path ? 8 : 0;

  return (
    popularity * 6 +
    Math.log10(voteCount + 1) * 160 +
    voteAverage * 18 +
    releaseYear / 8 +
    visualBonus
  );
}

function getMovieReleaseYearValue(movie = {}) {
  const year = Number.parseInt(
    String(movie?.release_date || movie?.first_air_date || '').slice(0, 4),
    10,
  );
  return Number.isFinite(year) ? year : 0;
}

function getMovieVoteCountValue(movie = {}) {
  return Number(movie?.vote_count) || 0;
}

function getMovieVoteAverageValue(movie = {}) {
  return Number(movie?.vote_average) || 0;
}

function getMovieRuntimeValue(movie = {}) {
  const runtime = Number(movie?.runtime);
  return Number.isFinite(runtime) && runtime > 0 ? runtime : null;
}

function isDisplayableTitleForDetail(movie = {}, mediaType = 'movie') {
  return mediaType === 'tv'
    ? isDisplayableTv(movie, 'detail')
    : isDisplayableMovie(movie, 'detail');
}

function getMovieQualitySignalValue(movie = {}) {
  const voteCount = getMovieVoteCountValue(movie);
  const voteAverage = getMovieVoteAverageValue(movie);
  const runtime = getMovieRuntimeValue(movie);
  const popularity = Number(movie?.popularity) || 0;
  const overviewLength = String(movie?.overview || '').trim().length;
  let qualitySignal = 0;

  if (runtime === null) {
    qualitySignal += 20;
  } else if (runtime >= 70) {
    qualitySignal += 120;
  } else if (runtime >= 40) {
    qualitySignal += 80;
  } else if (runtime >= 25) {
    qualitySignal += 25;
  } else {
    qualitySignal -= 160;
  }

  if (voteCount >= 1000) {
    qualitySignal += 160;
  } else if (voteCount >= 250) {
    qualitySignal += 120;
  } else if (voteCount >= 80) {
    qualitySignal += 90;
  } else if (voteCount >= 20) {
    qualitySignal += 50;
  } else if (voteCount >= 5) {
    qualitySignal += 20;
  } else {
    qualitySignal -= 60;
  }

  qualitySignal += Math.round(voteAverage * 18);
  qualitySignal += Math.min(160, Math.round(popularity * 4));

  if (overviewLength >= 140) {
    qualitySignal += 42;
  } else if (overviewLength >= 60) {
    qualitySignal += 24;
  }

  if (movie?.poster_path) {
    qualitySignal += 28;
  }

  if (movie?.backdrop_path) {
    qualitySignal += 16;
  }

  return qualitySignal;
}

function getMovieYearRelevanceValue(movie = {}, queryYear = 0) {
  if (!queryYear) {
    return 0;
  }

  const releaseYear = getMovieReleaseYearValue(movie);

  if (!releaseYear) {
    return -35;
  }

  const distance = Math.abs(releaseYear - queryYear);

  if (distance === 0) {
    return 220;
  }

  if (distance === 1) {
    return 120;
  }

  if (distance === 2) {
    return 70;
  }

  if (distance === 3) {
    return 30;
  }

  return Math.max(-160, -40 - distance * 14);
}

function resolveMovieSearchGateThresholds(
  movie = {},
  match = {},
  queryYear = 0,
  mediaType = 'movie',
) {
  const queryLength = Number(match.queryLength) || 0;
  const hasVisual = Boolean(movie?.poster_path || movie?.backdrop_path);
  let minVoteCount = SEARCH_MIN_MOVIE_VOTE_COUNT;
  let minVoteAverage = SEARCH_MIN_MOVIE_VOTE_AVERAGE;
  let minRuntime = SEARCH_MIN_MOVIE_RUNTIME;
  let minPopularity = 0.45;

  if (mediaType === 'tv') {
    minVoteCount = 5;
    minVoteAverage = 0;
    minRuntime = 0;
    minPopularity = 0.1;
  }

  if (match.isVeryStrongMatch) {
    minVoteCount = mediaType === 'tv' ? 1 : 8;
    minVoteAverage = 0;
    minRuntime = mediaType === 'tv' ? 0 : 25;
    minPopularity = mediaType === 'tv' ? 0 : 0.2;
  } else if (match.isStrongMatch) {
    minVoteCount = mediaType === 'tv' ? 3 : 24;
    minVoteAverage = mediaType === 'tv' ? 0 : 2.4;
    minRuntime = mediaType === 'tv' ? 0 : 30;
    minPopularity = mediaType === 'tv' ? 0.05 : 0.3;
  } else if ((match.coverage || 0) >= 0.62) {
    minVoteCount = mediaType === 'tv' ? 5 : 48;
    minVoteAverage = mediaType === 'tv' ? 0 : 3.2;
    minRuntime = mediaType === 'tv' ? 0 : 34;
    minPopularity = mediaType === 'tv' ? 0.1 : 0.45;
  }

  if (mediaType === 'tv') {
    if (queryLength <= 3) {
      minVoteCount = Math.max(minVoteCount, match.isVeryStrongMatch ? 12 : 30);
      minPopularity = Math.max(minPopularity, match.isVeryStrongMatch ? 1.2 : 2.5);
    } else if (queryLength <= 5) {
      minVoteCount = Math.max(minVoteCount, match.isVeryStrongMatch ? 6 : 12);
      minPopularity = Math.max(minPopularity, match.isVeryStrongMatch ? 0.6 : 1.1);
    }
  } else if (queryLength <= 3) {
    minVoteCount = Math.max(minVoteCount, match.isVeryStrongMatch ? 70 : 120);
    minVoteAverage = Math.max(minVoteAverage, 5.2);
    minPopularity = Math.max(minPopularity, match.isVeryStrongMatch ? 6 : 8);
  } else if (queryLength <= 4) {
    minVoteCount = Math.max(minVoteCount, match.isVeryStrongMatch ? 45 : 80);
    minVoteAverage = Math.max(minVoteAverage, 4.8);
    minPopularity = Math.max(minPopularity, match.isVeryStrongMatch ? 4 : 5.5);
  } else if (queryLength <= 5) {
    minVoteCount = Math.max(minVoteCount, match.isStrongMatch ? 28 : 50);
    minVoteAverage = Math.max(minVoteAverage, 4.2);
    minPopularity = Math.max(minPopularity, 2.2);
  }

  if (hasVisual) {
    minVoteCount = Math.max(5, Math.round(minVoteCount * 0.8));
  }

  if (queryYear && getMovieReleaseYearValue(movie) === queryYear) {
    minVoteCount = Math.max(5, Math.round(minVoteCount * 0.65));
    minVoteAverage = Math.max(0, minVoteAverage - 0.8);
  }

  return {
    minPopularity,
    minRuntime,
    minVoteAverage,
    minVoteCount,
  };
}

function passesMovieSearchQualityGate(movie = {}, options = {}) {
  const voteCount = getMovieVoteCountValue(movie);
  const voteAverage = getMovieVoteAverageValue(movie);
  const runtime = getMovieRuntimeValue(movie);
  const popularity = Number(movie?.popularity) || 0;
  const match = options.match || {};
  const queryYear = Number(options.queryYear) || 0;
  const mediaType = options.mediaType === 'tv' ? 'tv' : 'movie';
  const { minPopularity, minRuntime, minVoteAverage, minVoteCount } =
    resolveMovieSearchGateThresholds(movie, match, queryYear, mediaType);

  if (voteCount < minVoteCount) {
    return false;
  }

  if (voteAverage < minVoteAverage || (mediaType !== 'tv' && voteAverage <= 0)) {
    return false;
  }

  if (mediaType !== 'tv' && runtime !== null && runtime < minRuntime) {
    return false;
  }

  if (popularity < minPopularity) {
    return false;
  }

  return true;
}

function resolveMovieSearchTotalScore(movie = {}, match = {}, queryYear = 0) {
  const authorityScore = getMovieAuthorityValue(movie);
  const qualitySignalScore = getMovieQualitySignalValue(movie);
  const yearScore = getMovieYearRelevanceValue(movie, queryYear);
  const relevanceScore = Math.round(match.score * 3.25);
  const lexicalSignalScore = Math.round(
    (match.coverage || 0) * 240 + (match.orderedCoverage || 0) * 160,
  );

  return {
    authorityScore,
    qualitySignalScore,
    relevanceScore,
    totalScore:
      relevanceScore + authorityScore * 0.85 + qualitySignalScore + yearScore + lexicalSignalScore,
    yearScore,
  };
}

function buildMovieSearchEntry(
  movie = {},
  queryProfile = createSearchQueryProfile(''),
  mediaType = 'movie',
) {
  if (!movie?.id || movie?.adult) {
    return null;
  }

  const texts = getMovieSearchTexts(movie);
  const match = getBestSearchTextMatch(texts, queryProfile);
  const enrichedMatch = {
    ...match,
    queryLength: queryProfile.queryLength,
  };

  if (!texts.length || enrichedMatch.score <= 0) {
    return null;
  }

  if (!passesMovieLexicalGate(enrichedMatch, queryProfile)) {
    return null;
  }

  if (
    !passesMovieSearchQualityGate(movie, {
      match: enrichedMatch,
      mediaType,
      queryYear: queryProfile.queryYear,
    })
  ) {
    return null;
  }

  const scoring = resolveMovieSearchTotalScore(movie, enrichedMatch, queryProfile.queryYear);

  return {
    ...scoring,
    item: movie,
    match: enrichedMatch,
    queryYear: queryProfile.queryYear || 0,
  };
}

function buildRankedMovieSearchEntries(items = [], query = '', mediaType = 'movie') {
  const queryProfile = createSearchQueryProfile(query);
  const candidates = dedupeSearchItems(withMediaType(items, mediaType))
    .map((movie) => buildMovieSearchEntry(movie, queryProfile, mediaType))
    .filter(Boolean);

  return candidates.sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }

    if (right.match.score !== left.match.score) {
      return right.match.score - left.match.score;
    }

    if (right.yearScore !== left.yearScore) {
      return right.yearScore - left.yearScore;
    }

    return right.authorityScore - left.authorityScore;
  });
}

function passesMovieLexicalGate(match = {}, queryProfile = createSearchQueryProfile('')) {
  if (!queryProfile.normalizedQuery) {
    return true;
  }

  if (
    match.isExactMatch ||
    match.isPrefixMatch ||
    match.normalizedText.includes(queryProfile.normalizedQuery)
  ) {
    return true;
  }

  if (queryProfile.relevantQueryTokens.length <= 1) {
    return match.weightedCoverage >= 0.74;
  }

  return match.coverage >= 0.62 && match.weightedCoverage >= 0.58;
}

function passesMovieAuthorityFallbackLexicalGate(movie = {}, query = '') {
  const queryProfile = createSearchQueryProfile(query);

  const match = getBestSearchTextMatch(getMovieSearchTexts(movie), queryProfile);

  return passesMovieLexicalGate(match, queryProfile);
}

async function hydrateMovieSearchRuntimeCandidates(
  entries = [],
  { hydrateMovieRuntime, runtimeCheckLimit = SEARCH_RUNTIME_CHECK_LIMITS.preview } = {},
) {
  const runtimeCandidates = (Array.isArray(entries) ? entries : [])
    .slice(0, runtimeCheckLimit)
    .filter(({ item }) => getMovieRuntimeValue(item) === null);
  const hydrateRuntime =
    typeof hydrateMovieRuntime === 'function' ? hydrateMovieRuntime : async (item) => item;

  if (!runtimeCandidates.length) {
    return entries;
  }

  const hydratedEntries = await Promise.all(
    runtimeCandidates.map(async ({ item }) => {
      const hydratedItem = await hydrateRuntime(item);
      return [item.id, hydratedItem];
    }),
  );
  const hydratedById = new Map(hydratedEntries);

  return entries.map((entry) => {
    const hydratedItem = hydratedById.get(entry.item?.id);

    if (!hydratedItem) {
      return entry;
    }

    const nextScoring = resolveMovieSearchTotalScore(hydratedItem, entry.match, entry.queryYear);

    return {
      ...entry,
      ...nextScoring,
      item: hydratedItem,
    };
  });
}

export async function rankResolvedMovieSearchItems(items = [], query = '', options = {}) {
  const queryProfile = createSearchQueryProfile(query);
  const mediaType = options.mediaType === 'tv' ? 'tv' : 'movie';
  const rankedEntries = buildRankedMovieSearchEntries(items, query, mediaType);
  const hydratedEntries = await hydrateMovieSearchRuntimeCandidates(rankedEntries, options);

  return hydratedEntries
    .filter(
      ({ item, match }) =>
        passesMovieSearchQualityGate(item, {
          match,
          mediaType,
          queryYear: queryProfile.queryYear,
        }) && isDisplayableTitleForDetail(item, mediaType),
    )
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.match.score !== left.match.score) {
        return right.match.score - left.match.score;
      }

      if (right.yearScore !== left.yearScore) {
        return right.yearScore - left.yearScore;
      }

      return right.authorityScore - left.authorityScore;
    })
    .map(({ item }) => item);
}

export function buildMovieAuthorityFallbackItems(items = [], options = {}) {
  const mediaType = options.mediaType === 'tv' ? 'tv' : 'movie';
  const normalizedItems = dedupeSearchItems(withMediaType(items, mediaType));

  return sortSearchItemsByAuthority(
    normalizedItems.filter(
      (movie) =>
        passesMovieAuthorityFallbackLexicalGate(movie, options.query) &&
        passesMovieSearchQualityGate(movie, { mediaType }) &&
        isDisplayableTitleForDetail(movie, mediaType),
    ),
    getMovieAuthorityValue,
  );
}

function getPersonSearchTexts(person = {}) {
  return [person?.name, person?.original_name].filter(Boolean);
}

function getPersonAuthorityValue(person = {}) {
  const popularity = Number(person?.popularity) || 0;
  const knownForCount = Array.isArray(person?.known_for) ? person.known_for.length : 0;
  const profileBonus = person?.profile_path ? 18 : 0;

  const recognitionScore = Math.round(Math.log1p(popularity) * 480);

  return popularity * 8 + knownForCount * 12 + profileBonus + recognitionScore;
}

function getPersonPopularityValue(person = {}) {
  return Number(person?.popularity) || 0;
}

function getPersonKnownForCount(person = {}) {
  return Array.isArray(person?.known_for) ? person.known_for.length : 0;
}

function getPersonMetadataSignalValue(person = {}) {
  const popularity = getPersonPopularityValue(person);
  const knownForCount = getPersonKnownForCount(person);
  const hasProfile = Boolean(person?.profile_path);
  const hasDepartment = Boolean(String(person?.known_for_department || '').trim());
  const biographyLength = String(person?.biography || '').trim().length;
  let signal = 0;

  signal += Math.round(popularity * 24);
  signal += knownForCount * 28;

  if (hasProfile) {
    signal += 120;
  }

  if (hasDepartment) {
    signal += 46;
  }

  if (biographyLength >= 180) {
    signal += 40;
  } else if (biographyLength >= 80) {
    signal += 20;
  }

  return signal;
}

function passesPersonSearchQualityGate(person = {}, scope = 'preview', match = null) {
  const popularity = getPersonPopularityValue(person);
  const knownForCount = getPersonKnownForCount(person);
  const hasProfile = Boolean(person?.profile_path);
  const hasDepartment = Boolean(String(person?.known_for_department || '').trim());
  const normalizedScope = normalizeSearchScope(scope);
  const isStrongMatch = Boolean(match?.isStrongMatch || match?.isVeryStrongMatch);
  const isVeryStrongMatch = Boolean(match?.isVeryStrongMatch);
  const coverage = Number(match?.coverage) || 0;

  if (normalizedScope === 'preview') {
    if (isVeryStrongMatch && hasProfile) {
      return true;
    }

    if (isStrongMatch && hasProfile && (popularity >= 0.25 || knownForCount > 0 || hasDepartment)) {
      return true;
    }

    return (
      hasProfile && (popularity >= 0.55 || knownForCount > 0 || hasDepartment || coverage >= 0.78)
    );
  }

  if (hasProfile) {
    return popularity >= 0.5 || knownForCount > 0 || hasDepartment || isStrongMatch;
  }

  if (match?.isExactMatch && (knownForCount > 0 || hasDepartment)) {
    return true;
  }

  return popularity >= 1.5 && (knownForCount > 0 || hasDepartment || coverage >= 0.75);
}

function isPersonPreviewQualityMatch(
  person = {},
  match = {},
  queryProfile = createSearchQueryProfile(''),
) {
  const popularity = getPersonPopularityValue(person);
  const knownForCount = getPersonKnownForCount(person);
  const hasProfile = Boolean(person?.profile_path);
  const queryLength = queryProfile.queryLength;
  const coverage = Number(match.coverage) || 0;
  const orderedCoverage = Number(match.orderedCoverage) || 0;
  const isStrongMatch = Boolean(match.isStrongMatch);
  const isVeryStrongMatch = Boolean(match.isVeryStrongMatch);

  if (!hasProfile) {
    return false;
  }

  if (queryLength <= 3) {
    if (isVeryStrongMatch && coverage >= 0.75) {
      return true;
    }

    if (popularity >= 2 && coverage >= 0.55) {
      return true;
    }

    return isStrongMatch && popularity >= 1 && knownForCount > 0;
  }

  if (queryLength <= 5) {
    if (isVeryStrongMatch) {
      return true;
    }

    if (isStrongMatch && coverage >= 0.65) {
      return true;
    }

    return popularity >= 1.2 && knownForCount > 0 && orderedCoverage >= 0.55;
  }

  if (isStrongMatch && coverage >= 0.62) {
    return true;
  }

  if (popularity >= 1.1 && coverage >= 0.5) {
    return true;
  }

  return isVeryStrongMatch || (popularity >= 0.5 && coverage >= 0.68);
}

function passesPersonLexicalGate(match = {}, queryProfile = createSearchQueryProfile('')) {
  if (!queryProfile.normalizedQuery) {
    return true;
  }

  if (
    match.isExactMatch ||
    match.isPrefixMatch ||
    match.normalizedText.includes(queryProfile.normalizedQuery)
  ) {
    return true;
  }

  return queryProfile.relevantQueryTokens.length <= 1
    ? match.weightedCoverage >= 0.78
    : match.coverage >= 0.68 && match.weightedCoverage >= 0.64;
}

function passesPersonShortQueryAuthorityGate(
  person = {},
  match = {},
  queryProfile = createSearchQueryProfile(''),
) {
  if (queryProfile.queryLength > 4 || match.isExactMatch) {
    return true;
  }

  return getPersonPopularityValue(person) >= 1.5;
}

function resolvePersonSearchTotalScore(person = {}, match = {}) {
  const authorityScore = getPersonAuthorityValue(person);
  const metadataSignal = getPersonMetadataSignalValue(person);
  const relevanceScore = Math.round(match.score * 3.2);
  const lexicalSignalScore = Math.round(
    (match.coverage || 0) * 220 + (match.orderedCoverage || 0) * 140,
  );

  return {
    authorityScore,
    metadataSignal,
    relevanceScore,
    totalScore: relevanceScore + authorityScore + metadataSignal + lexicalSignalScore,
  };
}

function buildPersonSearchEntry(
  person = {},
  queryProfile = createSearchQueryProfile(''),
  options = {},
) {
  if (!person?.id) {
    return null;
  }

  const match = getBestSearchTextMatch(getPersonSearchTexts(person), queryProfile);

  if (match.score <= 0) {
    return null;
  }

  if (!passesPersonLexicalGate(match, queryProfile)) {
    return null;
  }

  if (!isDisplayablePerson(person, { context: 'search' })) {
    return null;
  }

  if (!passesPersonShortQueryAuthorityGate(person, match, queryProfile)) {
    return null;
  }

  if (!passesPersonSearchQualityGate(person, options.scope, match)) {
    return null;
  }

  if (
    normalizeSearchScope(options.scope) === 'preview' &&
    !isPersonPreviewQualityMatch(person, match, queryProfile)
  ) {
    return null;
  }

  return {
    ...resolvePersonSearchTotalScore(person, match),
    item: person,
    match,
  };
}

export function rankResolvedPersonSearchItems(items = [], query = '', options = {}) {
  const queryProfile = createSearchQueryProfile(query);
  const normalizedItems = dedupeSearchItems(withMediaType(items, 'person'));
  const candidates = normalizedItems
    .map((person) => buildPersonSearchEntry(person, queryProfile, options))
    .filter(Boolean);

  if (!candidates.length) {
    return [];
  }

  return candidates
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.match.score !== left.match.score) {
        return right.match.score - left.match.score;
      }

      return right.authorityScore - left.authorityScore;
    })
    .map(({ item }) => item);
}

export function buildPersonAuthorityFallbackItems(items = [], options = {}) {
  return rankResolvedPersonSearchItems(items, options.query, options);
}

const MINIMUM_SEARCH_QUERY_LENGTH = 1;

export function createSearchQueryPolicy(query = '') {
  const normalizedQuery = normalizeSearchQuery(query);
  const resolvedQuery = resolveSearchAliasQuery(normalizedQuery);
  const isAlias = resolvedQuery !== normalizedQuery;

  return {
    isEligible:
      Boolean(normalizedQuery) &&
      (isAlias || getSearchQueryLength(normalizedQuery) >= MINIMUM_SEARCH_QUERY_LENGTH),
    normalizedQuery,
    resolvedQuery,
  };
}



export async function normalizeSearchResults(
  items = [],
  query = '',
  requestedType = 'movie',
  options = {},
) {
  const normalizedType = isPersonMediaType(requestedType)
    ? 'person'
    : isTvMediaType(requestedType)
      ? 'tv'
      : 'movie';

  return normalizedType === 'person'
    ? rankResolvedPersonSearchItems(items, query, options)
    : await rankResolvedMovieSearchItems(items, query, {
        ...options,
        mediaType: normalizedType,
      });
}

export function buildAuthorityFallbackItems(items = [], type = 'movie', options = {}) {
  const normalizedType = isPersonMediaType(type) ? 'person' : isTvMediaType(type) ? 'tv' : 'movie';

  return normalizedType === 'person'
    ? buildPersonAuthorityFallbackItems(items, options)
    : buildMovieAuthorityFallbackItems(items, { ...options, mediaType: normalizedType });
}

