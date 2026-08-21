'use client';

import { normalizeLowerValue } from '@/shared/normalize';

export function normalizeStoredEmail(value) {
  return normalizeLowerValue(value);
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function clearSessionStorageValue(storageKey) {
  if (canUseSessionStorage()) window.sessionStorage.removeItem(storageKey);
}

export function readSessionStorageJson(storageKey, isValidPayload) {
  if (!canUseSessionStorage()) return null;
  try {
    const rawValue = window.sessionStorage.getItem(storageKey);
    if (!rawValue) return null;
    const payload = JSON.parse(rawValue);
    const isExpired =
      payload?.expiresAt &&
      Number(payload.expiresAt) > 0 &&
      Number(payload.expiresAt) <= Date.now();
    if (isExpired || (typeof isValidPayload === 'function' && !isValidPayload(payload))) {
      clearSessionStorageValue(storageKey);
      return null;
    }
    return payload;
  } catch {
    clearSessionStorageValue(storageKey);
    return null;
  }
}

export function writeSessionStorageJson(storageKey, payload) {
  if (canUseSessionStorage()) window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
}

const PENDING_STORAGE_KEY = 'tvizzie:pending-account-bootstrap';
const PENDING_PROFILE_TTL_MS = 10 * 60 * 1000;

export function setPendingAccountBootstrap(payload = {}) {
  const email = normalizeStoredEmail(payload.email);
  const username = String(payload.username || '').trim();
  const displayName = String(payload.displayName || '').trim() || username;

  if (!email || !username) {
    clearSessionStorageValue(PENDING_STORAGE_KEY);
    return;
  }

  writeSessionStorageJson(PENDING_STORAGE_KEY, {
    createdAt: Date.now(),
    displayName,
    email,
    expiresAt: Date.now() + PENDING_PROFILE_TTL_MS,
    username,
  });
}

export function getPendingAccountBootstrap(user = null) {
  const payload = readSessionStorageJson(PENDING_STORAGE_KEY, (p) =>
    Boolean(p?.email && p?.username),
  );
  if (!payload) return null;
  if (!user?.email) return payload;
  return normalizeStoredEmail(user.email) === normalizeStoredEmail(payload.email) ? payload : null;
}

export function clearPendingAccountBootstrap() {
  clearSessionStorageValue(PENDING_STORAGE_KEY);
}
