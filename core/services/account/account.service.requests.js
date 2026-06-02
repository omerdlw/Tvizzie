'use client';

import { requestApiJson } from '@/core/services/shared/client';
import { cleanString } from '@/core/utils/string';
import { validateUsername } from '@/core/utils/account';

const ACCOUNT_RESOLVE_CACHE_TTL_MS = 5 * 60 * 1000;
const accountResolveRequestCache = new Map();

export async function getUserAccount(userId) {
  if (!userId) {
    return null;
  }

  const payload = await requestApiJson('/api/account/profile', {
    query: {
      userId,
    },
  });

  return payload?.profile || null;
}

export async function getUserIdByUsername(username) {
  const normalizedUsername = validateUsername(username);
  const now = Date.now();
  const cachedEntry = accountResolveRequestCache.get(normalizedUsername);

  if (cachedEntry?.value !== undefined && (cachedEntry?.expiresAt || 0) > now) {
    return cachedEntry.value;
  }

  if (cachedEntry?.inFlightPromise) {
    return cachedEntry.inFlightPromise;
  }

  const inFlightPromise = Promise.resolve()
    .then(() =>
      requestApiJson('/api/account/resolve', {
        query: {
          username: normalizedUsername,
        },
      })
    )
    .then((payload) => {
      const userId = payload?.userId || null;

      accountResolveRequestCache.set(normalizedUsername, {
        expiresAt: Date.now() + ACCOUNT_RESOLVE_CACHE_TTL_MS,
        inFlightPromise: null,
        value: userId,
      });

      return userId;
    })
    .catch((error) => {
      accountResolveRequestCache.delete(normalizedUsername);
      throw error;
    });

  accountResolveRequestCache.set(normalizedUsername, {
    expiresAt: now + ACCOUNT_RESOLVE_CACHE_TTL_MS,
    inFlightPromise,
    value: undefined,
  });

  return inFlightPromise;
}

export async function getUserAccountByUsername(username) {
  const normalizedUsername = validateUsername(username);
  const payload = await requestApiJson('/api/account/profile', {
    query: {
      username: normalizedUsername,
    },
  });

  return payload?.profile || null;
}

export async function searchUserAccounts(searchTerm, options = {}) {
  const rawSearchTerm = cleanString(searchTerm);

  if (!rawSearchTerm) {
    return [];
  }

  const payload = await requestApiJson('/api/account/search', {
    query: {
      limitCount: options.limitCount ?? null,
      searchTerm: rawSearchTerm,
    },
    retryCount: options.retryCount ?? 0,
    timeoutMs: options.timeoutMs ?? 5000,
  });

  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function requestEnsureUserAccount({ avatarUrl, displayName, email, userId, username }) {
  return requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'ensure',
      avatarUrl,
      displayName,
      email,
      userId,
      username,
    },
  });
}

export async function requestUpdateUserAccount({
  avatarUrl,
  bannerUrl,
  description,
  displayName,
  isPrivate,
  userId,
  username,
}) {
  return requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'update',
      avatarUrl,
      bannerUrl,
      description,
      displayName,
      isPrivate,
      userId,
      username,
    },
  });
}

export async function requestSyncUserAccountEmail({ email, userId }) {
  return requestApiJson('/api/account/profile', {
    method: 'POST',
    body: {
      action: 'sync-email',
      email,
      userId,
    },
  });
}
