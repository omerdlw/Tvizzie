'use client';

import {
  clearPendingAccountBootstrap,
  createCsrfHeaders,
  getPendingAccountBootstrap,
} from '@/domains/auth/client';
import { ensureAuthCsrfToken } from '@/core/modules/auth/http.client';
import { createAccountAdapter, createAccountClient } from '@/modules/account';
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/infrastructure/http/supabase-data-service';
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
  invalidatePollingSubscription,
  primePollingSubscription,
} from '@/infrastructure/realtime/polling-subscription-service';
import { validateUsername } from '@/domains/account/utils';
import { cleanString, isValidUrl, normalizeValue } from '@/shared/utils';
import {
  resolveAccountByUsername,
  fetchAccountProfile,
  saveAccountProfile,
  searchAccountProfiles,
} from './account-api.client';

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

function cacheAccountResolution(username, value) {
  accountResolveRequestCache.set(username, value);

  if (accountResolveRequestCache.size > MAX_ACCOUNT_RESOLVE_CACHE_ENTRIES) {
    accountResolveRequestCache.delete(accountResolveRequestCache.keys().next().value);
  }
}

export async function getUserAccount(userId) {
  if (!userId) return null;
  const payload = await fetchAccountProfile({ userId });
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

  const inFlightPromise = resolveAccountByUsername(normalizedUsername)
    .then((payload) => {
      const userId = payload?.userId || null;
      cacheAccountResolution(normalizedUsername, {
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

  cacheAccountResolution(normalizedUsername, {
    expiresAt: now + ACCOUNT_RESOLVE_CACHE_TTL_MS,
    inFlightPromise,
    value: undefined,
  });

  return inFlightPromise;
}

export async function getUserAccountByUsername(username) {
  const normalizedUsername = validateUsername(username);
  const payload = await fetchAccountProfile({ username: normalizedUsername });
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
  return saveAccountProfile({
    action: 'ensure',
    displayName,
    email,
    username,
  });
}

export async function requestUpdateUserAccount({
  avatarUrl,
  bannerUrl,
  description,
  displayName,
  isPrivate,
  username,
}) {
  return saveAccountProfile({
    action: 'update',
    avatarUrl,
    bannerUrl,
    description,
    displayName,
    isPrivate,
    username,
  });
}

export async function requestSyncUserAccountEmail({ email }) {
  return saveAccountProfile({ action: 'update', email });
}

const ACCOUNT_SUBSCRIPTION_INTERVAL_MS = 20000;
const ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS = 60000;
const ACCOUNT_REFRESH_TIMERS = new Map();
const DEFAULT_REFRESH_DELAY_MS = 250;

export function getUserAccountSubscriptionKey(userId) {
  return buildPollingSubscriptionKey('account:user', { userId });
}

export function primeUserAccount(userId, profile) {
  if (!userId || !profile) return;
  primePollingSubscription(getUserAccountSubscriptionKey(userId), profile, { emit: false });
}

export function subscribeToUserAccount(userId, callback, options = {}) {
  return createPollingSubscription(() => getUserAccount(userId), callback, {
    ...options,
    hiddenIntervalMs: options.hiddenIntervalMs ?? ACCOUNT_SUBSCRIPTION_HIDDEN_INTERVAL_MS,
    intervalMs: options.intervalMs ?? ACCOUNT_SUBSCRIPTION_INTERVAL_MS,
    subscriptionKey: getUserAccountSubscriptionKey(userId),
  });
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
  const csrfToken = await ensureAuthCsrfToken();
  const formData = new FormData();
  formData.set('target', normalizedTarget);
  formData.set('file', file);

  const response = await fetch('/api/account/media', {
    method: 'POST',
    credentials: 'include',
    headers: createCsrfHeaders({ 'X-CSRF-Token': csrfToken }),
    body: formData,
  });

  const payload = await response.json().catch(() => ({ error: 'Image upload failed' }));
  if (!response.ok) throw new Error(payload?.error || 'Image upload failed');

  const mediaResult = payload?.result || payload || {};
  const url = cleanString(payload?.url || mediaResult?.url);
  if (!url) throw new Error('Image upload returned an invalid URL');

  return {
    bucket: cleanString(payload?.bucket || mediaResult?.bucket) || null,
    path: cleanString(payload?.path || mediaResult?.path) || null,
    url,
  };
}

export async function deleteUsernameMapping(username) {
  if (!username) return;
  const normalized = validateUsername(username);
  const client = getSupabaseClient();
  const result = await client.from('usernames').delete().eq('username_lower', normalized);
  assertSupabaseResult(result, 'Username mapping could not be deleted');
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

function isFreshEmailPasswordSession(user) {
  const providerIds = Array.isArray(user?.metadata?.providerIds) ? user.metadata.providerIds : [];
  const createdAt = Date.parse(user?.metadata?.creationTime || '');
  const lastSignInAt = Date.parse(user?.metadata?.lastSignInTime || '');
  if (!providerIds.includes('password')) return false;
  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) return false;
  return Math.abs(lastSignInAt - createdAt) <= 60 * 1000;
}

function resolveBootstrapPayload(user = null) {
  if (!isFreshEmailPasswordSession(user)) return null;
  return getPendingAccountBootstrap(user);
}

export const ACCOUNT_ADAPTER = createAccountAdapter({
  ensureAccount: ensureUserAccount,
  getAccount: getUserAccount,
  getAccountByUsername: getUserAccountByUsername,
  getAccountIdByUsername: getUserIdByUsername,
  primeAccount: primeUserAccount,
  searchAccounts: searchUserAccounts,
  subscribeToAccount: subscribeToUserAccount,
  syncAccountEmail: syncUserAccountEmail,
  updateAccount: updateUserAccount,
  validateUsername,
});

export const ACCOUNT_CLIENT = createAccountClient(ACCOUNT_ADAPTER);

export const ACCOUNT_PROVIDER_CONFIG = {
  adapter: ACCOUNT_ADAPTER,
  bootstrap: {
    clearPayload: clearPendingAccountBootstrap,
    resolvePayload: resolveBootstrapPayload,
  },
};
