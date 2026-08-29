'use client';

import { createAccountAdapter, createAccountClient } from '@/modules/account';
import { requestJson } from '@/shared';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/client';
import { subscribeToPublicLiveEvent } from '@/infrastructure/realtime/client';
import {
  buildProfileRealtimeTopic,
  PROFILE_LIVE_EVENT_TYPE,
} from '@/infrastructure/realtime/client';
import { validateUsername } from '@/domains/account/utils/validation';
import { cleanString, normalizeValue } from '@/shared';
import { isValidUrl } from '@/shared';
import {
  ensureAccountProfile,
  fetchAccountProfileByHandle,
  fetchCurrentAccountProfile,
  saveAccountProfile,
  searchAccountProfiles,
  syncAccountProfileEmail,
} from './profile-api';

export function normalizeOptionalUrl(value) {
  const normalized = cleanString(value);
  if (!normalized) return null;
  if (!isValidUrl(normalized)) {
    throw new Error('Image URLs must start with http:// or https://');
  }
  return normalized;
}

export function createUserIdentity(user = {}) {
  const metadata = user.metadata || user.user_metadata || {};

  return {
    displayName:
      user.displayName ||
      user.name ||
      metadata.display_name ||
      metadata.full_name ||
      metadata.name ||
      user.email ||
      'Anonymous User',
    email: user.email || null,
    id: user.id || user.uid || null,
  };
}

export function normalizeMediaTarget(value) {
  const normalized = cleanString(value).toLowerCase();
  if (normalized === 'avatar') return 'avatar';
  if (normalized === 'logo' || normalized === 'banner') return 'banner';
  throw new Error('Media target must be avatar or logo');
}

