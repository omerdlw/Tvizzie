'use client';

import { createCsrfHeaders } from '@/core/auth/clients';
import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/client';
import { validateUsername } from '@/core/utils/account';
import { cleanString } from '@/core/utils/string';

import {
  createUserIdentity,
  normalizeAccountSnapshot as normalizeAccountSnapshotModel,
  normalizeEmailAddress,
  normalizeMediaTarget,
  normalizeOptionalUrl,
} from './account.service.normalizers';
import {
  getUserAccount as getUserAccountRequest,
  getUserAccountByUsername as getUserAccountByUsernameRequest,
  getUserIdByUsername as getUserIdByUsernameRequest,
  requestEnsureUserAccount,
  requestSyncUserAccountEmail,
  requestUpdateUserAccount,
  searchUserAccounts as searchUserAccountsRequest,
} from './account.service.requests';
import {
  getUserAccountSubscriptionKey as getUserAccountSubscriptionKeyValue,
  primeUserAccount as primeUserAccountValue,
  subscribeToUserAccount as subscribeToUserAccountPolling,
} from './account.service.subscriptions';

export { sanitizeUsername, validateUsername } from '@/core/utils/account';

export function normalizeAccountSnapshot(snapshot) {
  return normalizeAccountSnapshotModel(snapshot);
}

export async function getUserAccount(userId) {
  return getUserAccountRequest(userId);
}

export async function getUserIdByUsername(username) {
  return getUserIdByUsernameRequest(username);
}

export async function getUserAccountByUsername(username) {
  return getUserAccountByUsernameRequest(username);
}

export async function searchUserAccounts(searchTerm, options = {}) {
  return searchUserAccountsRequest(searchTerm, options);
}

export function getUserAccountSubscriptionKey(userId) {
  return getUserAccountSubscriptionKeyValue(userId);
}

export function primeUserAccount(userId, profile) {
  return primeUserAccountValue(userId, profile);
}

export function subscribeToUserAccount(userId, callback, options = {}) {
  return subscribeToUserAccountPolling(userId, callback, getUserAccount, options);
}

export async function ensureUserAccount(user = {}, options = {}) {
  const identity = createUserIdentity(user);
  const preferredDisplayName = cleanString(options.displayName) || null;
  const preferredUsername =
    options.username !== undefined && options.username !== null ? validateUsername(options.username) : null;

  if (!identity.id) {
    throw new Error('Authenticated user is required to bootstrap an account');
  }

  const existingProfile = await getUserAccount(identity.id).catch(() => null);

  if (existingProfile?.id) {
    const normalizedExistingProfile = normalizeAccountSnapshot(existingProfile);

    if (normalizedExistingProfile) {
      primeUserAccount(identity.id, normalizedExistingProfile);
      return normalizedExistingProfile;
    }
  }

  const payload = await requestEnsureUserAccount({
    avatarUrl: identity.avatarUrl ? normalizeOptionalUrl(identity.avatarUrl) : null,
    displayName: preferredDisplayName || identity.displayName,
    email: identity.email || null,
    userId: identity.id,
    username: preferredUsername,
  });
  const profile = normalizeAccountSnapshot(payload?.profile);

  if (!profile) {
    throw new Error('Could not generate an available username for this account');
  }

  primeUserAccount(identity.id, profile);
  return profile;
}

export async function updateUserAccount({ userId, updates = {} }) {
  if (!userId) {
    throw new Error('Authenticated user is required to update the account');
  }

  const payload = await requestUpdateUserAccount({
    avatarUrl: updates.avatarUrl !== undefined ? normalizeOptionalUrl(updates.avatarUrl) : undefined,
    bannerUrl: updates.bannerUrl !== undefined ? normalizeOptionalUrl(updates.bannerUrl) : undefined,
    description: updates.description !== undefined ? cleanString(updates.description) : undefined,
    displayName: updates.displayName !== undefined ? cleanString(updates.displayName) || 'Anonymous User' : undefined,
    isPrivate: updates.isPrivate !== undefined ? Boolean(updates.isPrivate) : undefined,
    userId,
    username: updates.username !== undefined ? validateUsername(updates.username) : undefined,
  });
  const profile = normalizeAccountSnapshot(payload?.profile);

  if (!profile) {
    throw new Error('Account update failed');
  }

  primeUserAccount(userId, profile);
  return profile;
}

export async function uploadAccountMediaFile({ file, target = 'avatar' }) {
  if (!file || typeof file !== 'object') {
    throw new Error('Select an image file');
  }

  const normalizedTarget = normalizeMediaTarget(target);
  const formData = new FormData();

  formData.set('target', normalizedTarget);
  formData.set('file', file);

  const response = await fetch('/api/account/media', {
    method: 'POST',
    credentials: 'include',
    headers: createCsrfHeaders(),
    body: formData,
  });

  const payload = await response.json().catch(() => ({ error: 'Image upload failed' }));

  if (!response.ok) {
    throw new Error(payload?.error || 'Image upload failed');
  }

  const url = cleanString(payload?.url);

  if (!url) {
    throw new Error('Image upload returned an invalid URL');
  }

  return {
    bucket: cleanString(payload?.bucket) || null,
    path: cleanString(payload?.path) || null,
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
  if (!userId) {
    throw new Error('Authenticated user is required to sync email');
  }

  const normalizedEmail = normalizeEmailAddress(email);

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address');
  }

  const payload = await requestSyncUserAccountEmail({
    email: normalizedEmail,
    userId,
  });
  const profile = normalizeAccountSnapshot(payload?.profile);

  if (!profile) {
    throw new Error('Email could not be synced');
  }

  primeUserAccount(userId, profile);
  return profile;
}
