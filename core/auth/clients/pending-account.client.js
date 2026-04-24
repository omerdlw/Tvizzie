'use client';

import {
  clearSessionStorageValue,
  normalizeStoredEmail,
  readSessionStorageJson,
  writeSessionStorageJson,
} from '@/core/auth/clients/session-storage.client';

const STORAGE_KEY = 'tvizzie:pending-account-bootstrap';
const PENDING_PROFILE_TTL_MS = 10 * 60 * 1000;

function readPendingProfile() {
  return readSessionStorageJson(STORAGE_KEY, (payload) => Boolean(payload?.email && payload?.username));
}

export function setPendingAccountBootstrap(payload = {}) {
  const email = normalizeStoredEmail(payload.email);
  const username = String(payload.username || '').trim();
  const displayName = String(payload.displayName || '').trim() || username;

  if (!email || !username) {
    clearSessionStorageValue(STORAGE_KEY);
    return;
  }

  writeSessionStorageJson(
    STORAGE_KEY,
    {
      createdAt: Date.now(),
      displayName,
      email,
      expiresAt: Date.now() + PENDING_PROFILE_TTL_MS,
      username,
    }
  );
}

export function getPendingAccountBootstrap(user = null) {
  const payload = readPendingProfile();

  if (!payload) {
    return null;
  }

  if (!user?.email) {
    return payload;
  }

  return normalizeStoredEmail(user.email) === normalizeStoredEmail(payload.email) ? payload : null;
}

export function clearPendingAccountBootstrap() {
  clearSessionStorageValue(STORAGE_KEY);
}