export function normalizeEmailAddress(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

const ACCOUNT_RESOLVE_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_ACCOUNT_RESOLVE_CACHE_ENTRIES = 200;
const accountResolveRequestCache = new Map();
const currentAccountReadInFlight = new Map();

function cacheAccountResolution(username, value) {
  accountResolveRequestCache.set(username, value);

  if (accountResolveRequestCache.size > MAX_ACCOUNT_RESOLVE_CACHE_ENTRIES) {
    accountResolveRequestCache.delete(accountResolveRequestCache.keys().next().value);
  }
}

export async function getUserAccount(userId) {
  if (!userId) return null;

  const existingRequest = currentAccountReadInFlight.get(userId);
  if (existingRequest) return existingRequest;

  const request = fetchCurrentAccountProfile()
    .then((payload) => {
      const profile = payload?.profile || null;

      if (profile?.id && profile.id !== userId) {
        throw new Error('Current account does not match the requested account');
      }

      return profile;
    })
    .finally(() => {
      currentAccountReadInFlight.delete(userId);
    });

  currentAccountReadInFlight.set(userId, request);
  return request;
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

  const inFlightPromise = fetchAccountProfileByHandle(normalizedUsername)
    .then((payload) => {
      const userId = payload?.profile?.id || payload?.userId || null;
      cacheAccountResolution(normalizedUsername, {
        expiresAt: Date.now() + ACCOUNT_RESOLVE_CACHE_TTL_MS,
        inFlightPromise: null,
        value: userId,
      });
      return userId;
    })
    .catch((error) => {
      accountResolveRequestCache.delete(normalizedUsername);

      if (Number(error?.status) === 404) {
        cacheAccountResolution(normalizedUsername, {
          expiresAt: Date.now() + ACCOUNT_RESOLVE_CACHE_TTL_MS,
          inFlightPromise: null,
          value: null,
        });
        return null;
      }

      throw error;
    });

  cacheAccountResolution(normalizedUsername, {
    expiresAt: now + ACCOUNT_RESOLVE_CACHE_TTL_MS,
    inFlightPromise,
    value: undefined,
  });

  return inFlightPromise;
}

export async function getUserAccountByUsername(username) {
  const normalizedUsername = validateUsername(username);
  const payload = await fetchAccountProfileByHandle(normalizedUsername);
  return payload?.profile || null;
}

export async function searchUserAccounts(searchTerm, options = {}) {
  const rawSearchTerm = cleanString(searchTerm);
  if (!rawSearchTerm) return [];

  const payload = await searchAccountProfiles({
    limitCount: options.limitCount ?? null,
    searchTerm: rawSearchTerm,
  });

  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function requestEnsureUserAccount({ displayName, email, username }) {
  void email;
  return ensureAccountProfile({ displayName, username });
}

export async function requestUpdateUserAccount({
  avatarUrl,
  bannerUrl,
  description,
  displayName,
  isPrivate,
  username,
}) {
  const patch = {
    avatarUrl,
    bannerUrl,
    description,
    displayName,
    isPrivate,
    username,
  };

  return saveAccountProfile(patch);
}

export async function requestSyncUserAccountEmail({ email }) {
  void email;
  return syncAccountProfileEmail();
}

const ACCOUNT_SUBSCRIPTION_INTERVAL_MS = 3 * 60 * 1000;
const ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 15 * 60 * 1000;
const ACCOUNT_REFRESH_TIMERS = new Map();
const DEFAULT_REFRESH_DELAY_MS = 250;

export function getUserAccountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', { userId });
}

export function getAccountProfileByHandleSubscriptionKey(handle) {
  return buildPollingSubscriptionKey('account:handle', { handle: validateUsername(handle) });
}

export function primeUserAccount(userId, profile) {
  if (!userId || !profile) return;
  primePollingSubscription(getUserAccountSubscriptionKey(userId), profile, { emit: false });
}

export function primeUserAccountByUsername(username, profile) {
  if (!username || !profile) return;
  primePollingSubscription(getAccountProfileByHandleSubscriptionKey(username), profile, {
    emit: false,
  });
}

export function subscribeToUserAccount(userId, callback, options = {}) {
  const subscriptionKey = getUserAccountSubscriptionKey(userId);
  const unsubscribeData = createPollingSubscription(() => getUserAccount(userId), callback, {
    ...options,
    hiddenIntervalMs: options.hiddenIntervalMs ?? ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
    intervalMs: options.intervalMs ?? ACCOUNT_SUBSCRIPTION_INTERVAL_MS,
    subscriptionKey,
  });
  const unsubscribeLive = subscribeToPublicLiveEvent(
    buildProfileRealtimeTopic(userId),
    PROFILE_LIVE_EVENT_TYPE,
    () => invalidatePollingSubscription(subscriptionKey, { refetch: true }),
  );

  return () => {
    unsubscribeLive();
    unsubscribeData();
  };
}

export function subscribeToUserAccountByUsername(username, callback, options = {}) {
  const normalizedUsername = validateUsername(username);
  const subscriptionKey = getAccountProfileByHandleSubscriptionKey(normalizedUsername);
  const realtimeProfileReference =
    normalizeValue(options.realtimeProfileReference) || normalizedUsername;

  const unsubscribeData = createPollingSubscription(
    () => getUserAccountByUsername(normalizedUsername),
    callback,
    {
      ...options,
      hiddenIntervalMs: options.hiddenIntervalMs ?? ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
      intervalMs: options.intervalMs ?? ACCOUNT_SUBSCRIPTION_INTERVAL_MS,
      subscriptionKey,
    },
  );
  const unsubscribeLive = subscribeToPublicLiveEvent(
    buildProfileRealtimeTopic(realtimeProfileReference),
    PROFILE_LIVE_EVENT_TYPE,
    () => invalidatePollingSubscription(subscriptionKey, { refetch: true }),
  );

  return () => {
    unsubscribeLive();
    unsubscribeData();
  };
}

export function getAccountSummarySubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', { userId });
}

export function refreshAccountSummaryNow(userId) {
  const normalizedUserId = cleanString(userId);
  if (!normalizedUserId) return;
  const key = getAccountSummarySubscriptionKey(normalizedUserId);
  invalidatePollingSubscription(key, { refetch: true });
}

