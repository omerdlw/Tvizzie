'use client';

import { notifyPosterPreferenceChange } from '@/core/services/media/poster-preference-events';

const STORAGE_KEY = 'tvizzie.movie.background.preferences';
const MAX_PREFERENCES = 200;
const PREFERENCE_KIND = Object.freeze({
  BACKGROUND: 'background',
  POSTER: 'poster',
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function normalizeMovieId(movieId) {
  if (movieId === null || movieId === undefined) return null;
  const value = String(movieId).trim();
  return value ? value : null;
}

function normalizeFilePath(filePath) {
  if (typeof filePath !== 'string') return null;
  const value = filePath.trim();
  return value ? value : null;
}

function normalizeUpdatedAt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePreferenceEntry(value) {
  if (!isObject(value)) {
    return null;
  }

  const backgroundFilePath = normalizeFilePath(value.backgroundFilePath || value.filePath);
  const posterFilePath = normalizeFilePath(value.posterFilePath);
  const backgroundUpdatedAt = normalizeUpdatedAt(value.backgroundUpdatedAt ?? value.updatedAt);
  const posterUpdatedAt = normalizeUpdatedAt(value.posterUpdatedAt);

  if (!backgroundFilePath && !posterFilePath) {
    return null;
  }

  return {
    backgroundFilePath,
    backgroundUpdatedAt,
    posterFilePath,
    posterUpdatedAt,
  };
}

function getPreferenceByKind(entry, kind) {
  if (!isObject(entry)) {
    return null;
  }

  if (kind === PREFERENCE_KIND.POSTER) {
    const filePath = normalizeFilePath(entry.posterFilePath);
    if (!filePath) return null;

    return {
      filePath,
      updatedAt: normalizeUpdatedAt(entry.posterUpdatedAt),
    };
  }

  const filePath = normalizeFilePath(entry.backgroundFilePath || entry.filePath);
  if (!filePath) return null;

  return {
    filePath,
    updatedAt: normalizeUpdatedAt(entry.backgroundUpdatedAt ?? entry.updatedAt),
  };
}

function withUpdatedPreferenceEntry(entry, kind, filePath) {
  const baseEntry = normalizePreferenceEntry(entry) || {
    backgroundFilePath: null,
    backgroundUpdatedAt: null,
    posterFilePath: null,
    posterUpdatedAt: null,
  };
  const resolvedFilePath = normalizeFilePath(filePath);

  if (!resolvedFilePath) {
    return baseEntry;
  }

  const now = Date.now();

  if (kind === PREFERENCE_KIND.POSTER) {
    return {
      ...baseEntry,
      posterFilePath: resolvedFilePath,
      posterUpdatedAt: now,
    };
  }

  return {
    ...baseEntry,
    backgroundFilePath: resolvedFilePath,
    backgroundUpdatedAt: now,
  };
}

function withClearedPreferenceEntry(entry, kind) {
  const baseEntry = normalizePreferenceEntry(entry);

  if (!baseEntry) {
    return null;
  }

  if (kind === PREFERENCE_KIND.POSTER) {
    const nextEntry = {
      ...baseEntry,
      posterFilePath: null,
      posterUpdatedAt: null,
    };

    return normalizePreferenceEntry(nextEntry);
  }

  const nextEntry = {
    ...baseEntry,
    backgroundFilePath: null,
    backgroundUpdatedAt: null,
  };

  return normalizePreferenceEntry(nextEntry);
}

function createEmptyStore() {
  return {
    entries: {},
  };
}

function readStore() {
  if (!canUseStorage()) {
    return createEmptyStore();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStore();

    const parsed = JSON.parse(raw);
    if (!isObject(parsed) || !isObject(parsed.entries)) {
      return createEmptyStore();
    }

    return {
      entries: parsed.entries,
    };
  } catch {
    return createEmptyStore();
  }
}

function pruneEntries(entries = {}) {
  const normalizedEntries = Object.entries(entries)
    .filter(([movieId, value]) => normalizeMovieId(movieId) && isObject(value))
    .map(([movieId, value]) => {
      const normalizedId = normalizeMovieId(movieId);
      const normalizedEntry = normalizePreferenceEntry(value);

      if (!normalizedId || !normalizedEntry) {
        return null;
      }

      return [
        normalizedId,
        {
          backgroundFilePath: normalizedEntry.backgroundFilePath,
          backgroundUpdatedAt: normalizedEntry.backgroundUpdatedAt,
          posterFilePath: normalizedEntry.posterFilePath,
          posterUpdatedAt: normalizedEntry.posterUpdatedAt,
        },
      ];
    })
    .filter(Boolean)
    .sort(([, first], [, second]) => {
      const firstUpdatedAt = Math.max(Number(first.backgroundUpdatedAt) || 0, Number(first.posterUpdatedAt) || 0);
      const secondUpdatedAt = Math.max(Number(second.backgroundUpdatedAt) || 0, Number(second.posterUpdatedAt) || 0);

      return secondUpdatedAt - firstUpdatedAt;
    })
    .slice(0, MAX_PREFERENCES);

  return Object.fromEntries(normalizedEntries);
}

function writeStore(store) {
  if (!canUseStorage()) {
    return false;
  }

  try {
    const entries = pruneEntries(store?.entries || {});
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        entries,
      })
    );
    return true;
  } catch {
    return false;
  }
}

