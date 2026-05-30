'use client';

import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  primePollingSubscription,
} from '@/core/services/shared/client';

const ACCOUNT_SUBSCRIPTION_INTERVAL_MS = 2500;
const ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 8000;

export function getUserAccountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', {
    userId,
  });
}

export function primeUserAccount(userId, profile) {
  if (!userId || !profile) {
    return;
  }

  primePollingSubscription(getUserAccountSubscriptionKey(userId), profile, {
    emit: false,
  });
}

export function subscribeToUserAccount(userId, callback, loader, options = {}) {
  return createPollingSubscription(() => loader(userId), callback, {
    ...options,
    hiddenIntervalMs: options.hiddenIntervalMs ?? ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
    intervalMs: options.intervalMs ?? ACCOUNT_SUBSCRIPTION_INTERVAL_MS,
    subscriptionKey: getUserAccountSubscriptionKey(userId),
  });
}
