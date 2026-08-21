export const MAX_KNOWN_FOR = 10;
export const MAX_FILMOGRAPHY = 120;
export const MAX_BACKGROUND_CANDIDATES = 8;

export function calculateAge(birthday, deathday) {
  if (!birthday) return null;

  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
}

export function getPersonYear(value) {
  return typeof value === 'string' && value.length >= 4 ? value.slice(0, 4) : null;
}

export function getPersonLifeRange(person) {
  const birthYear = getPersonYear(person?.birthday);
  const deathYear = getPersonYear(person?.deathday);

  if (birthYear && deathYear) {
    return `${birthYear} - ${deathYear}`;
  }

  if (birthYear) {
    return `Born ${birthYear}`;
  }

  if (deathYear) {
    return `Died ${deathYear}`;
  }

  return null;
}

function isDirectingCredit(credit) {
  return credit?.job === 'Director' || credit?.department === 'Directing';
}

function getPreferredCredits(person, { cast = [], crew = [] } = {}) {
  const safeCast = Array.isArray(cast) ? cast : [];
  const safeCrew = Array.isArray(crew) ? crew : [];

  if (person?.known_for_department === 'Directing') {
    const directingCrew = safeCrew.filter(isDirectingCredit);

    if (directingCrew.length > 0) {
      return directingCrew;
    }
  }

  if (safeCast.length > 0) {
    return safeCast;
  }

  return safeCrew;
}

function uniqueByMediaId(credits) {
  const seen = new Set();

  return credits.filter((credit) => {
    const key = `${credit?.media_type || 'movie'}-${credit?.id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeMovieCredits(person) {
  return getPreferredCredits(person, {
    cast: person?.movie_credits?.cast || [],
    crew: person?.movie_credits?.crew || [],
  }).map((credit) => ({
    ...credit,
    media_type: 'movie',
  }));
}

function normalizeTvCredits(person) {
  return getPreferredCredits(person, {
    cast: person?.tv_credits?.cast || [],
    crew: person?.tv_credits?.crew || [],
  }).map((credit) => ({
    ...credit,
    media_type: 'tv',
  }));
}

function normalizeTitleCredits(person) {
  return [...normalizeMovieCredits(person), ...normalizeTvCredits(person)];
}

function comparePopularity(first, second) {
  return (
    (second.popularity || 0) - (first.popularity || 0) ||
    (second.vote_count || 0) - (first.vote_count || 0) ||
    (second.vote_average || 0) - (first.vote_average || 0)
  );
}

function compareReleaseDate(first, second) {
  return (second.release_date || second.first_air_date || '').localeCompare(
    first.release_date || first.first_air_date || '',
  );
}

function scoreBackgroundCandidate(credit) {
  if (!credit?.backdrop_path) return -1000;

  const voteCount = credit.vote_count || 0;
  const voteAverage = credit.vote_average || 0;
  const popularity = credit.popularity || 0;
  const isTv = credit.media_type === 'tv';
  const episodeCount = Number(credit.episode_count) || 0;
  const order = typeof credit.order === 'number' ? credit.order : 10;
  const char = String(credit.character || '').toLowerCase();

  let roleWeight = 1.0;
  if (isTv) {
    if (episodeCount >= 20) roleWeight = 2.0;
    else if (episodeCount >= 10) roleWeight = 1.6;
    else if (episodeCount >= 5) roleWeight = 1.2;
    else if (episodeCount <= 2) roleWeight = 0.25;
    else roleWeight = 0.7;
  } else {
    if (order === 0) roleWeight = 1.6;
    else if (order <= 2) roleWeight = 1.3;
    else if (order <= 5) roleWeight = 1.0;
    else if (order <= 10) roleWeight = 0.7;
    else roleWeight = 0.3;
  }

  if (
    char.includes('uncredited') ||
    char.includes('cameo') ||
    char.includes('self') ||
    char.includes('archive')
  ) {
    roleWeight *= 0.2;
  }

  const impactScore =
    Math.log10(Math.max(1, voteCount)) * 25 +
    Math.log10(Math.max(1, popularity)) * 10 +
    voteAverage * 5;

  return impactScore * roleWeight;
}

function compareBackgroundCandidate(first, second) {
  return (
    Number(Boolean(second?.backdrop_path)) - Number(Boolean(first?.backdrop_path)) ||
    scoreBackgroundCandidate(second) - scoreBackgroundCandidate(first) ||
    comparePopularity(first, second) ||
    String(first?.id || '').localeCompare(String(second?.id || ''))
  );
}

export function getKnownForCredits(person) {
  return uniqueByMediaId(
    normalizeTitleCredits(person)
      .filter((credit) => credit.poster_path && credit.vote_count > 50)
      .sort(comparePopularity)
      .slice(0, MAX_KNOWN_FOR),
  );
}

export function getFilmographyCredits(person, mediaType = 'movie') {
  const isDirector = person?.known_for_department === 'Directing';
  const rawCredits =
    mediaType === 'tv' ? normalizeTvCredits(person) : normalizeMovieCredits(person);

  return uniqueByMediaId(rawCredits)
    .filter((credit) => credit.poster_path)
    .sort((first, second) => {
      if (isDirector) {
        const releaseDateDiff = compareReleaseDate(first, second);

        if (releaseDateDiff !== 0) {
          return releaseDateDiff;
        }
      }

      return comparePopularity(first, second);
    })
    .map((credit) => ({
      ...credit,
      media_type: mediaType,
    }))
    .slice(0, MAX_FILMOGRAPHY);
}

export function getTimelineCredits(person) {
  return uniqueByMediaId(normalizeTitleCredits(person))
    .filter((credit) => Boolean(credit?.id))
    .sort((first, second) => compareReleaseDate(first, second) || comparePopularity(first, second));
}

export function getBackgroundMovieCandidates(person) {
  return uniqueByMediaId(normalizeTitleCredits(person))
    .filter((credit) => Boolean(credit?.id))
    .sort(compareBackgroundCandidate)
    .slice(0, MAX_BACKGROUND_CANDIDATES);
}
