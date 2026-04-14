import { TMDB_IMG } from '@/core/constants';
import { formatRuntime, uniqueBy } from '@/core/utils';

const MAX_WRITERS = 10;
const MAX_RECOMMENDATIONS = 14;
const MAX_SIMILAR = 14;
const RELATED_TITLE_STOPWORDS = new Set(['a', 'an', 'and', 'chapter', 'movie', 'of', 'part', 'the', 'vol', 'volume']);

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
    .filter((token) => token.length >= 2 && !RELATED_TITLE_STOPWORDS.has(token));
}

function getMovieTitleTokens(movie = {}) {
  return Array.from(
    new Set([
      ...tokenizeComparableText(movie?.title),
      ...tokenizeComparableText(movie?.original_title),
      ...tokenizeComparableText(movie?.name),
      ...tokenizeComparableText(movie?.original_name),
    ])
  );
}

function getCollectionTokens(movie = {}) {
  return Array.from(new Set(tokenizeComparableText(movie?.belongs_to_collection?.name)));
}

function getKeywordTokens(movie = {}) {
  const keywords = movie?.keywords?.keywords || movie?.keywords?.results || [];

  return Array.from(new Set(keywords.flatMap((keyword) => tokenizeComparableText(keyword?.name))));
}

function getGenreIds(movie = {}) {
  const genreIds = Array.isArray(movie?.genre_ids) ? movie.genre_ids : [];
  const genres = Array.isArray(movie?.genres) ? movie.genres.map((genre) => genre?.id).filter(Boolean) : [];

  return Array.from(new Set([...genreIds, ...genres].map((value) => Number(value)).filter(Number.isFinite)));
}

function countOverlap(source = [], target = []) {
  if (!source.length || !target.length) {
    return 0;
  }

  const targetSet = new Set(target);
  return source.filter((value) => targetSet.has(value)).length;
}

