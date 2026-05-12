import { TMDB_IMG } from '@/core/constants';
import { getPreferredMoviePosterSrc } from '@/features/media/poster-overrides';

export function getReviewPosterSrc(review) {
  if (review?.subjectType === 'movie') {
    const preferredPoster = getPreferredMoviePosterSrc(
      {
        id: review?.subjectId,
        poster_path: review?.subjectPoster,
      },
      'w342'
    );

    if (preferredPoster) {
      return preferredPoster;
    }
  }

  const poster = String(review?.subjectPoster || '').trim();

  if (!poster) return null;
  if (poster.startsWith('http://') || poster.startsWith('https://')) return poster;
  if (poster.startsWith('/')) return `${TMDB_IMG}/w342${poster}`;

  return poster;
}

export function getReviewLikeText(likesCount) {
  if (likesCount === 0) return 'Like';
  if (likesCount === 1) return '1 like';
  return `${likesCount} likes`;
}

export function getAccountActivityLabel(review, { hasRating, hasText }) {
  if (review.subjectType === 'list') {
    return hasText ? 'List comment' : 'List note';
  }

  if (hasText) {
    return 'Watched';
  }

  if (hasRating) {
    return 'Rated';
  }

  return 'Logged';
}

export function getFeedActivityLabel(review, { hasRating, hasText }) {
  if (review.subjectType === 'list') {
    return hasText ? 'List comment by' : 'List note by';
  }

  if (hasText) {
    return 'Review by';
  }

  if (hasRating) {
    return 'Rated by';
  }

  return 'Logged by';
}

function appendQueryParam(href, key, value) {
  const safeHref = String(href || '').trim();
  const safeValue = String(value || '').trim();

  if (!safeHref || !safeValue) {
    return safeHref;
  }

  const [pathPart, hashPart = ''] = safeHref.split('#');
  const [pathname, search = ''] = pathPart.split('?');
  const params = new URLSearchParams(search);

  params.set(key, safeValue);

  const query = params.toString();
  const withQuery = query ? `${pathname}?${query}` : pathname;

  return hashPart ? `${withQuery}#${hashPart}` : withQuery;
}

function resolveMovieReviewsHref(review) {
  const subjectId = String(review?.subjectId || '').trim();
  const rawSubjectHref = String(review?.subjectHref || '').trim();
  let baseHref = '';

  if (subjectId) {
    baseHref = `/movie/${subjectId}/reviews`;
  } else if (rawSubjectHref) {
    if (/^\/movie\/[^/?#]+\/reviews(?:[?#].*)?$/.test(rawSubjectHref)) {
      baseHref = rawSubjectHref;
    } else {
      const movieMatch = rawSubjectHref.match(/^\/movie\/([^/?#]+)([?#].*)?$/);

      if (movieMatch) {
        const movieId = movieMatch[1];
        const suffix = movieMatch[2] || '';
        baseHref = `/movie/${movieId}/reviews${suffix}`;
      }
    }
  }

  if (!baseHref) {
    return rawSubjectHref || null;
  }

  const reviewUser = String(review?.user?.username || review?.user?.id || review?.reviewUserId || '').trim();

  return appendQueryParam(baseHref, 'user', reviewUser);
}

export function resolveSubjectHref(review, isAccountVariant) {
  const rawSubjectHref = String(review?.subjectHref || '').trim();

  if (!isAccountVariant) {
    return rawSubjectHref || null;
  }

  if (review?.subjectType === 'movie') {
    return resolveMovieReviewsHref(review);
  }

  return rawSubjectHref || null;
}

export function isInteractiveTarget(target) {
  return Boolean(
    target instanceof Element && target.closest('a, button, input, textarea, select, summary, [role="button"]')
  );
}
