'use client';

import { useEffect, useState } from 'react';
import { TMDB_IMG } from '@/shared/constants.js';
import { normalizeValue } from '@/shared/normalize';
import {
  getMediaPosterPreferenceFilePath,
  POSTER_PREFERENCE_CHANGE_EVENT,
  notifyPosterPreferenceChange,
} from './background-preferences.js';
import {
  getSupabaseClient,
  assertSupabaseResult,
} from '@/infrastructure/http/supabase-data-service';

const STORAGE_KEY = 'tvizzie.person.poster.preferences';
const MAX_PREFERENCES = 200;

let canReadPosterPreferences = false;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function normalizePersonId(personId) {
  if (personId === null || personId === undefined) return null;
  const value = String(personId).trim();
  return value || null;
}

function normalizeFilePath(filePath) {
  if (typeof filePath !== 'string') return null;
  const value = filePath.trim();
  return value || null;
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
    .sort(
      ([, first], [, second]) => (Number(second.updatedAt) || 0) - (Number(first.updatedAt) || 0),
    )
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
      }),
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

const POSITION_IN_PAYLOAD_TABLES = new Set(['likes', 'watchlist', 'watched']);

function ensureDocRef(docRef) {
  if (!docRef || typeof docRef !== 'object') {
    throw new Error('updateUserMediaPosition requires a valid reference object');
  }

  const table = normalizeValue(docRef.table);

  if (!table) {
    throw new Error('updateUserMediaPosition requires a table reference');
  }

  return {
    id: normalizeValue(docRef.id),
    listId: normalizeValue(docRef.listId),
    table,
    userId: normalizeValue(docRef.userId),
  };
}

async function updateListItemPosition(client, ref, position, updatedAt) {
  const result = await client
    .from('list_items')
    .update({
      position,
      updated_at: updatedAt,
    })
    .eq('user_id', ref.userId)
    .eq('list_id', ref.listId)
    .eq('media_key', ref.id);

  assertSupabaseResult(result, 'List item position could not be updated');
}

async function updatePayloadPosition(client, ref, position, updatedAt) {
  const current = await client
    .from(ref.table)
    .select('payload')
    .eq('user_id', ref.userId)
    .eq('media_key', ref.id)
    .maybeSingle();

  assertSupabaseResult(current, 'Media item could not be loaded');

  const nextPayload = {
    ...(current.data?.payload && typeof current.data.payload === 'object'
      ? current.data.payload
      : {}),
    position,
    updatedAt,
  };

  const update = await client
    .from(ref.table)
    .update({
      payload: nextPayload,
      updated_at: updatedAt,
    })
    .eq('user_id', ref.userId)
    .eq('media_key', ref.id);

  assertSupabaseResult(update, 'Media item position could not be updated');
}

export async function updateUserMediaPosition(docRef, position) {
  if (position === undefined || position === null) {
    throw new Error('updateUserMediaPosition requires a position value');
  }

  const ref = ensureDocRef(docRef);

  if (!ref.userId || !ref.id) {
    throw new Error('updateUserMediaPosition requires userId and item id');
  }

  const client = getSupabaseClient();
  const updatedAt = new Date().toISOString();

  if (ref.table === 'list_items') {
    if (!ref.listId) {
      throw new Error('List item reorder requires listId');
    }

    await updateListItemPosition(client, ref, position, updatedAt);
    return { position };
  }

  if (POSITION_IN_PAYLOAD_TABLES.has(ref.table)) {
    await updatePayloadPosition(client, ref, position, updatedAt);
    return { position };
  }

  throw new Error(`Unsupported media position table: ${ref.table}`);
}
