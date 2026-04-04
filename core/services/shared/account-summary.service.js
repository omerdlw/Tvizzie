'use client';

import {
  buildPollingSubscriptionKey,
  invalidatePollingSubscription,
} from '@/core/services/shared/polling-subscription.service';

const ACCOUNT_REFRESH_TIMERS = new Map();
const DEFAULT_REFRESH_DELAY_MS = 250;

function normalizeDelayMs(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_REFRESH_DELAY_MS;
  }

  return Math.floor(parsed);
}

function normalizeUserId(value) {
  return String(value || '').trim();
}

export function getAccountSummarySubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', {
    userId,
  });
}

export function refreshAccountSummaryNow(userId) {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return;
  }

  const key = getAccountSummarySubscriptionKey(normalizedUserId);
  invalidatePollingSubscription(key, {
    refetch: true,
  });
}

export function scheduleAccountSummaryRefresh(userId, { delayMs = DEFAULT_REFRESH_DELAY_MS } = {}) {
  const normalizedUserId = normalizeUserId(userId);

  if (!normalizedUserId) {
    return;
  }

  const existingTimer = ACCOUNT_REFRESH_TIMERS.get(normalizedUserId);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    ACCOUNT_REFRESH_TIMERS.delete(normalizedUserId);
    refreshAccountSummaryNow(normalizedUserId);
  }, normalizeDelayMs(delayMs));

  ACCOUNT_REFRESH_TIMERS.set(normalizedUserId, timer);
}
