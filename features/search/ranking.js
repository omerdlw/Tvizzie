import { toFiniteNumber } from '@/core/utils/number';

import { SEARCH_TYPES } from './constants';
import { normalizeResult } from './result';
import { countTokenOverlap, hasExactComparableMatch, normalizeComparableText, tokenizeComparableText } from './text';

function isExactMovieTitleMatch(movie = {}, normalizedQuery = '') {
  return hasExactComparableMatch(
    [movie?.title, movie?.original_title, movie?.name, movie?.original_name],
    normalizedQuery
  );
}

function stripLeadingArticles(value = '') {
  return normalizeComparableText(value).replace(/^(the|a|an)\s+/, '');
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
    const articleStrippedTitle = stripLeadingArticles(title);
    const titleTokens = tokenizeComparableText(title);
    const tokenOverlap = countTokenOverlap(queryTokens, titleTokens);
    let score = 0;

    if (normalizedTitle === normalizedQuery || articleStrippedTitle === normalizedQuery) {
      score += 14;
    } else if (normalizedTitle.startsWith(normalizedQuery) || articleStrippedTitle.startsWith(normalizedQuery)) {
      score += 10;
    } else if (normalizedTitle.includes(normalizedQuery)) {
      score += 6;
    }

    if (queryTokens.length > 0) {
      score += tokenOverlap === queryTokens.length ? 6 : tokenOverlap * 2;
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
      score += tokenOverlap === queryTokens.length ? 6 : tokenOverlap * 2;
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
      return nextScore.totalScore > bestScore.totalScore ? nextScore : bestScore;
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

function getTopMediaResult(items = [], normalizedQuery = '', queryTokens = []) {
  let topResult = null;

  items.forEach((item, index) => {
    const score = getMovieAssociationScore(item, normalizedQuery, queryTokens);

    if (
      !topResult ||
      score.totalScore > topResult.score.totalScore ||
      (score.totalScore === topResult.score.totalScore && index < topResult.index)
    ) {
      topResult = {
        index,
        item,
        score,
      };
    }
  });

  return topResult;
}

export function resolvePreferredMediaType({ movieResults = [], personResults = [], query = '', tvResults = [] }) {
  const titleResults = [...movieResults, ...tvResults];

  if (!titleResults.length && !personResults.length) {
    return SEARCH_TYPES.ALL;
  }

  if (!titleResults.length) {
    return SEARCH_TYPES.PERSON;
  }

  if (!personResults.length) {
    if (!movieResults.length && tvResults.length) {
      return SEARCH_TYPES.TV;
    }

    if (!tvResults.length && movieResults.length) {
      return SEARCH_TYPES.MOVIE;
    }
  }

  const normalizedQuery = normalizeComparableText(query);
  const queryTokens = tokenizeComparableText(query);

  if (!normalizedQuery) {
    return movieResults.length ? SEARCH_TYPES.MOVIE : SEARCH_TYPES.TV;
  }

  const topMovieResult = getTopMediaResult(movieResults, normalizedQuery, queryTokens);
  const topTvResult = getTopMediaResult(tvResults, normalizedQuery, queryTokens);
  const topTitleResult =
    !topTvResult || (topMovieResult && topMovieResult.score.totalScore >= topTvResult.score.totalScore)
      ? topMovieResult
      : topTvResult;
  const topPersonScore = getTopAssociationScore(personResults, (person) =>
    getPersonAssociationScore(person, normalizedQuery, queryTokens)
  );
  const strongMoviePrefixMatchCount = countStrongMoviePrefixMatches(movieResults, normalizedQuery, queryTokens);
  const strongTvPrefixMatchCount = countStrongMoviePrefixMatches(tvResults, normalizedQuery, queryTokens);
  const hasExactMovieMatch = movieResults.some((movie) => isExactMovieTitleMatch(movie, normalizedQuery));
  const hasExactTvMatch = tvResults.some((movie) => isExactMovieTitleMatch(movie, normalizedQuery));

  if (hasExactMovieMatch || hasExactTvMatch) {
    if (hasExactTvMatch && !hasExactMovieMatch) {
      return SEARCH_TYPES.TV;
    }

    if (hasExactMovieMatch && !hasExactTvMatch) {
      return SEARCH_TYPES.MOVIE;
    }

    return (topTvResult?.score.totalScore || 0) > (topMovieResult?.score.totalScore || 0)
      ? SEARCH_TYPES.TV
      : SEARCH_TYPES.MOVIE;
  }

  if (topTvResult && topMovieResult) {
    if (
      topTvResult.score.textScore >= 14 &&
      topTvResult.score.totalScore >= topMovieResult.score.totalScore + 2
    ) {
      return SEARCH_TYPES.TV;
    }

    if (
      topMovieResult.score.textScore >= 14 &&
      topMovieResult.score.totalScore >= topTvResult.score.totalScore + 2
    ) {
      return SEARCH_TYPES.MOVIE;
    }
  } else if (topTvResult && topTvResult.score.textScore >= 14) {
    return SEARCH_TYPES.TV;
  } else if (topMovieResult && topMovieResult.score.textScore >= 14) {
    return SEARCH_TYPES.MOVIE;
  }

  const topCombinedTitleScore = getTopAssociationScore(titleResults, (movie) =>
    getMovieAssociationScore(movie, normalizedQuery, queryTokens)
  );

  if (
    strongMoviePrefixMatchCount + strongTvPrefixMatchCount >= 2 ||
    (topCombinedTitleScore.textScore >= 14 && topCombinedTitleScore.totalScore >= topPersonScore.totalScore + 2)
  ) {
    return topTitleResult?.item?.media_type === SEARCH_TYPES.TV ? SEARCH_TYPES.TV : SEARCH_TYPES.MOVIE;
  }

  const hasExactPersonMatch = personResults.some((person) => isExactPersonNameMatch(person, normalizedQuery));

  if (hasExactPersonMatch) {
    return SEARCH_TYPES.PERSON;
  }

  if (topCombinedTitleScore.textScore === 0 && topPersonScore.textScore > 0) {
    return SEARCH_TYPES.PERSON;
  }

  if (topPersonScore.textScore === 0 && topCombinedTitleScore.textScore > 0) {
    return topTitleResult?.item?.media_type === SEARCH_TYPES.TV ? SEARCH_TYPES.TV : SEARCH_TYPES.MOVIE;
  }

  if (
    topPersonScore.totalScore > topCombinedTitleScore.totalScore + 4 &&
    topPersonScore.textScore >= topCombinedTitleScore.textScore
  ) {
    return SEARCH_TYPES.PERSON;
  }

  return topTitleResult?.item?.media_type === SEARCH_TYPES.TV ? SEARCH_TYPES.TV : SEARCH_TYPES.MOVIE;
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
      return totalScoreDiff !== 0 ? totalScoreDiff : left.index - right.index;
    })
    .slice(0, 2)
    .map(({ person }) => person);
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

function getMediaResultKey(item = {}) {
  return `${item?.media_type || SEARCH_TYPES.MOVIE}:${item?.id || 'unknown'}`;
}

function mergeAssociatedAndDirectMovies(directMovies = [], associatedMovies = []) {
  const rankedMovies = new Map();

  associatedMovies.forEach((movie, index) => {
    rankedMovies.set(getMediaResultKey(movie), {
      item: movie,
      score: toFiniteNumber(movie.__associationPriority) || 900 - index * 10,
    });
  });

  directMovies.forEach((movie, index) => {
    const existing = rankedMovies.get(getMediaResultKey(movie));
    const directScore = toFiniteNumber(movie.__searchRankScore) || 600 - index * 8;

    if (!existing || directScore > existing.score) {
      rankedMovies.set(getMediaResultKey(movie), {
        item: existing ? { ...existing.item, ...movie } : movie,
        score: Math.max(directScore, existing?.score || 0),
      });
      return;
    }

    rankedMovies.set(getMediaResultKey(movie), {
      item: { ...movie, ...existing.item },
      score: existing.score,
    });
  });

  return Array.from(rankedMovies.values())
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;
      return scoreDiff !== 0 ? scoreDiff : sortByPopularityDesc(left.item, right.item);
    })
    .map(({ item }) => item);
}