export function scheduleAccountSummaryRefresh(userId, { delayMs = DEFAULT_REFRESH_DELAY_MS } = {}) {
  const normalizedUserId = cleanString(userId);
  if (!normalizedUserId) return;

  const existingTimer = ACCOUNT_REFRESH_TIMERS.get(normalizedUserId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(
    () => {
      ACCOUNT_REFRESH_TIMERS.delete(normalizedUserId);
      refreshAccountSummaryNow(normalizedUserId);
    },
    Math.max(0, Math.floor(Number(delayMs) || DEFAULT_REFRESH_DELAY_MS)),
  );

  ACCOUNT_REFRESH_TIMERS.set(normalizedUserId, timer);
}

export async function ensureUserAccount(user = {}, options = {}) {
  const identity = createUserIdentity(user);
  const preferredDisplayName = cleanString(options.displayName) || null;
  const preferredUsername =
    options.username !== undefined && options.username !== null
      ? validateUsername(options.username)
      : null;

  if (!identity.id) throw new Error('Authenticated user is required to bootstrap an account');

  const existingProfile = await getUserAccount(identity.id).catch(() => null);
  if (existingProfile?.id) {
    primeUserAccount(identity.id, existingProfile);
    return existingProfile;
  }

  const payload = await requestEnsureUserAccount({
    displayName: preferredDisplayName || identity.displayName,
    email: identity.email || null,
    username: preferredUsername,
  });
  const profile = payload?.profile;
  if (!profile) throw new Error('Could not generate an available username for this account');

  primeUserAccount(identity.id, profile);
  return profile;
}

export async function updateUserAccount({ userId, updates = {} }) {
  if (!userId) throw new Error('Authenticated user is required to update the account');

  const payload = await requestUpdateUserAccount({
    avatarUrl:
      updates.avatarUrl !== undefined ? normalizeOptionalUrl(updates.avatarUrl) : undefined,
    bannerUrl:
      updates.bannerUrl !== undefined ? normalizeOptionalUrl(updates.bannerUrl) : undefined,
    description: updates.description !== undefined ? cleanString(updates.description) : undefined,
    displayName:
      updates.displayName !== undefined
        ? cleanString(updates.displayName) || 'Anonymous User'
        : undefined,
    isPrivate: updates.isPrivate !== undefined ? Boolean(updates.isPrivate) : undefined,
    username: updates.username !== undefined ? validateUsername(updates.username) : undefined,
  });
  const profile = payload?.profile;
  if (!profile) throw new Error('Account update failed');

  primeUserAccount(userId, profile);
  return profile;
}

export async function uploadAccountMediaFile({ file, target = 'avatar' }) {
  if (!file || typeof file !== 'object') throw new Error('Select an image file');

  const normalizedTarget = normalizeMediaTarget(target);
  const formData = new FormData();
  formData.set('target', normalizedTarget);
  formData.set('file', file);

  const payload = await requestJson('/api/account/media', {
    body: formData,
    fallbackMessage: 'Image upload failed',
    method: 'POST',
  });

  const mediaResult = payload?.result || payload || {};
  const url = cleanString(payload?.url || mediaResult?.url);
  if (!url) throw new Error('Image upload returned an invalid URL');

  return {
    bucket: cleanString(payload?.bucket || mediaResult?.bucket) || null,
    path: cleanString(payload?.path || mediaResult?.path) || null,
    url,
  };
}

export async function syncUserAccountEmail({ userId, email }) {
  if (!userId) throw new Error('Authenticated user is required to sync email');
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  const payload = await requestSyncUserAccountEmail({ email: normalizedEmail });
  const profile = payload?.profile;
  if (!profile) throw new Error('Email could not be synced');

  primeUserAccount(userId, profile);
  return profile;
}

export const ACCOUNT_ADAPTER = createAccountAdapter({
  ensureAccount: ensureUserAccount,
  getAccount: getUserAccount,
  getAccountByUsername: getUserAccountByUsername,
  getAccountIdByUsername: getUserIdByUsername,
  primeAccount: primeUserAccount,
  primeAccountByUsername: primeUserAccountByUsername,
  searchAccounts: searchUserAccounts,
  subscribeToAccount: subscribeToUserAccount,
  subscribeToAccountByUsername: subscribeToUserAccountByUsername,
  syncAccountEmail: syncUserAccountEmail,
  updateAccount: updateUserAccount,
  validateUsername,
});

export const ACCOUNT_CLIENT = createAccountClient(ACCOUNT_ADAPTER);

export const ACCOUNT_PROVIDER_CONFIG = {
  adapter: ACCOUNT_ADAPTER,
};
