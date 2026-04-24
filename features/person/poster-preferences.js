'use client';

import { notifyPosterPreferenceChange } from '@/core/services/media/poster-preference-events';

const STORAGE_KEY = 'tvizzie.person.poster.preferences';
const MAX_PREFERENCES = 200;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function normalizePersonId(personId) {
  if (personId === null || personId === undefined) return null;
  const value = String(personId).trim();
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

  const filePath = normalizeFilePath(value.posterFilePath || value.filePath);
  if (!filePath) {
    return null;
  }

  return {
    filePath,
    updatedAt: normalizeUpdatedAt(value.updatedAt),
  };
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
    .filter(([personId, value]) => normalizePersonId(personId) && isObject(value))
    .map(([personId, value]) => {
      const normalizedId = normalizePersonId(personId);
      const normalizedEntry = normalizePreferenceEntry(value);

      if (!normalizedId || !normalizedEntry) {
        return null;
      }

      return [
        normalizedId,
        {
          posterFilePath: normalizedEntry.filePath,
          updatedAt: normalizedEntry.updatedAt,
        },
      ];
    })
    .filter(Boolean)
    .sort(([, first], [, second]) => (Number(second.updatedAt) || 0) - (Number(first.updatedAt) || 0))
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

export function getPersonPosterPreference(personId) {
  const resolvedPersonId = normalizePersonId(personId);
  if (!resolvedPersonId) {
    return null;
  }

  const store = readStore();
  return normalizePreferenceEntry(store.entries?.[resolvedPersonId]);
}

export function getPersonPosterPreferenceFilePath(personId) {
  return getPersonPosterPreference(personId)?.filePath || null;
}

export function setPersonPosterPreference(personId, filePath) {
  const resolvedPersonId = normalizePersonId(personId);
  const resolvedFilePath = normalizeFilePath(filePath);

  if (!resolvedPersonId || !resolvedFilePath) {
    return false;
  }

  const store = readStore();
  const nextStore = {
    entries: {
      ...(store.entries || {}),
      [resolvedPersonId]: {
        posterFilePath: resolvedFilePath,
        updatedAt: Date.now(),
      },
    },
  };

  const didSet = writeStore(nextStore);

  if (didSet) {
    notifyPosterPreferenceChange({ entityType: 'person', entityId: personId });
  }

  return didSet;
}

export function clearPersonPosterPreference(personId) {
  const resolvedPersonId = normalizePersonId(personId);
  if (!resolvedPersonId) {
    return false;
  }

  const store = readStore();
  const nextEntries = {
    ...(store.entries || {}),
  };

  delete nextEntries[resolvedPersonId];

  const didClear = writeStore({
    entries: nextEntries,
  });

  if (didClear) {
    notifyPosterPreferenceChange({ entityType: 'person', entityId: personId });
  }

  return didClear;
}