export function rankAllMediaResults(movieResults = [], personResults = [], query = '') {
  const { associatedMovies, seeds } = extractAssociatedMoviesFromPeople(personResults, query);
  const seedIds = new Set(seeds.map((person) => person.id));
  const normalizedQuery = normalizeComparableText(query);
  const queryTokens = tokenizeComparableText(query);
  const directTitleResults = movieResults.map((movie, index) => {
    const score = getMovieAssociationScore(movie, normalizedQuery, queryTokens);

    return {
      ...movie,
      __searchRankScore:
        score.totalScore * 40 + score.textScore * 18 + score.authorityScore * 6 + Math.max(0, 200 - index),
    };
  });
  const splitMovieResults = movieResults.filter((item) => item?.media_type !== SEARCH_TYPES.TV);
  const splitTvResults = movieResults.filter((item) => item?.media_type === SEARCH_TYPES.TV);
  const preferredMediaType = resolvePreferredMediaType({
    movieResults: splitMovieResults,
    personResults,
    query,
    tvResults: splitTvResults,
  });
  const rankedMovies = mergeAssociatedAndDirectMovies(
    directTitleResults.map((item) =>
      item.media_type === preferredMediaType
        ? {
            ...item,
            __searchRankScore: toFiniteNumber(item.__searchRankScore) + 260,
          }
        : item
    ),
    associatedMovies
  );
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
