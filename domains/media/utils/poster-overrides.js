'use client';

import { useEffect, useState } from 'react';

import { TMDB_IMG } from '@/shared/constants';
import { POSTER_PREFERENCE_CHANGE_EVENT } from '@/domains/media/utils/user-media';
import { getMediaPosterPreferenceFilePath } from '@/domains/media/utils/background-preferences';
import { getPersonPosterPreferenceFilePath } from '@/domains/media/utils/poster-preferences';

let canReadPosterPreferences = false;

function normalizeId(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const id = String(value).trim();
  return id || null;
}

function normalizePath(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const path = value.trim();
  return path || null;
}

function createTmdbImageSrc(path, size = 'w342') {
  const value = normalizePath(path);
  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `${TMDB_IMG}/${size}${value.startsWith('/') ? value : `/${value}`}`;
}

function getMediaId(item) {
  return normalizeId(item?.entityId || item?.id);
}

export function usePosterPreferenceVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bumpVersion = () => setVersion((currentVersion) => currentVersion + 1);

    canReadPosterPreferences = true;
    bumpVersion();

    window.addEventListener(POSTER_PREFERENCE_CHANGE_EVENT, bumpVersion);
    window.addEventListener('storage', bumpVersion);

    return () => {
      window.removeEventListener(POSTER_PREFERENCE_CHANGE_EVENT, bumpVersion);
      window.removeEventListener('storage', bumpVersion);
    };
  }, []);

  return version;
}

export function getPreferredMoviePosterSrc(item, size = 'w342') {
  return getPreferredMediaPosterSrc(item, size, 'movie');
}

export function getPreferredMediaPosterSrc(item, size = 'w342', fallbackMediaType = null) {
  const mediaId = getMediaId(item);
  const mediaType = String(item?.entityType || item?.media_type || fallbackMediaType || '')
    .trim()
    .toLowerCase();
  const preferredPath =
    canReadPosterPreferences && mediaId
      ? getMediaPosterPreferenceFilePath(mediaType, mediaId)
      : null;

  return (
    createTmdbImageSrc(preferredPath, size) ||
    createTmdbImageSrc(item?.poster_path_full, size) ||
    createTmdbImageSrc(item?.poster_path || item?.posterPath, size)
  );
}

export function getPreferredPersonPosterSrc(item, size = 'w342') {
  const mediaId = getMediaId(item);
  const preferredPath =
    canReadPosterPreferences && mediaId ? getPersonPosterPreferenceFilePath(mediaId) : null;

  return (
    createTmdbImageSrc(preferredPath, size) ||
    createTmdbImageSrc(item?.profile_path || item?.profilePath, size)
  );
}

export function getPreferredSearchImageSrc(item, size = 'w342') {
  if (item?.media_type === 'movie') {
    return getPreferredMoviePosterSrc(item, size);
  }

  if (item?.media_type === 'tv') {
    return getPreferredMediaPosterSrc(item, size, 'tv');
  }

  if (item?.media_type === 'person') {
    return getPreferredPersonPosterSrc(item, size);
  }

  return null;
}
