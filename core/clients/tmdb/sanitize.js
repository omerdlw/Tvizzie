import { toFiniteNumber } from '@/core/utils/number';

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
  return toFiniteNumber(firstRuntime || tv?.last_episode_to_air?.runtime || tv?.next_episode_to_air?.runtime);
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

  if (context === 'detail' && runtime > 0 && runtime < 40 && !hasPoster && voteCount < 150 && popularity < 20) {
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

function isDisplayablePerson(person, { context = 'credits', role = 'cast' } = {}) {
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

export function sanitizeTvResults(items = [], context = 'browse') {
  return (Array.isArray(items) ? items : []).filter((item) => isDisplayableTv(item, context));
}

export function sanitizePersonResults(items = [], { context = 'credits', role = 'cast' } = {}) {
  return (Array.isArray(items) ? items : []).filter((item) => isDisplayablePerson(item, { context, role }));
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
