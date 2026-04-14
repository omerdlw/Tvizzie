function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTextLength(value) {
  return String(value || '').trim().length;
}

function hasText(value) {
  return getTextLength(value) > 0;
}

const COMPARABLE_TEXT_STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'part',
  'the',
  'to',
  'vol',
  'volume',
]);

function hasMoviePoster(movie = {}) {
  return hasText(movie?.poster_path);
}

function hasMovieBackdrop(movie = {}) {
  return hasText(movie?.backdrop_path);
}

function normalizeComparableText(value) {
  return String(value || '')
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
    .filter((token) => token.length >= 2 && !COMPARABLE_TEXT_STOPWORDS.has(token));
}

function countTokenOverlap(sourceTokens = [], targetTokens = []) {
  if (!sourceTokens.length || !targetTokens.length) {
    return 0;
  }

  const targetSet = new Set(targetTokens);
  return sourceTokens.filter((token) => targetSet.has(token)).length;
}

function getMovieSearchTexts(movie = {}) {
  return [movie?.title, movie?.original_title, movie?.name, movie?.original_name].filter(Boolean);
}

function getPersonSearchTexts(person = {}) {
  return [person?.name, person?.original_name].filter(Boolean);
}

function getBestTextMatchScore(texts = [], normalizedQuery = '', queryTokens = []) {
  if (!normalizedQuery) {
    return 0;
  }

  let bestScore = 0;

  texts.forEach((text) => {
    const normalizedText = normalizeComparableText(text);
    const textTokens = tokenizeComparableText(text);
    const tokenOverlap = countTokenOverlap(queryTokens, textTokens);
    let score = 0;

    if (normalizedText === normalizedQuery) {
      score += 12;
    } else if (normalizedText.startsWith(normalizedQuery)) {
      score += 8;
    } else if (normalizedText.includes(normalizedQuery)) {
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

function getMovieRuntime(movie = {}) {
  return toFiniteNumber(movie?.runtime);
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
  const movieCreditsCast = Array.isArray(person?.movie_credits?.cast) ? person.movie_credits.cast.length : 0;
  const movieCreditsCrew = Array.isArray(person?.movie_credits?.crew) ? person.movie_credits.crew.length : 0;
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

  if (context === 'detail' && runtime > 0 && runtime < 40 && !hasPoster && voteCount < 150 && popularity < 20) {
    return true;
  }

  if (context === 'detail' && !hasPoster && voteCount < 75 && popularity < 12) {
    return true;
  }

  return false;
}

function failsPersonHardReject(person = {}, { context = 'credits', role = 'cast' } = {}) {
  const popularity = getPersonPopularity(person);
  const movieCreditCount = resolvePersonMovieCreditCount(person);
  const hasProfile = hasText(person?.profile_path);
  const hasDepartment = hasText(person?.known_for_department);

  if (!hasProfile && popularity < 1 && movieCreditCount === 0 && !hasDepartment) {
    return true;
  }

  if (context === 'credits' && role === 'crew' && !hasProfile && popularity < 2 && movieCreditCount < 2) {
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

function getMovieSearchAuthorityScore(movie = {}) {
  let score = 0;

  if (hasMoviePoster(movie)) score += 2;
  if (hasMovieBackdrop(movie)) score += 1;

  const popularity = getMoviePopularity(movie);

  if (popularity >= 40) {
    score += 6;
  } else if (popularity >= 20) {
    score += 5;
  } else if (popularity >= 8) {
    score += 4;
  } else if (popularity >= 3) {
    score += 3;
  } else if (popularity >= 1) {
    score += 1;
  }

  const voteCount = getMovieVoteCount(movie);

  if (voteCount >= 5000) {
    score += 8;
  } else if (voteCount >= 1000) {
    score += 6;
  } else if (voteCount >= 200) {
    score += 4;
  } else if (voteCount >= 50) {
    score += 3;
  } else if (voteCount >= 10) {
    score += 1;
  }

  if (hasText(movie?.release_date || movie?.first_air_date)) {
    score += 1;
  }

  return score;
}

function getPersonSearchAuthorityScore(person = {}) {
  let score = 0;

  if (hasText(person?.profile_path)) {
    score += 3;
  }

  const popularity = getPersonPopularity(person);

  if (popularity >= 40) {
    score += 10;
  } else if (popularity >= 20) {
    score += 8;
  } else if (popularity >= 8) {
    score += 6;
  } else if (popularity >= 3) {
    score += 4;
  } else if (popularity >= 1.5) {
    score += 2;
  }

  const movieCreditCount = resolvePersonMovieCreditCount(person);

  if (movieCreditCount >= 40) {
    score += 8;
  } else if (movieCreditCount >= 15) {
    score += 6;
  } else if (movieCreditCount >= 5) {
    score += 4;
  } else if (movieCreditCount >= 2) {
    score += 2;
  }

  if (hasText(person?.known_for_department)) {
    score += 2;
  }

  return score;
}

function getSearchScore(item, query, type = 'movie') {
  const normalizedQuery = normalizeComparableText(query);
  const queryTokens = tokenizeComparableText(query);
  const texts = type === 'person' ? getPersonSearchTexts(item) : getMovieSearchTexts(item);
  const textMatchScore = getBestTextMatchScore(texts, normalizedQuery, queryTokens);
  const authorityScore = type === 'person' ? getPersonSearchAuthorityScore(item) : getMovieSearchAuthorityScore(item);

  return {
    authorityScore,
    textMatchScore,
    totalScore: textMatchScore + authorityScore,
  };
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

export function isDisplayablePerson(person, { context = 'credits', role = 'cast' } = {}) {
  if (!person || typeof person !== 'object' || !person?.id) {
    return false;
  }

  if (failsPersonHardReject(person, { context, role })) {
    return false;
  }

  return getPersonQualityScore(person, role) >= getPersonListThreshold(context);
}

export function sanitizeMovieResults(items = [], context = 'browse') {
  return (Array.isArray(items) ? items : []).filter((item) => isDisplayableMovie(item, context));
}

export function sanitizePersonResults(items = [], { context = 'credits', role = 'cast' } = {}) {
  return (Array.isArray(items) ? items : []).filter((item) => isDisplayablePerson(item, { context, role }));
}

export function rankSearchResults(items = [], query, type = 'movie') {
  const safeItems = Array.isArray(items) ? items : [];

  return safeItems
    .map((item) => ({
      item,
      score: getSearchScore(item, query, type),
    }))
    .filter(({ score }) => {
      if (type === 'person') {
        return score.textMatchScore >= 6 && score.totalScore >= 18;
      }

      return score.textMatchScore >= 4 && score.totalScore >= 10;
    })
    .sort((left, right) => {
      const totalScoreDiff = right.score.totalScore - left.score.totalScore;

      if (totalScoreDiff !== 0) {
        return totalScoreDiff;
      }

      const textMatchDiff = right.score.textMatchScore - left.score.textMatchScore;

      if (textMatchDiff !== 0) {
        return textMatchDiff;
      }

      return right.score.authorityScore - left.score.authorityScore;
    })
    .map(({ item }) => item);
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
          cast: sanitizePersonResults(movie.credits.cast, { context: 'credits', role: 'cast' }),
          crew: sanitizePersonResults(movie.credits.crew, { context: 'credits', role: 'crew' }),
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
  };
}
