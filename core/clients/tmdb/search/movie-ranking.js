import { isDisplayableMovie, isDisplayableTv } from '../sanitize';
import {
  SEARCH_MIN_MOVIE_RUNTIME,
  SEARCH_MIN_MOVIE_VOTE_AVERAGE,
  SEARCH_MIN_MOVIE_VOTE_COUNT,
  SEARCH_RUNTIME_CHECK_LIMITS,
} from '../config';
import {
  createSearchQueryProfile,
  dedupeSearchItems,
  getBestSearchTextMatch,
  sortSearchItemsByAuthority,
  withMediaType,
} from './shared';

function getMovieSearchTexts(movie = {}) {
  return [movie?.title, movie?.original_title, movie?.name, movie?.original_name].filter(Boolean);
}

function getMovieAuthorityValue(movie = {}) {
  const popularity = Number(movie?.popularity) || 0;
  const voteCount = Number(movie?.vote_count) || 0;
  const voteAverage = Number(movie?.vote_average) || 0;
  const releaseYear = Number.parseInt(String(movie?.release_date || movie?.first_air_date || '').slice(0, 4), 10) || 0;
  const visualBonus = movie?.poster_path ? 20 : movie?.backdrop_path ? 8 : 0;

  return popularity * 6 + Math.log10(voteCount + 1) * 160 + voteAverage * 18 + releaseYear / 8 + visualBonus;
}

function getMovieReleaseYearValue(movie = {}) {
  const year = Number.parseInt(String(movie?.release_date || movie?.first_air_date || '').slice(0, 4), 10);
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
  return mediaType === 'tv' ? isDisplayableTv(movie, 'detail') : isDisplayableMovie(movie, 'detail');
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

function resolveMovieSearchGateThresholds(movie = {}, match = {}, queryYear = 0) {
  const queryLength = Number(match.queryLength) || 0;
  const hasVisual = Boolean(movie?.poster_path || movie?.backdrop_path);
  let minVoteCount = SEARCH_MIN_MOVIE_VOTE_COUNT;
  let minVoteAverage = SEARCH_MIN_MOVIE_VOTE_AVERAGE;
  let minRuntime = SEARCH_MIN_MOVIE_RUNTIME;
  let minPopularity = 0.45;

  if (match.isVeryStrongMatch) {
    minVoteCount = 8;
    minVoteAverage = 0;
    minRuntime = 25;
    minPopularity = 0.2;
  } else if (match.isStrongMatch) {
    minVoteCount = 24;
    minVoteAverage = 2.4;
    minRuntime = 30;
    minPopularity = 0.3;
  } else if ((match.coverage || 0) >= 0.62) {
    minVoteCount = 48;
    minVoteAverage = 3.2;
    minRuntime = 34;
    minPopularity = 0.45;
  }

  if (queryLength <= 3) {
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
  const { minPopularity, minRuntime, minVoteAverage, minVoteCount } = resolveMovieSearchGateThresholds(
    movie,
    match,
    queryYear
  );

  if (voteCount < minVoteCount) {
    return false;
  }

  if (voteAverage < minVoteAverage || voteAverage <= 0) {
    return false;
  }

  if (runtime !== null && runtime < minRuntime) {
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
  const lexicalSignalScore = Math.round((match.coverage || 0) * 240 + (match.orderedCoverage || 0) * 160);

  return {
    authorityScore,
    qualitySignalScore,
    relevanceScore,
    totalScore: relevanceScore + authorityScore * 0.85 + qualitySignalScore + yearScore + lexicalSignalScore,
    yearScore,
  };
}

function buildMovieSearchEntry(movie = {}, queryProfile = createSearchQueryProfile('')) {
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

  if (!passesMovieSearchQualityGate(movie, { match: enrichedMatch, queryYear: queryProfile.queryYear })) {
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
    .map((movie) => buildMovieSearchEntry(movie, queryProfile))
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

async function hydrateMovieSearchRuntimeCandidates(
  entries = [],
  { hydrateMovieRuntime, runtimeCheckLimit = SEARCH_RUNTIME_CHECK_LIMITS.preview } = {}
) {
  const runtimeCandidates = (Array.isArray(entries) ? entries : [])
    .slice(0, runtimeCheckLimit)
    .filter(({ item }) => getMovieRuntimeValue(item) === null);
  const hydrateRuntime = typeof hydrateMovieRuntime === 'function' ? hydrateMovieRuntime : async (item) => item;

  if (!runtimeCandidates.length) {
    return entries;
  }

  const hydratedEntries = await Promise.all(
    runtimeCandidates.map(async ({ item }) => {
      const hydratedItem = await hydrateRuntime(item);
      return [item.id, hydratedItem];
    })
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
        passesMovieSearchQualityGate(item, { match, queryYear: queryProfile.queryYear }) &&
        isDisplayableTitleForDetail(item, mediaType)
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
      (movie) => passesMovieSearchQualityGate(movie, {}) && isDisplayableTitleForDetail(movie, mediaType)
    ),
    getMovieAuthorityValue
  );
}
