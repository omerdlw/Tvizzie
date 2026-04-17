import { scheduleAccountSummaryRefresh } from '@/core/services/shared/account-summary.service';
import { requestApiJson } from '@/core/services/shared/api-request.service';
import { buildPollingSubscriptionKey } from '@/core/services/shared/polling-subscription.service';
import { resolveLimitCount } from '@/core/services/shared/supabase-media-utils.service';

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
