import { scheduleAccountSummaryRefresh } from './account-summary.service.js';
import { requestApiJson } from './api-request.service.js';
import { buildPollingSubscriptionKey } from './polling-subscription.service.js';
import { assertSupabaseResult, getSupabaseClient } from './supabase-data.service.js';
import { resolveLimitCount } from './supabase-media-utils.service.js';

export function resolveMediaCollectionRpcRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  if (data && typeof data === 'object') {
    return data;
  }

  return null;
}

export function buildMediaCollectionIdentity(media) {
  return {
    entityId: media?.entityId ?? media?.id ?? null,
    entityType: media?.entityType ?? media?.media_type ?? null,
  };
}

export function buildMediaCollectionStatusSubscriptionKey(scope, { media, userId }, extras = null) {
  return buildPollingSubscriptionKey(`${scope}:status`, {
    media: buildMediaCollectionIdentity(media),
    userId,
    ...(extras || {}),
  });
}

export function buildUserMediaCollectionSubscriptionKey(scope, userId, extras = null) {
  return buildPollingSubscriptionKey(`${scope}:user`, {
    userId,
    ...(extras || {}),
  });
}

export function refreshMediaCollectionAccountSummary(userId) {
  if (userId) {
    scheduleAccountSummaryRefresh(userId);
  }
}

export function createMediaCollectionToggleRpcParams({ row = {}, userId, extras = {} } = {}) {
  return {
    p_backdrop_path: row.backdrop_path || null,
    p_entity_id: row.entity_id || null,
    p_entity_type: row.entity_type || null,
    p_media_key: row.media_key || null,
    p_payload: row.payload || {},
    p_poster_path: row.poster_path || null,
    p_title: row.title || null,
    p_user_id: userId || null,
    ...(extras || {}),
  };
}

export async function executeMediaCollectionRpc(functionName, params, fallbackMessage, client = null) {
  const resolvedClient = client || getSupabaseClient();
  const result = await resolvedClient.rpc(functionName, params);

  assertSupabaseResult(result, fallbackMessage);

  return resolveMediaCollectionRpcRow(result.data);
}

export async function fetchMediaCollectionStatus({ emptyValue, media, mediaKey, resource, userId }) {
  if (!userId || !media) {
    return emptyValue;
  }

  const payload = await requestApiJson('/api/collections', {
    query: {
      ...buildMediaCollectionIdentity(media),
      mediaKey,
      resource,
      userId,
    },
  });

  return payload?.data || emptyValue;
}

export async function fetchUserMediaCollection(resource, userId, options = {}) {
  if (!userId) {
    return [];
  }

  const limitCount = resolveLimitCount(options.limitCount, 0, 50) || null;
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: limitCount,
      limitCount,
      resource,
      userId,
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchCollectionResource(resource, userId, options = {}, extraQuery = {}) {
  if (!userId) {
    return [];
  }

  const limitCount = resolveLimitCount(options.limitCount, 0, 50) || null;
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: limitCount,
      limitCount,
      resource,
      userId,
      ...(extraQuery || {}),
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}
