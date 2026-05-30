import { fetchCollectionResource, requestApiJson } from '@/core/services/shared/client';

export async function fetchUserLists(userId, options = {}) {
  return fetchCollectionResource('lists', userId, options);
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
  return fetchCollectionResource('liked-lists', userId, options);
}

export async function fetchListItems(userId, listId, options = {}) {
  if (!userId || !listId) {
    return [];
  }
  return fetchCollectionResource('list-items', userId, options, {
    listId,
  });
}
