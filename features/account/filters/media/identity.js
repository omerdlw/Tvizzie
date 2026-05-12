import { buildMediaItemKey } from '@/core/services/shared/media-key.service';

import { normalizeString } from '../shared';

export function toMediaKey(item = {}) {
  if (item?.mediaKey) {
    return String(item.mediaKey);
  }

  const entityType = normalizeString(item?.entityType || item?.media_type || item?.subject?.type).toLowerCase();
  const entityId = normalizeString(item?.entityId || item?.id || item?.subject?.id);

  if (!entityType || !entityId) {
    return '';
  }

  return buildMediaItemKey(entityType, entityId);
}

export function resolveMediaTitle(item = {}) {
  return item?.title || item?.name || item?.original_title || item?.original_name || 'Untitled';
}

export function resolveReleaseDate(item = {}) {
  return item?.release_date || item?.first_air_date || null;
}

export function resolveReleaseYear(item = {}) {
  const rawValue = resolveReleaseDate(item);

  if (!rawValue) {
    return null;
  }

  const dateValue = new Date(rawValue).getTime();

  if (!Number.isFinite(dateValue)) {
    const numericYear = Number.parseInt(String(rawValue).slice(0, 4), 10);
    return Number.isFinite(numericYear) ? numericYear : null;
  }

  return new Date(dateValue).getUTCFullYear();
}

export function resolveReleaseTime(item = {}) {
  const rawValue = resolveReleaseDate(item);

  if (!rawValue) {
    return 0;
  }

  const timeValue = new Date(rawValue).getTime();
  return Number.isFinite(timeValue) ? timeValue : 0;
}

export function resolveAddedTime(item = {}) {
  const rawValue = item?.addedAt || item?.updatedAt || null;

  if (!rawValue) {
    return 0;
  }

  const timeValue = new Date(rawValue).getTime();
  return Number.isFinite(timeValue) ? timeValue : 0;
}

export function buildMediaKeySet(items = []) {
  return new Set((Array.isArray(items) ? items : []).map((item) => toMediaKey(item)).filter(Boolean));
}
