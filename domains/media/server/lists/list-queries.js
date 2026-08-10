import {
  fetchAccountListById,
  fetchAccountListBySlug,
  fetchAccountListItems,
  fetchCollectionResource,
} from '@/domains/account/client';

export async function fetchUserLists(userId, options = {}) {
  return fetchCollectionResource('lists', userId, options);
}

export async function fetchListById(userId, listId) {
  return fetchAccountListById({ listId, userId });
}

export async function fetchListBySlug(userId, slug) {
  return fetchAccountListBySlug({ slug, userId });
}

export async function fetchLikedLists(userId, options = {}) {
  return fetchCollectionResource('liked-lists', userId, options);
}

export async function fetchListItems(userId, listId, options = {}) {
  return fetchAccountListItems({
    limitCount: options.limitCount,
    listId,
    userId,
  });
}
