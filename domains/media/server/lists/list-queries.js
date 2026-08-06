import { fetchCollectionResource } from '@/domains/account/client';
import { requestApiJson } from '@/infrastructure/http/api-request-service';

export async function fetchUserLists(userId, options = {}) {
  return fetchCollectionResource('lists', userId, options);
}

import { getAccountCollectionsServer } from '@/domains/account/api/collections.server';

export async function fetchListById(userId, listId) {
  const res = await getAccountCollectionsServer({
    listId,
    resource: 'list-by-id',
    userId,
  });

  return res?.data || null;
}

export async function fetchListBySlug(userId, slug) {
  const res = await getAccountCollectionsServer({
    resource: 'list-by-slug',
    slug,
    userId,
  });

  return res?.data || null;
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