function getMoviePreferenceByKind(movieId, kind) {
  const resolvedMovieId = normalizeMovieId(movieId);
  if (!resolvedMovieId) {
    return null;
  }

  const store = readStore();
  const preferenceEntry = store.entries?.[resolvedMovieId];
  return getPreferenceByKind(preferenceEntry, kind);
}

function setMoviePreferenceByKind(movieId, filePath, kind) {
  const resolvedMovieId = normalizeMovieId(movieId);
  const resolvedFilePath = normalizeFilePath(filePath);

  if (!resolvedMovieId || !resolvedFilePath) {
    return false;
  }

  const store = readStore();
  const nextStore = {
    entries: {
      ...(store.entries || {}),
      [resolvedMovieId]: withUpdatedPreferenceEntry(store.entries?.[resolvedMovieId], kind, resolvedFilePath),
    },
  };

  return writeStore(nextStore);
}

function clearMoviePreferenceByKind(movieId, kind) {
  const resolvedMovieId = normalizeMovieId(movieId);
  if (!resolvedMovieId) {
    return false;
  }

  const store = readStore();
  const nextEntries = {
    ...(store.entries || {}),
  };
  const nextEntry = withClearedPreferenceEntry(nextEntries[resolvedMovieId], kind);

  if (nextEntry) {
    nextEntries[resolvedMovieId] = nextEntry;
  } else {
    delete nextEntries[resolvedMovieId];
  }

  return writeStore({
    entries: nextEntries,
  });
}

export function getMovieBackgroundPreference(movieId) {
  return getMoviePreferenceByKind(movieId, PREFERENCE_KIND.BACKGROUND);
}

export function getMovieBackgroundPreferenceFilePath(movieId) {
  return getMovieBackgroundPreference(movieId)?.filePath || null;
}

export function setMovieBackgroundPreference(movieId, filePath) {
  return setMoviePreferenceByKind(movieId, filePath, PREFERENCE_KIND.BACKGROUND);
}

export function clearMovieBackgroundPreference(movieId) {
  return clearMoviePreferenceByKind(movieId, PREFERENCE_KIND.BACKGROUND);
}

export function getMoviePosterPreference(movieId) {
  return getMoviePreferenceByKind(movieId, PREFERENCE_KIND.POSTER);
}

export function getMoviePosterPreferenceFilePath(movieId) {
  return getMoviePosterPreference(movieId)?.filePath || null;
}

export function setMoviePosterPreference(movieId, filePath) {
  const didSet = setMoviePreferenceByKind(movieId, filePath, PREFERENCE_KIND.POSTER);

  if (didSet) {
    notifyPosterPreferenceChange({ entityType: 'movie', entityId: movieId });
  }

  return didSet;
}

export function clearMoviePosterPreference(movieId) {
  const didClear = clearMoviePreferenceByKind(movieId, PREFERENCE_KIND.POSTER);

  if (didClear) {
    notifyPosterPreferenceChange({ entityType: 'movie', entityId: movieId });
  }

  return didClear;
}
