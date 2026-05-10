import { requestApiJson } from '@/core/services/shared/api-request.service';
import { resolveLimitCount } from '@/core/services/shared/supabase-media-utils.service';

export async function fetchUserLists(userId, options = {}) {
  if (!userId) {
    return [];
  }

  const resolvedLimitCount = resolveLimitCount(options.limitCount, 0, 50) || null;
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: resolvedLimitCount,
      limitCount: resolvedLimitCount,
      resource: 'lists',
      userId,
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchListById(userId, listId) {
  const payload = await requestApiJson('/api/collections', {
    query: {
      listId,
      resource: 'list-by-id',
      userId,
    },
  });

  return payload?.data || null;
}

export async function fetchListBySlug(userId, slug) {
  const payload = await requestApiJson('/api/collections', {
    query: {
      resource: 'list-by-slug',
      slug,
      userId,
    },
  });

  return payload?.data || null;
}

export async function fetchLikedLists(userId, options = {}) {
  if (!userId) {
    return [];
  }

  const resolvedLimitCount = resolveLimitCount(options.limitCount, 0, 50) || null;
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: resolvedLimitCount,
      limitCount: resolvedLimitCount,
      resource: 'liked-lists',
      userId,
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function fetchListItems(userId, listId, options = {}) {
  if (!userId || !listId) {
    return [];
  }

  const resolvedLimitCount = resolveLimitCount(options.limitCount, 0, 50) || null;
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: resolvedLimitCount,
      listId,
      limitCount: resolvedLimitCount,
      resource: 'list-items',
      userId,
    },
  });

  return Array.isArray(payload?.data) ? payload.data : [];
}
