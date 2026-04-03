'use client'

import {
  assertMovieMedia,
  buildMediaItemKey,
} from '@/core/services/shared/media-key.service'
import { normalizeTimestamp } from '@/core/services/shared/data-utils'
import { isMovieMediaType } from '@/core/utils/media'

function normalizeNumber(value, fallback = null) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return parsed
}

function normalizeEntityType(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function ensureUserId(userId, message) {
  if (!userId) {
    throw new Error(message || 'Authenticated user is required')
  }
}

export function resolveLimitCount(value, fallback = 0, max = 100) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(Math.max(1, Math.floor(parsed)), max)
}

export function normalizeMediaPayload(payload = {}, row = {}) {
  const entityId = String(
    payload.entityId || row.entity_id || payload.id || ''
  ).trim()
  const entityType = normalizeEntityType(
    payload.entityType || row.entity_type || payload.media_type
  )

  return {
    addedAt: normalizeTimestamp(payload.addedAt || row.added_at),
    backdrop_path:
      payload.backdrop_path ||
      payload.backdropPath ||
      row.backdrop_path ||
      null,
    entityId: entityId || null,
    entityType: entityType || null,
    first_air_date: payload.first_air_date || null,
    id: entityId || String(payload.id || row.media_key || '').trim() || null,
    mediaKey:
      payload.mediaKey ||
      row.media_key ||
      (entityType && entityId ? buildMediaItemKey(entityType, entityId) : null),
    media_type: entityType || null,
    name: payload.name || payload.original_name || '',
    original_name: payload.original_name || null,
    original_title: payload.original_title || null,
    poster_path: payload.poster_path || payload.posterPath || row.poster_path || null,
    position: normalizeNumber(payload.position, null),
    release_date: payload.release_date || null,
    title:
      payload.title ||
      payload.original_title ||
      row.title ||
      payload.name ||
      payload.original_name ||
      '',
    updatedAt: normalizeTimestamp(payload.updatedAt || row.updated_at),
    userId: payload.userId || row.user_id || null,
    vote_average: normalizeNumber(payload.vote_average, null),
  }
}

export function assertMoviePayload(payload = {}, message = 'Only movies are supported') {
  const normalizedType = normalizeEntityType(
    payload.entityType || payload.media_type || payload.type
  )

  if (!isMovieMediaType(normalizedType)) {
    throw new Error(message)
  }

  return normalizedType
}

export function createMediaPayload(media = {}, userId = null, options = {}) {
  const mediaSnapshot = assertMovieMedia(
    media,
    options.message || 'Only movies are supported in user collections'
  )

  if (!mediaSnapshot.entityType || !mediaSnapshot.entityId || !mediaSnapshot.title) {
    throw new Error('User media entries require entityType, entityId and title')
  }

  const mediaKey = buildMediaItemKey(
    mediaSnapshot.entityType,
    mediaSnapshot.entityId
  )
  const now = new Date().toISOString()

  return {
    addedAt: options.addedAt || now,
    backdrop_path: mediaSnapshot.backdropPath,
    entityId: mediaSnapshot.entityId,
    entityType: mediaSnapshot.entityType,
    first_air_date: null,
    mediaKey,
    media_type: mediaSnapshot.entityType,
    name: '',
    original_name: null,
    original_title: media.original_title || null,
    poster_path: mediaSnapshot.posterPath,
    position:
      options.position !== undefined
        ? options.position
        : Number.isFinite(Number(media.position))
          ? Number(media.position)
          : null,
    release_date: media.release_date || null,
    title: media.title || media.original_title || mediaSnapshot.title,
    updatedAt: options.updatedAt || now,
    userId: userId || null,
    vote_average: normalizeNumber(media.vote_average, null),
  }
}

export function createMediaRow(media, userId, options = {}) {
  const payload = createMediaPayload(media, userId, options)

  return {
    added_at: payload.addedAt,
    backdrop_path: payload.backdrop_path,
    entity_id: payload.entityId,
    entity_type: payload.entityType,
    media_key: payload.mediaKey,
    payload,
    poster_path: payload.poster_path,
    title: payload.title,
    updated_at: payload.updatedAt,
    user_id: userId,
  }
}

export function paginateByCursor(items = [], cursor = null, pageSize = 20) {
  const offset = Number.isFinite(Number(cursor)) ? Number(cursor) : 0
  const normalizedPageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Number(pageSize))
    : 20
  const nextItems = items.slice(offset, offset + normalizedPageSize)
  const nextOffset = offset + nextItems.length

  return {
    hasMore: nextOffset < items.length,
    items: nextItems,
    nextCursor: nextOffset < items.length ? nextOffset : null,
  }
}
