'use client';

import { requestApiJson } from '@/infrastructure/http/client';
import {
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/client';
import { createMediaPayload, ensureUserId } from '@/domains/media/utils/media-payload';
import { assertTitleMedia, buildMediaItemKey } from '@/domains/media/utils/media-key';
import { ACTIVITY_EVENT_TYPES, fireActivityEvent } from '@/domains/social/client/activity';
import { ACTIVITY_SLOT_TYPES } from '@/domains/social/utils/constants';
import {
  buildActivitySubjectRef,
  buildCanonicalActivityDedupeKey,
} from '@/domains/social/utils/formatting';
import {
  buildMediaCollectionStatusSubscriptionKey,
  buildUserMediaCollectionSubscriptionKey,
} from '@/domains/account/client';

function resolveMediaKey(media) {
  const snapshot = assertTitleMedia(media, 'Only movies and TV series can be added to the diary');
  return buildMediaItemKey(snapshot.entityType, snapshot.entityId);
}

function toResultRow(result) {
  return Array.isArray(result) ? result[0] || null : result || null;
}

export function getWatchDiarySubscriptionKey({
  episodeNumber = null,
  fromDate = null,
  media = null,
  seasonNumber = null,
  toDate = null,
  userId,
}) {
  return `watch-diary:${userId}:${media ? resolveMediaKey(media) : 'all'}:${fromDate || ''}:${toDate || ''}:${seasonNumber || ''}:${episodeNumber || ''}`;
}

export async function fetchWatchDiary({
  episodeNumber = null,
  fromDate = null,
  limitCount = 50,
  media = null,
  seasonNumber = null,
  toDate = null,
  userId,
}) {
  if (!userId) return [];
  return requestApiJson('/api/account/library', {
    query: {
      entityId: media?.entityId || media?.entity_id || media?.id || null,
      entityType: media?.entityType || media?.entity_type || media?.media_type || null,
      fromDate,
      limitCount,
      resource: 'watch-diary',
      episodeNumber,
      seasonNumber,
      toDate,
      userId,
    },
  }).then((response) => response?.items || response?.data || []);
}

export function subscribeToWatchDiary(args, callback, options = {}) {
  return createPollingSubscription(() => fetchWatchDiary(args), callback, {
    ...options,
    subscriptionKey: getWatchDiarySubscriptionKey(args),
  });
}

export async function logWatchDiaryEntry({
  episode = null,
  hasWatchedBefore = false,
  media,
  seasonNumber = null,
  userId,
  watchedOn = null,
}) {
  ensureUserId(userId, 'Authentication is required to write to your watch diary');
  const payload = createMediaPayload(media, userId);
  const episodeNumber = Number(episode?.episodeNumber ?? episode?.episode_number);
  const resolvedSeasonNumber = Number(
    seasonNumber ?? episode?.seasonNumber ?? episode?.season_number,
  );
  const isEpisode = payload.entityType === 'tv';
  if (
    isEpisode &&
    (!Number.isInteger(episodeNumber) ||
      episodeNumber <= 0 ||
      !Number.isInteger(resolvedSeasonNumber) ||
      resolvedSeasonNumber <= 0)
  ) {
    throw new Error('A valid season and episode are required');
  }
  const date = String(watchedOn || new Date().toISOString().slice(0, 10)).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Watch day is invalid');

  const response = await requestApiJson('/api/account/library', {
    body: {
      command: 'log-watch',
      episode: isEpisode
        ? {
            episodeId: episode?.id ? String(episode.id) : null,
            episodeNumber,
            episodeTitle: episode?.episodeTitle || episode?.title || episode?.name || null,
            seasonNumber: resolvedSeasonNumber,
          }
        : null,
      hasWatchedBefore,
      media: payload,
      watchedOn: date,
    },
    method: 'POST',
  });
  const result = toResultRow(response?.result);
  const mediaKey = payload.mediaKey;
  const watched = {
    ...payload,
    firstWatchedAt: date,
    lastWatchedAt: date,
  };

  const diaryEntryId = String(result?.entry_id || '').trim();
  const diaryEventType =
    result?.is_rewatch === true
      ? ACTIVITY_EVENT_TYPES.WATCH_DIARY_REWATCHED
      : ACTIVITY_EVENT_TYPES.WATCH_DIARY_LOGGED;

  fireActivityEvent(diaryEventType, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: userId,
      primaryRef: buildActivitySubjectRef({
        subjectId: payload.entityId,
        subjectType: payload.entityType,
      }),
      secondaryRef: diaryEntryId,
      slotType: ACTIVITY_SLOT_TYPES.WATCH_DIARY_ENTRY,
    }),
    diaryEntryId,
    entryKind: isEpisode ? 'episode' : 'title',
    episodeNumber: isEpisode ? episodeNumber : null,
    episodeTitle: isEpisode
      ? episode?.episodeTitle || episode?.title || episode?.name || null
      : null,
    seasonNumber: isEpisode ? resolvedSeasonNumber : null,
    subjectId: payload.entityId,
    subjectPoster: payload.poster_path || null,
    subjectTitle: payload.title || 'Untitled',
    subjectType: payload.entityType,
    watchedAt: date,
  });

  primePollingSubscription(buildMediaCollectionStatusSubscriptionKey('watched', userId, mediaKey), {
    isWatched: true,
    watched,
  });
  invalidatePollingSubscription(
    getWatchDiarySubscriptionKey({
      episodeNumber: isEpisode ? episodeNumber : null,
      media,
      seasonNumber: isEpisode ? resolvedSeasonNumber : null,
      userId,
    }),
    { refetch: true },
  );
  invalidatePollingSubscription(getWatchDiarySubscriptionKey({ media, userId }), { refetch: true });
  invalidatePollingSubscription(getWatchDiarySubscriptionKey({ userId }), { refetch: true });
  invalidatePollingSubscription(buildUserMediaCollectionSubscriptionKey('watched', userId), {
    refetch: true,
  });
  invalidatePollingSubscription(buildUserMediaCollectionSubscriptionKey('watchlist', userId), {
    refetch: true,
  });
  invalidatePollingSubscription(
    buildMediaCollectionStatusSubscriptionKey('watchlist', userId, mediaKey),
    { payload: { isInWatchlist: false, item: null } },
  );

  return { entryId: result?.entry_id || result?.entryId || null, result, watched };
}
