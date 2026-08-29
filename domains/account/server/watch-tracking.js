import 'server-only';

import { createAdminClient } from '@/infrastructure/supabase/server';
import { createAccountCoreError } from '@/domains/account/core/errors';
import {
  canViewerAccessUserContent,
  createPrivateProfileError,
} from '@/domains/account/server/profile';
import { buildMediaItemKey } from '@/domains/media/utils/media-key';
import { normalizeTimestamp, normalizeValue } from '@/shared';

const WATCH_TRACKING_RESOURCES = new Set(['watch-diary']);

function resolveMediaKey(media = null) {
  const entityId = normalizeValue(media?.entityId || media?.entity_id || media?.id);
  const entityType = normalizeValue(
    media?.entityType || media?.entity_type || media?.media_type,
  ).toLowerCase();
  return entityId && entityType ? buildMediaItemKey(entityType, entityId) : null;
}

function resolveLimitCount(value, fallback = 50, max = 200) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function isWatchTrackingResource(resource) {
  return WATCH_TRACKING_RESOURCES.has(resource);
}

function normalizeDiaryDate(value) {
  const normalized = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

export async function getWatchDiaryStartMonth({ admin: customAdmin, userId, viewerId } = {}) {
  const admin = customAdmin || createAdminClient();
  const canAccess = await canViewerAccessUserContent({
    client: admin,
    ownerId: userId,
    viewerId,
  });
  if (!canAccess) throw createPrivateProfileError();

  const result = await admin
    .from('watch_diary_entries')
    .select('watched_on')
    .eq('user_id', userId)
    .order('watched_on', { ascending: true })
    .order('watched_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (result.error)
    throw new Error(result.error.message || 'Watch diary start could not be loaded');

  return normalizeDiaryDate(result.data?.watched_on)?.slice(0, 7) || null;
}

function normalizeDiaryEntry(row = {}, review = null) {
  return {
    backdropPath: row.backdrop_path || null,
    createdAt: normalizeTimestamp(row.created_at),
    entityId: row.entity_id || null,
    entityType: row.entity_type || null,
    entryKind: row.entry_kind || 'title',
    id: row.id || null,
    isRewatch: row.is_rewatch === true,
    mediaKey: row.media_key || null,
    posterPath: row.poster_path || null,
    hasReview: Boolean(review),
    reviewRating:
      review?.rating === null || review?.rating === undefined ? null : Number(review.rating),
    seasonNumber: Number(row.season_number) || null,
    episodeNumber: Number(row.episode_number) || null,
    episodeTitle: row.episode_title || null,
    title: row.title || 'Untitled',
    watchedAt: normalizeTimestamp(row.watched_at),
    watchedOn: row.watched_on || null,
  };
}

export async function getWatchTrackingResource({
  admin: customAdmin,
  episodeNumber = null,
  fromDate = null,
  limitCount = null,
  media = null,
  resource,
  seasonNumber = null,
  toDate = null,
  userId,
  viewerId,
} = {}) {
  if (!isWatchTrackingResource(resource)) {
    throw createAccountCoreError(
      'WATCH_TRACKING_RESOURCE_UNSUPPORTED',
      'Unsupported tracking resource',
      {
        status: 400,
      },
    );
  }

  const admin = customAdmin || createAdminClient();
  const mediaKey = resolveMediaKey(media);

  const canAccess = await canViewerAccessUserContent({
    client: admin,
    ownerId: userId,
    viewerId,
  });
  if (!canAccess) throw createPrivateProfileError();
  const startDate = normalizeDiaryDate(fromDate);
  const endDate = normalizeDiaryDate(toDate);
  const resolvedSeasonNumber = Number(seasonNumber);
  const resolvedEpisodeNumber = Number(episodeNumber);
  let query = admin
    .from('watch_diary_entries')
    .select(
      'id, media_key, entity_id, entity_type, title, poster_path, backdrop_path, watched_on, watched_at, is_rewatch, entry_kind, season_number, episode_number, episode_title, created_at',
    )
    .eq('user_id', userId)
    .order('watched_on', { ascending: false })
    .order('watched_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(resolveLimitCount(limitCount));
  if (mediaKey) query = query.eq('media_key', mediaKey);
  if (Number.isInteger(resolvedSeasonNumber) && resolvedSeasonNumber > 0) {
    query = query.eq('entry_kind', 'episode').eq('season_number', resolvedSeasonNumber);
  }
  if (Number.isInteger(resolvedEpisodeNumber) && resolvedEpisodeNumber > 0) {
    query = query.eq('episode_number', resolvedEpisodeNumber);
  }
  if (startDate) query = query.gte('watched_on', startDate);
  if (endDate) query = query.lte('watched_on', endDate);
  const result = await query;
  if (result.error) throw new Error(result.error.message || 'Watch diary could not be loaded');

  const diaryRows = result.data || [];
  const mediaKeys = [...new Set(diaryRows.map((entry) => entry.media_key).filter(Boolean))];
  if (mediaKeys.length === 0) return [];

  const reviews = await admin
    .from('media_reviews')
    .select('media_key, rating')
    .eq('user_id', userId)
    .in('media_key', mediaKeys);
  if (reviews.error) throw new Error(reviews.error.message || 'Diary reviews could not be loaded');

  const reviewsByMediaKey = new Map(
    (reviews.data || []).map((review) => [review.media_key, review]),
  );
  return diaryRows.map((entry) =>
    normalizeDiaryEntry(entry, reviewsByMediaKey.get(entry.media_key)),
  );
}
