'use client';

import { buildPollingSubscriptionKey, createPollingSubscription } from '@/core/services/shared/polling-subscription.service.js';
import {
  fetchLikedLists,
  fetchListById,
  fetchListBySlug,
  fetchListItems,
  fetchUserLists,
} from './queries.js';

export function subscribeToUserLists(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  return createPollingSubscription(() => fetchUserLists(userId, options), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:user', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      limitCount: options.limitCount ?? null,
      userId,
    }),
  });
}

export function subscribeToUserList(userId, listId, callback, options = {}) {
  return createPollingSubscription(() => fetchListById(userId, listId), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:item', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      listId,
      userId,
    }),
  });
}

export function subscribeToUserListBySlug(userId, slug, callback, options = {}) {
  return createPollingSubscription(() => fetchListBySlug(userId, slug), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:slug', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      slug,
      userId,
    }),
  });
}

export function subscribeToLikedLists(userId, callback, options = {}) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  return createPollingSubscription(() => fetchLikedLists(userId, options), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:liked', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      userId,
    }),
  });
}

export function subscribeToUserListItems(userId, listId, callback, options = {}) {
  return createPollingSubscription(() => fetchListItems(userId, listId, options), callback, {
    ...options,
    subscriptionKey: buildPollingSubscriptionKey('lists:items', {
      hiddenIntervalMs: options.hiddenIntervalMs ?? null,
      intervalMs: options.intervalMs ?? null,
      listId,
      userId,
    }),
  });
}
