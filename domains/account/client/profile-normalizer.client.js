'use client';

import { isTitleMediaType } from '@/domains/media/utils';
import { normalizeTimestamp } from '@/shared/utils';

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeEntityType(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeFavoriteShowcaseItem(value = {}) {
  const entityId = String(value.entityId || value.entity_id || value.id || '').trim();
  const entityType = normalizeEntityType(value.entityType || value.entity_type || value.media_type);

  if (!entityId || !isTitleMediaType(entityType)) return null;

  return {
    addedAt: normalizeTimestamp(value.addedAt || value.added_at),
    backdrop_path: value.backdrop_path || value.backdropPath || null,
    entityId,
    entityType,
    first_air_date: value.first_air_date || null,
    id: entityId,
    mediaKey: value.mediaKey || value.media_key || `${entityType}_${entityId}`,
    media_type: entityType,
    name: value.name || value.original_name || '',
    original_name: value.original_name || null,
    original_title: value.original_title || null,
    poster_path: value.poster_path || value.posterPath || null,
    position: Number.isFinite(Number(value.position)) ? Number(value.position) : null,
    release_date: value.release_date || null,
    title: value.title || value.original_title || value.name || value.original_name || '',
    updatedAt: normalizeTimestamp(value.updatedAt || value.updated_at),
    vote_average: Number.isFinite(Number(value.vote_average)) ? Number(value.vote_average) : null,
  };
}

export function normalizeFavoriteShowcaseItems(value = []) {
  return normalizeArray(value).map(normalizeFavoriteShowcaseItem).filter(Boolean);
}
