import { SEARCH_TYPES } from '@/features/search/constants';

import { normalizeResult } from './result';
import {
  countTokenOverlap,
  hasExactComparableMatch,
  normalizeComparableText,
  normalizeString,
  tokenizeComparableText,
} from './text';

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

function isExactUserMatch(item, normalizedQuery) {
  const displayName = String(item.displayName || '')
    .trim()
    .toLowerCase();
  const username = String(item.username || '')
    .trim()
    .toLowerCase();

  return displayName === normalizedQuery || username === normalizedQuery;
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

export function rankAllMediaResults(movieResults = [], personResults = [], query = '') {
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

export function inferSearchType({ normalizedQuery, userResults, mediaResults, communityResults = [] }) {
  const resolvedQuery = normalizeString(normalizedQuery).toLowerCase();
  const exactUserMatch = userResults.find((item) => isExactUserMatch(item, resolvedQuery));

  if (exactUserMatch) {
    return SEARCH_TYPES.USER;
  }

  if (communityResults.length > 0) {
    return SEARCH_TYPES.ALL;
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
