'use client';

export function normalizeStoredEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function clearSessionStorageValue(storageKey) {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(storageKey);
}

export function readSessionStorageJson(storageKey, isValidPayload) {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    const payload = JSON.parse(rawValue);
    const isExpired = payload?.expiresAt && Number(payload.expiresAt) > 0 && Number(payload.expiresAt) <= Date.now();

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
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
}
