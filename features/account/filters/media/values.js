import { normalizeFiniteNumber, normalizeString, normalizeToken } from '../shared';
import { GENRE_LABEL_TO_VALUE, GENRE_VALUE_TO_LABEL, TMDB_GENRE_ID_TO_VALUE } from './options';

export function resolveAverageRating(item = {}) {
  const raw = normalizeFiniteNumber(item?.vote_average, null);

  if (!Number.isFinite(raw) || raw <= 0) {
    return null;
  }

  return raw;
}

export function resolvePopularity(item = {}) {
  const popularity = normalizeFiniteNumber(item?.popularity, null);

  if (Number.isFinite(popularity)) {
    return popularity;
  }

  const voteCount = normalizeFiniteNumber(item?.vote_count, null);
  const rating = resolveAverageRating(item);

  if (!Number.isFinite(voteCount) && rating === null) {
    return 0;
  }

  return (Number.isFinite(voteCount) ? voteCount : 0) + (rating !== null ? rating * 50 : 0);
}

export function resolveUserRating(item = {}) {
  const rating = normalizeFiniteNumber(item?.rating ?? item?.userRating, null);
  return Number.isFinite(rating) ? rating : null;
}

function resolveGenreValueFromRaw(rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  const asNumber = normalizeFiniteNumber(rawValue, null);

  if (Number.isFinite(asNumber) && TMDB_GENRE_ID_TO_VALUE[asNumber]) {
    return TMDB_GENRE_ID_TO_VALUE[asNumber];
  }

  const token = normalizeToken(rawValue);

  if (!token) {
    return null;
  }

  if (GENRE_VALUE_TO_LABEL[token]) {
    return token;
  }

  return GENRE_LABEL_TO_VALUE[token] || token;
}

export function collectGenreValues(item = {}) {
  const values = new Set();
  const append = (entry) => {
    const normalized = resolveGenreValueFromRaw(entry);

    if (!normalized) {
      return;
    }

    values.add(normalized);
  };

  const genreIdSources = [item?.genre_ids, item?.genreIds, item?.payload?.genre_ids, item?.payload?.genreIds];
  genreIdSources.forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach((genreId) => append(genreId));
  });

  const genreSources = [
    item?.genres,
    item?.genreNames,
    item?.genre_names,
    item?.payload?.genres,
    item?.payload?.genreNames,
    item?.payload?.genre_names,
  ];
  genreSources.forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach((genre) => {
      if (genre && typeof genre === 'object') {
        append(genre.id);
        append(genre.name);
        return;
      }

      append(genre);
    });
  });

  return values;
}

export function collectServiceValues(item = {}) {
  const values = new Set();
  const append = (entry) => {
    if (!entry) {
      return;
    }

    if (typeof entry === 'string') {
      const token = normalizeToken(entry);

      if (token) {
        values.add(token);
      }

      return;
    }

    if (typeof entry === 'number') {
      values.add(String(entry));
      return;
    }

    if (typeof entry === 'object') {
      const nameToken = normalizeToken(entry.provider_name || entry.name || entry.title);
      const idToken = normalizeString(entry.provider_id || entry.id);

      if (nameToken) {
        values.add(nameToken);
      }

      if (idToken) {
        values.add(idToken);
      }
    }
  };

  const directArraySources = [
    item?.providerNames,
    item?.providerIds,
    item?.providers,
    item?.payload?.providerNames,
    item?.payload?.providerIds,
    item?.payload?.providers,
  ];

  directArraySources.forEach((source) => {
    if (!Array.isArray(source)) {
      return;
    }

    source.forEach((entry) => append(entry));
  });

  const providerMap = item?.watchProviders || item?.payload?.watchProviders || null;

  if (providerMap && typeof providerMap === 'object') {
    Object.values(providerMap).forEach((regionProviders) => {
      if (!regionProviders || typeof regionProviders !== 'object') {
        return;
      }

      Object.values(regionProviders).forEach((providerList) => {
        if (!Array.isArray(providerList)) {
          return;
        }

        providerList.forEach((provider) => append(provider));
      });
    });
  }

  return values;
}
