'use client';

import { requestApiJson } from '@/infrastructure/http/api-request-service';

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

export function fetchAccountIdByUsername(username) {
  return requestApiJson('/api/account/resolve', { query: { username } });
}

export function searchAccountProfiles({ limitCount, searchTerm }) {
  return requestApiJson('/api/account/search', {
    query: { limitCount, searchTerm },
  });
}

export function saveAccountProfile(body) {
  return requestApiJson('/api/account/profile', { body, method: 'POST' });
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
