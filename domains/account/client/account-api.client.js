'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';
import { ensureAuthCsrfToken } from '@/core/modules/auth/http.client';

function toCollectionQuery({
  entityId = null,
  entityType = null,
  limitCount = null,
  listId = null,
  media = null,
  resource,
  slug = null,
  userId = null,
} = {}) {
  return {
    entityId: entityId || media?.entityId || media?.entity_id || media?.id || null,
    entityType: entityType || media?.entityType || media?.entity_type || media?.media_type || null,
    limitCount,
    listId,
    resource,
    slug,
    userId,
  };
}

export function fetchAccountProfile(query) {
  return requestApiJson('/api/account/profile', { query });
}

export function resolveAccountByUsername(username) {
  return requestApiJson('/api/account/resolve', { query: { username } });
}

export function searchAccountProfiles({ limitCount, searchTerm }) {
  return requestApiJson('/api/account/search', {
    query: { limitCount, searchTerm },
  });
}

export async function saveAccountProfile(body) {
  const csrfToken = await ensureAuthCsrfToken();

  return requestApiJson('/api/account/profile', {
    body,
    headers: { 'X-CSRF-Token': csrfToken },
    method: 'POST',
  });
}

export function fetchAccountResource(params) {
  return requestApiJson('/api/collections', {
    query: toCollectionQuery(params),
  });
}

export function fetchAccountActivityFeed(query) {
  return requestApiJson('/api/account/activity', { query });
}

export function fetchAccountReviewFeed(query) {
  return requestApiJson('/api/account/reviews', { query });
}
