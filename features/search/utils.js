import { ACCOUNT_CLIENT } from '@/core/services/account/account-client';

import { SEARCH_LIMITS, SEARCH_TYPES } from '@/features/search/constants';

const SEARCH_MOVIE_FILTER_DEFAULTS = Object.freeze({
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

const SEARCH_TEXT_STOPWORDS = new Set(['a', 'an', 'and', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to']);
const SEARCH_CLIENT_CACHE_TTL_MS = 1000 * 60 * 5;
const SEARCH_CLIENT_CACHE_MAX_ENTRIES = 120;
const searchClientCache = new Map();
const searchClientInFlight = new Map();

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

function isExactUserMatch(item, normalizedQuery) {
  const displayName = String(item.displayName || '')
    .trim()
    .toLowerCase();
  const username = String(item.username || '')
    .trim()
    .toLowerCase();

  return displayName === normalizedQuery || username === normalizedQuery;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function createSearchCacheKey(prefix, parts = []) {
  return [prefix, ...parts.map((value) => normalizeString(value).toLowerCase())].join('::');
}

function readSearchCache(key) {
  const entry = searchClientCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    searchClientCache.delete(key);
    return null;
  }

  return entry.value;
}

function writeSearchCache(key, value) {
  if (searchClientCache.size >= SEARCH_CLIENT_CACHE_MAX_ENTRIES) {
    const oldestKey = searchClientCache.keys().next().value;

    if (oldestKey) {
      searchClientCache.delete(oldestKey);
    }
  }

  searchClientCache.set(key, {
    expiresAt: Date.now() + SEARCH_CLIENT_CACHE_TTL_MS,
    value,
  });
}

async function withClientSearchCache(key, load) {
  const cachedValue = readSearchCache(key);

  if (cachedValue !== null) {
    return cachedValue;
  }

  if (searchClientInFlight.has(key)) {
    return searchClientInFlight.get(key);
  }

  const requestPromise = Promise.resolve()
    .then(load)
    .then((value) => {
      writeSearchCache(key, value);
      return value;
    })
    .finally(() => {
      searchClientInFlight.delete(key);
    });

  searchClientInFlight.set(key, requestPromise);
  return requestPromise;
}

function normalizeComparableText(value) {
  return normalizeString(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeComparableText(value) {
  return normalizeComparableText(value)
    .split(' ')
    .filter((token) => token.length >= 2 && !SEARCH_TEXT_STOPWORDS.has(token));
}

function countTokenOverlap(source = [], target = []) {
  if (!source.length || !target.length) {
    return 0;
  }

  const targetSet = new Set(target);
  return source.filter((token) => targetSet.has(token)).length;
}

function normalizeToken(value) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
}

function hasExactComparableMatch(values = [], normalizedQuery = '') {
  if (!normalizedQuery) {
    return false;
  }

  return values.some((value) => normalizeComparableText(value) === normalizedQuery);
}

function isExactMovieTitleMatch(movie = {}, normalizedQuery = '') {
  return hasExactComparableMatch(
    [movie?.title, movie?.original_title, movie?.name, movie?.original_name],
    normalizedQuery
  );
}

function isExactPersonNameMatch(person = {}, normalizedQuery = '') {
  return hasExactComparableMatch([person?.name, person?.original_name], normalizedQuery);
}

function getBestMovieTitleMatchScore(movie = {}, normalizedQuery = '', queryTokens = []) {
  if (!normalizedQuery) {
    return 0;
  }

  const titles = [movie?.title, movie?.original_title, movie?.name, movie?.original_name].filter(Boolean);
  let bestScore = 0;

  titles.forEach((title) => {
    const normalizedTitle = normalizeComparableText(title);
    const titleTokens = tokenizeComparableText(title);
    const tokenOverlap = countTokenOverlap(queryTokens, titleTokens);
    let score = 0;

    if (normalizedTitle === normalizedQuery) {
      score += 14;
    } else if (normalizedTitle.startsWith(normalizedQuery)) {
      score += 10;
    } else if (normalizedTitle.includes(normalizedQuery)) {
      score += 6;
    }

    if (queryTokens.length > 0) {
      if (tokenOverlap === queryTokens.length) {
        score += 6;
      } else {
        score += tokenOverlap * 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
    }
  });

  return bestScore;
}

function getBestPersonNameMatchScore(person = {}, normalizedQuery = '', queryTokens = []) {
  if (!normalizedQuery) {
    return 0;
  }

  const names = [person?.name, person?.original_name].filter(Boolean);
  let bestScore = 0;

  names.forEach((name) => {
    const normalizedName = normalizeComparableText(name);
    const nameTokens = tokenizeComparableText(name);
    const tokenOverlap = countTokenOverlap(queryTokens, nameTokens);
    let score = 0;

    if (normalizedName === normalizedQuery) {
      score += 12;
    } else if (normalizedName.startsWith(normalizedQuery)) {
      score += 8;
    } else if (normalizedName.includes(normalizedQuery)) {
      score += 5;
    }

    if (queryTokens.length > 0) {
      if (tokenOverlap === queryTokens.length) {
        score += 6;
      } else {
        score += tokenOverlap * 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
    }
  });

  return bestScore;
}

function getMovieAssociationScore(movie = {}, normalizedQuery = '', queryTokens = []) {
  const textScore = getBestMovieTitleMatchScore(movie, normalizedQuery, queryTokens);
  const popularity = toFiniteNumber(movie?.popularity);
  const voteCount = toFiniteNumber(movie?.vote_count);
  let authorityScore = 0;

  if (popularity >= 80) {
    authorityScore += 8;
  } else if (popularity >= 40) {
    authorityScore += 6;
  } else if (popularity >= 20) {
    authorityScore += 4;
  } else if (popularity >= 10) {
    authorityScore += 2;
  }

  if (voteCount >= 20000) {
    authorityScore += 8;
  } else if (voteCount >= 10000) {
    authorityScore += 6;
  } else if (voteCount >= 5000) {
    authorityScore += 4;
  } else if (voteCount >= 1000) {
    authorityScore += 2;
  } else if (voteCount >= 250) {
    authorityScore += 1;
  }

  if (movie?.poster_path) {
    authorityScore += 1;
  }

  return {
    authorityScore,
    textScore,
    totalScore: textScore + authorityScore,
  };
}

function getPersonAssociationScore(person = {}, normalizedQuery = '', queryTokens = []) {
  const textScore = getBestPersonNameMatchScore(person, normalizedQuery, queryTokens);
  const popularity = toFiniteNumber(person?.popularity);
  const knownForItems = Array.isArray(person?.known_for) ? person.known_for : [];
  const knownForMovieCount = knownForItems.filter(
    (item) => item?.media_type === SEARCH_TYPES.MOVIE || item?.title
  ).length;
  let authorityScore = 0;

  if (popularity >= 40) {
    authorityScore += 8;
  } else if (popularity >= 20) {
    authorityScore += 6;
  } else if (popularity >= 10) {
    authorityScore += 4;
  } else if (popularity >= 5) {
    authorityScore += 2;
  }

  if (person?.profile_path) {
    authorityScore += 2;
  }

  if (['Directing', 'Acting', 'Writing', 'Production'].includes(person?.known_for_department)) {
    authorityScore += 3;
  }

  if (knownForMovieCount >= 4) {
    authorityScore += 4;
  } else if (knownForMovieCount >= 2) {
    authorityScore += 2;
  } else if (knownForMovieCount >= 1) {
    authorityScore += 1;
  }

  return {
    authorityScore,
    textScore,
    totalScore: textScore + authorityScore,
  };
}

function getTopAssociationScore(items = [], getScore) {
  return items.reduce(
    (bestScore, item) => {
      const nextScore = getScore(item);

      if (nextScore.totalScore > bestScore.totalScore) {
        return nextScore;
      }

      return bestScore;
    },
    {
      authorityScore: 0,
      textScore: 0,
      totalScore: 0,
    }
  );
}

function countStrongMoviePrefixMatches(movieResults = [], normalizedQuery = '', queryTokens = []) {
  return movieResults.filter((movie) => {
    const score = getMovieAssociationScore(movie, normalizedQuery, queryTokens);
    return score.textScore >= 14 && score.totalScore >= 18;
  }).length;
}

function resolvePreferredMediaType({ movieResults = [], personResults = [], query = '' }) {
  if (!movieResults.length && !personResults.length) {
    return SEARCH_TYPES.ALL;
  }

  if (!movieResults.length) {
    return SEARCH_TYPES.PERSON;
  }

  if (!personResults.length) {
    return SEARCH_TYPES.MOVIE;
  }

  const normalizedQuery = normalizeComparableText(query);
  const queryTokens = tokenizeComparableText(query);

  if (!normalizedQuery) {
    return SEARCH_TYPES.MOVIE;
  }

  const topMovieScore = getTopAssociationScore(movieResults, (movie) =>
    getMovieAssociationScore(movie, normalizedQuery, queryTokens)
  );
  const topPersonScore = getTopAssociationScore(personResults, (person) =>
    getPersonAssociationScore(person, normalizedQuery, queryTokens)
  );
  const strongMoviePrefixMatchCount = countStrongMoviePrefixMatches(movieResults, normalizedQuery, queryTokens);
  const hasExactMovieMatch = movieResults.some((movie) => isExactMovieTitleMatch(movie, normalizedQuery));

  if (hasExactMovieMatch) {
    return SEARCH_TYPES.MOVIE;
  }

  if (
    strongMoviePrefixMatchCount >= 2 ||
    (topMovieScore.textScore >= 14 && topMovieScore.totalScore >= topPersonScore.totalScore + 2)
  ) {
    return SEARCH_TYPES.MOVIE;
  }

  const hasExactPersonMatch = personResults.some((person) => isExactPersonNameMatch(person, normalizedQuery));

  if (hasExactPersonMatch) {
    return SEARCH_TYPES.PERSON;
  }

  if (topMovieScore.textScore === 0 && topPersonScore.textScore > 0) {
    return SEARCH_TYPES.PERSON;
  }

  if (topPersonScore.textScore === 0 && topMovieScore.textScore > 0) {
    return SEARCH_TYPES.MOVIE;
  }

  if (topPersonScore.totalScore > topMovieScore.totalScore + 4 && topPersonScore.textScore >= topMovieScore.textScore) {
    return SEARCH_TYPES.PERSON;
  }

  return SEARCH_TYPES.MOVIE;
}

function pickAssociatedPersonSeeds(personResults = [], query = '') {
  const normalizedQuery = normalizeComparableText(query);
  const queryTokens = tokenizeComparableText(query);

  return personResults
    .map((person, index) => ({
      index,
      person,
      score: getPersonAssociationScore(person, normalizedQuery, queryTokens),
    }))
    .filter(({ person, score }) => {
      const department = String(person?.known_for_department || '');

      if (!['Directing', 'Acting', 'Writing', 'Production'].includes(department)) {
        return false;
      }

      return score.textScore >= 5 && score.totalScore >= 14;
    })
    .sort((left, right) => {
      const totalScoreDiff = right.score.totalScore - left.score.totalScore;

      if (totalScoreDiff !== 0) {
        return totalScoreDiff;
      }

      return left.index - right.index;
    })
    .slice(0, 2)
    .map(({ person }) => person);
}

function extractAssociatedMoviesFromPeople(personResults = [], query = '') {
  const seeds = pickAssociatedPersonSeeds(personResults, query);
  const seenMovieIds = new Set();
  const associatedMovies = [];

  seeds.forEach((person, seedIndex) => {
    const knownForItems = Array.isArray(person?.known_for) ? person.known_for : [];

    knownForItems
      .filter((item) => (item?.media_type || SEARCH_TYPES.MOVIE) === SEARCH_TYPES.MOVIE)
      .sort(sortByPopularityDesc)
      .forEach((movie, movieIndex) => {
        const movieId = movie?.id;

        if (!movieId || seenMovieIds.has(movieId)) {
          return;
        }

        seenMovieIds.add(movieId);
        associatedMovies.push({
          ...normalizeResult(movie, SEARCH_TYPES.MOVIE),
          __associationPriority: 1000 - seedIndex * 100 - movieIndex * 10,
          __associatedPersonId: person.id,
        });
      });
  });

  return {
    associatedMovies,
    seeds,
  };
}

function mergeAssociatedAndDirectMovies(directMovies = [], associatedMovies = []) {
  const rankedMovies = new Map();

  associatedMovies.forEach((movie, index) => {
    rankedMovies.set(movie.id, {
      item: movie,
      score: toFiniteNumber(movie.__associationPriority) || 900 - index * 10,
    });
  });

  directMovies.forEach((movie, index) => {
    const existing = rankedMovies.get(movie.id);
    const directScore = 600 - index * 8;

    if (!existing || directScore > existing.score) {
      rankedMovies.set(movie.id, {
        item: existing ? { ...existing.item, ...movie } : movie,
        score: Math.max(directScore, existing?.score || 0),
      });
      return;
    }

    rankedMovies.set(movie.id, {
      item: { ...movie, ...existing.item },
      score: existing.score,
    });
  });

  return Array.from(rankedMovies.values())
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return sortByPopularityDesc(left.item, right.item);
    })
    .map(({ item }) => item);
}

function rankAllMediaResults(movieResults = [], personResults = [], query = '') {
  const { associatedMovies, seeds } = extractAssociatedMoviesFromPeople(personResults, query);
  const seedIds = new Set(seeds.map((person) => person.id));
  const rankedMovies = mergeAssociatedAndDirectMovies(movieResults, associatedMovies);
  const preferredMediaType = resolvePreferredMediaType({ movieResults, personResults, query });
  const primaryPeople = [];
  const secondaryPeople = [];

  personResults.forEach((person) => {
    if (seedIds.has(person.id)) {
      primaryPeople.push(person);
      return;
    }

    secondaryPeople.push(person);
  });

  if (preferredMediaType === SEARCH_TYPES.PERSON) {
    return [...primaryPeople, ...rankedMovies, ...secondaryPeople];
  }

  return [...rankedMovies, ...primaryPeople, ...secondaryPeople];
}

function resolveMovieReleaseYear(item = {}) {
  const rawValue = normalizeString(item?.release_date || item?.first_air_date);

  if (!rawValue) {
    return null;
  }

  const numericYear = Number.parseInt(rawValue.slice(0, 4), 10);
  return Number.isFinite(numericYear) ? numericYear : null;
}

function collectMovieGenreTokens(item = {}) {
  const tokens = new Set();
  const genreIds = Array.isArray(item?.genre_ids) ? item.genre_ids : [];
  const genres = Array.isArray(item?.genres) ? item.genres : [];

  genreIds.forEach((genreId) => {
    const matchedToken = Object.entries(SEARCH_GENRE_TOKEN_TO_ID).find(([, id]) => id === Number(genreId))?.[0];

    if (matchedToken) {
      tokens.add(matchedToken);
    }
  });

  genres.forEach((genre) => {
    if (genre && typeof genre === 'object') {
      const matchedToken = Object.entries(SEARCH_GENRE_TOKEN_TO_ID).find(([, id]) => id === Number(genre.id))?.[0];

      if (matchedToken) {
        tokens.add(matchedToken);
      }

      const nameToken = normalizeToken(genre.name);

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
  const decade = normalizeString(filters?.decade).toLowerCase();
  const genre = normalizeToken(filters?.genre);
  const year = normalizeString(filters?.year).toLowerCase();

  return {
    decade:
      decade === 'all' || /^\d{4}$/.test(decade)
        ? decade || SEARCH_MOVIE_FILTER_DEFAULTS.decade
        : SEARCH_MOVIE_FILTER_DEFAULTS.decade,
    genre: genre && (genre === 'all' || SEARCH_GENRE_TOKEN_TO_ID[genre]) ? genre : SEARCH_MOVIE_FILTER_DEFAULTS.genre,
    year:
      year === 'all' || /^\d{4}$/.test(year)
        ? year || SEARCH_MOVIE_FILTER_DEFAULTS.year
        : SEARCH_MOVIE_FILTER_DEFAULTS.year,
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
  const hasActiveFilters = hasActiveSearchMovieFilters(normalizedFilters);

  if (!hasActiveFilters) {
    return Array.isArray(items) ? items : [];
  }

  return (Array.isArray(items) ? items : []).filter((item) => {
    if (item?.media_type !== SEARCH_TYPES.MOVIE) {
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
      const genreTokens = collectMovieGenreTokens(item);

      if (!genreTokens.has(normalizedFilters.genre)) {
        return false;
      }
    }

    return true;
  });
}

export function inferSearchType({ normalizedQuery, userResults, mediaResults }) {
  const resolvedQuery = normalizeString(normalizedQuery).toLowerCase();
  const exactUserMatch = userResults.find((item) => isExactUserMatch(item, resolvedQuery));

  if (exactUserMatch) {
    return SEARCH_TYPES.USER;
  }

  if (!mediaResults.length) {
    return SEARCH_TYPES.ALL;
  }

  const movieResults = mediaResults.filter((item) => item?.media_type === SEARCH_TYPES.MOVIE);
  const personResults = mediaResults.filter((item) => item?.media_type === SEARCH_TYPES.PERSON);
  const preferredMediaType = resolvePreferredMediaType({
    movieResults,
    personResults,
    query: resolvedQuery,
  });

  if (preferredMediaType !== SEARCH_TYPES.ALL) {
    return preferredMediaType;
  }

  return mediaResults[0]?.media_type || SEARCH_TYPES.ALL;
}

export async function fetchUsers(query, limitCount = SEARCH_LIMITS.USER_RESULTS) {
  const cacheKey = createSearchCacheKey('users', [query, limitCount]);

  return withClientSearchCache(cacheKey, async () => {
    try {
      const users = await ACCOUNT_CLIENT.searchAccounts(query, {
        limitCount,
        retryCount: 0,
        timeoutMs: 5000,
      });

      return users.map((item) => normalizeResult(item, SEARCH_TYPES.USER));
    } catch {
      return [];
    }
  });
}

export async function fetchMediaPage(query, type, page = 1, options = {}) {
  if (type !== SEARCH_TYPES.MOVIE && type !== SEARCH_TYPES.PERSON) {
    return {
      page: 1,
      results: [],
      totalPages: 0,
      totalResults: 0,
    };
  }

  const scope = options.scope === 'full' ? 'full' : 'preview';
  const cacheKey = createSearchCacheKey('media-page', [query, type, page, scope]);

  return withClientSearchCache(cacheKey, async () => {
    try {
      const { TmdbService } = await import('@/core/services/tmdb/tmdb.service');
      const response = await TmdbService.searchContent(query, type, page, {
        scope,
      });

      if (response.status !== 200 || !response.data?.results) {
        return {
          page: 1,
          results: [],
          totalPages: 0,
          totalResults: 0,
        };
      }

      const data = response.data;

      return {
        page: Number(data?.page) || page,
        results: data.results.map((item) => normalizeResult(item)),
        totalPages: Number(data?.total_pages) || 0,
        totalResults: Number(data?.total_results) || 0,
      };
    } catch {
      return {
        page: 1,
        results: [],
        totalPages: 0,
        totalResults: 0,
      };
    }
  });
}

export async function fetchMedia(query, type, options = {}) {
  const payload = await fetchMediaPage(query, type, 1, options);
  return payload.results;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortByPopularityDesc(first, second) {
  const popularityDiff = toFiniteNumber(second?.popularity) - toFiniteNumber(first?.popularity);

  if (popularityDiff !== 0) {
    return popularityDiff;
  }

  const voteCountDiff = toFiniteNumber(second?.vote_count) - toFiniteNumber(first?.vote_count);

  if (voteCountDiff !== 0) {
    return voteCountDiff;
  }

  return toFiniteNumber(second?.vote_average) - toFiniteNumber(first?.vote_average);
}

export async function fetchAllMedia(query, page = 1, options = {}) {
  const [moviePayload, personPayload] = await Promise.all([
    fetchMediaPage(query, SEARCH_TYPES.MOVIE, page, options),
    fetchMediaPage(query, SEARCH_TYPES.PERSON, page, options),
  ]);

  return rankAllMediaResults(moviePayload.results, personPayload.results, query);
}

export function mergeAllResults(userResults, mediaResults, maxResults = SEARCH_LIMITS.MAX_RESULTS) {
  const merged = [...userResults, ...mediaResults];

  if (Number.isFinite(maxResults) && maxResults > 0) {
    return merged.slice(0, maxResults);
  }

  return merged;
}

export function limitMediaResults(results) {
  return results.slice(0, SEARCH_LIMITS.MEDIA_RESULTS);
}
