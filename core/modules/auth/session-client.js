'use client';

const CANONICAL_SESSION_CACHE_TTL_MS = 1500;

const CANONICAL_SESSION_STATE = {
  expiresAt: 0,
  inFlightPromise: null,
  value: undefined,
};

function createAnonymousSessionPayload() {
  return {
    status: 'anonymous',
    user: null,
  };
}

export function clearCanonicalSessionPayloadCache() {
  CANONICAL_SESSION_STATE.expiresAt = 0;
  CANONICAL_SESSION_STATE.inFlightPromise = null;
  CANONICAL_SESSION_STATE.value = undefined;
}

export async function fetchCanonicalSessionPayload({ force = false } = {}) {
  const now = Date.now();

  if (!force && CANONICAL_SESSION_STATE.value !== undefined && CANONICAL_SESSION_STATE.expiresAt > now) {
    return CANONICAL_SESSION_STATE.value;
  }

  if (!force && CANONICAL_SESSION_STATE.inFlightPromise) {
    return CANONICAL_SESSION_STATE.inFlightPromise;
  }

  const requestPromise = Promise.resolve()
    .then(async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => createAnonymousSessionPayload());

      if (!response.ok) {
        const error = new Error(payload?.error || 'Session could not be loaded');
        error.code = payload?.code || null;
        error.status = response.status;
        error.data = payload;
        throw error;
      }

      return payload;
    })
    .then((payload) => {
      CANONICAL_SESSION_STATE.value = payload;
      CANONICAL_SESSION_STATE.expiresAt = Date.now() + CANONICAL_SESSION_CACHE_TTL_MS;
      CANONICAL_SESSION_STATE.inFlightPromise = null;
      return payload;
    })
    .catch((error) => {
      CANONICAL_SESSION_STATE.inFlightPromise = null;
      throw error;
    });

  CANONICAL_SESSION_STATE.inFlightPromise = requestPromise;
  return requestPromise;
}

export async function isCanonicalSessionAuthenticated({ force = false } = {}) {
  try {
    const payload = await fetchCanonicalSessionPayload({ force });
    return payload?.status === 'authenticated' && Boolean(payload?.user?.id);
  } catch {
    return false;
  }
}
