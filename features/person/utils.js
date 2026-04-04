export const MAX_KNOWN_FOR = 10;
export const MAX_FILMOGRAPHY = 30;
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

function comparePopularity(first, second) {
  return (
    (second.popularity || 0) - (first.popularity || 0) ||
    (second.vote_count || 0) - (first.vote_count || 0) ||
    (second.vote_average || 0) - (first.vote_average || 0)
  );
}

function compareReleaseDate(first, second) {
  return (second.release_date || '').localeCompare(first.release_date || '');
}

function compareBackgroundCandidate(first, second) {
  return (
    Number(Boolean(second?.backdrop_path)) - Number(Boolean(first?.backdrop_path)) ||
    comparePopularity(first, second) ||
    compareReleaseDate(first, second) ||
    String(first?.id || '').localeCompare(String(second?.id || ''))
  );
}

export function getKnownForCredits(person) {
  return uniqueByMediaId(
    normalizeMovieCredits(person)
      .filter((credit) => credit.poster_path && credit.vote_count > 50)
      .sort(comparePopularity)
      .slice(0, MAX_KNOWN_FOR)
  );
}

export function getFilmographyCredits(person, mediaType = 'movie') {
  const isDirector = person?.known_for_department === 'Directing';

  return uniqueByMediaId(normalizeMovieCredits(person))
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
  return uniqueByMediaId(normalizeMovieCredits(person))
    .filter((credit) => Boolean(credit?.id))
    .sort((first, second) => compareReleaseDate(first, second) || comparePopularity(first, second));
}

export function getBackgroundMovieCandidates(person) {
  return uniqueByMediaId(normalizeMovieCredits(person))
    .filter((credit) => Boolean(credit?.id))
    .sort(compareBackgroundCandidate)
    .slice(0, MAX_BACKGROUND_CANDIDATES);
}