function getReleaseYear(movie = {}) {
  const rawDate = String(movie?.release_date || movie?.first_air_date || '');

  if (rawDate.length < 4) {
    return null;
  }

  const year = Number.parseInt(rawDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function scoreRelatedMovie(baseMovie, candidate, mode = 'recommendation') {
  const baseTitleTokens = getMovieTitleTokens(baseMovie);
  const candidateTitleTokens = getMovieTitleTokens(candidate);
  const collectionTokens = getCollectionTokens(baseMovie);
  const keywordTokens = getKeywordTokens(baseMovie);
  const baseGenreIds = getGenreIds(baseMovie);
  const candidateGenreIds = getGenreIds(candidate);
  const titleOverlap = countOverlap(baseTitleTokens, candidateTitleTokens);
  const collectionOverlap = countOverlap(collectionTokens, candidateTitleTokens);
  const keywordOverlap = countOverlap(keywordTokens, candidateTitleTokens);
  const genreOverlap = countOverlap(baseGenreIds, candidateGenreIds);
  const baseYear = getReleaseYear(baseMovie);
  const candidateYear = getReleaseYear(candidate);
  const yearDiff =
    Number.isFinite(baseYear) && Number.isFinite(candidateYear) ? Math.abs(candidateYear - baseYear) : null;

  let score = 0;

  score += collectionOverlap * (mode === 'similar' ? 16 : 12);
  score += titleOverlap * (mode === 'similar' ? 10 : 7);
  score += keywordOverlap * 3;
  score += genreOverlap * (mode === 'similar' ? 4 : 3);

  if (collectionTokens.length > 0 && collectionOverlap === 0 && titleOverlap === 0) {
    score -= mode === 'similar' ? 10 : 6;
  }

  if (mode === 'similar' && genreOverlap === 0) {
    score -= 5;
  } else if (genreOverlap === 1) {
    score += 1;
  }

  if (yearDiff !== null) {
    if (yearDiff <= 3) {
      score += 3;
    } else if (yearDiff <= 8) {
      score += 2;
    } else if (yearDiff <= 15) {
      score += 1;
    }
  }

  const popularity = toFiniteNumber(candidate?.popularity);
  const voteCount = toFiniteNumber(candidate?.vote_count);

  if (popularity >= 40) {
    score += 5;
  } else if (popularity >= 20) {
    score += 4;
  } else if (popularity >= 8) {
    score += 3;
  } else if (popularity >= 3) {
    score += 2;
  }

  if (voteCount >= 5000) {
    score += 5;
  } else if (voteCount >= 1000) {
    score += 4;
  } else if (voteCount >= 200) {
    score += 3;
  } else if (voteCount >= 50) {
    score += 2;
  }

  if (candidate?.poster_path) {
    score += 1;
  }

  return score;
}

function rankRelatedMovies(baseMovie, items = [], mode = 'recommendation', limit = MAX_RECOMMENDATIONS) {
  return uniqueBy(items, 'id')
    .map((item) => ({
      item,
      score: scoreRelatedMovie(baseMovie, item, mode),
    }))
    .sort((left, right) => {
      const scoreDiff = right.score - left.score;

      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      return toFiniteNumber(right.item?.popularity) - toFiniteNumber(left.item?.popularity);
    })
    .map(({ item }) => item)
    .slice(0, limit);
}

export function getMovieComputedData(movie) {
  if (!movie) {
    return {};
  }

  const director = movie.credits?.crew?.find((member) => member.job === 'Director');

  const writers = uniqueBy(movie.credits?.crew?.filter((member) => member.department === 'Writing') || [], 'id').slice(
    0,
    MAX_WRITERS
  );

  const cast = uniqueBy(movie.credits?.cast || []);
  const crew = (movie.credits?.crew || []).filter((member) => member?.id && member?.name && member?.job);
  const recommendations = rankRelatedMovies(
    movie,
    movie.recommendations?.results || [],
    'recommendation',
    MAX_RECOMMENDATIONS
  );
  const similar = rankRelatedMovies(movie, movie.similar?.results || [], 'similar', MAX_SIMILAR);

  let certification = null;
  const releases = movie.release_dates?.results || [];
  const usRelease = releases.find((release) => release.iso_3166_1 === 'US');

  if (usRelease) {
    certification = usRelease.release_dates.find((entry) => entry.certification)?.certification;
  }

  return {
    cast,
    crew,
    certification,
    director,
    genres: movie.genres?.map((genre) => genre.name) || [],
    rating: movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null,
    recommendations,
    runtimeText: movie.runtime ? formatRuntime(movie.runtime) : null,
    similar,
    writers,
    year: movie.release_date?.slice(0, 4),
  };
}

export function getGalleryImages(images) {
  return (images?.backdrops || [])
    .filter((image) => image.file_path && !image.iso_639_1)
    .sort(
      (first, second) =>
        (second.vote_average || 0) - (first.vote_average || 0) || (second.vote_count || 0) - (first.vote_count || 0)
    )
    .slice(0, 20);
}

export function createMovieBackdropImageUrl(filePath, size = 'original') {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return null;
  }

  const resolvedSize = typeof size === 'string' && size.trim() ? size.trim() : 'original';
  return `${TMDB_IMG}/${resolvedSize}${filePath}`;
}

export function createMoviePosterImageUrl(filePath, size = 'w780') {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return null;
  }

  const resolvedSize = typeof size === 'string' && size.trim() ? size.trim() : 'w780';
  return `${TMDB_IMG}/${resolvedSize}${filePath}`;
}

export function getPreferredMovieBackgroundFilePath(images) {
  const bestImage = getGalleryImages(images)[0];

  if (!bestImage?.file_path) {
    return null;
  }

  return bestImage.file_path;
}

export function getPreferredMovieBackground(images) {
  return createMovieBackdropImageUrl(getPreferredMovieBackgroundFilePath(images));
}
