import { getPasswordStatusServer } from '../api/account.server';

// ============================================================================
// 1. ÖNBELLEK VE İSTEK DURUM SAKLAYICILARI (CACHE & STATE)
// ============================================================================

const PASSWORD_STATUS_CACHE_TTL_MS = 4000;
const passwordStatusCache = new Map();
const passwordStatusInFlight = new Map();

function normalizeValue(value) {
  return String(value || '').trim();
}

function getCsrfHeaders() {
  if (typeof document === 'undefined') return {};
  const prefix = 'tvz_auth_csrf=';
  const entry = String(document.cookie || '')
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  const token = entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
  return token ? { 'X-CSRF-Token': token } : {};
}

async function ensureCsrfHeaders() {
  const response = await fetch('/api/auth/csrf', {
    cache: 'no-store',
    credentials: 'include',
  });
  const payload = await response.json().catch(() => null);
  if (payload?.csrfToken) {
    return { 'X-CSRF-Token': payload.csrfToken };
  }

  return getCsrfHeaders();
}

async function postAuthJson(path, body, fallbackMessage) {
  const csrfHeaders = await ensureCsrfHeaders();
  const response = await fetch(path, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({ error: fallbackMessage }));

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.error || fallbackMessage);
    if (payload?.code) error.code = payload.code;
    if (payload?.data) error.data = payload.data;
    throw error;
  }

  return payload;
}

// ============================================================================
// 2. HESAP DURUMU SERVİSİ & ÖNBELLEK ÇÖZÜMLEME
// ============================================================================

function createPasswordStatusCacheKey({ email, identifier, intent }) {
  return JSON.stringify({
    email: normalizeValue(email).toLowerCase(),
    identifier: normalizeValue(identifier).toLowerCase(),
    intent: normalizeValue(intent).toLowerCase() || 'sign-in',
  });
}

function readPasswordStatusCache(cacheKey) {
  const entry = passwordStatusCache.get(cacheKey);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    passwordStatusCache.delete(cacheKey);
    return null;
  }

  return entry.value;
}

function resolvePasswordAccountStatus({ email, identifier, intent }) {
  const cacheKey = createPasswordStatusCacheKey({ email, identifier, intent });
  const cachedValue = readPasswordStatusCache(cacheKey);

  if (cachedValue) {
    return Promise.resolve(cachedValue);
  }

  if (passwordStatusInFlight.has(cacheKey)) {
    return passwordStatusInFlight.get(cacheKey);
  }

  const requestPromise = getPasswordStatusServer({ email, identifier, intent })
    .then((payload) => {
      if (!payload.success) {
        const error = new Error(payload.error || 'Account status could not be resolved');
        if (payload.code) error.code = payload.code;
        if (payload.data) error.data = payload.data;
        throw error;
      }
      passwordStatusCache.set(cacheKey, {
        expiresAt: Date.now() + PASSWORD_STATUS_CACHE_TTL_MS,
        value: payload,
      });
      passwordStatusInFlight.delete(cacheKey);
      return payload;
    })
    .catch((error) => {
      passwordStatusInFlight.delete(cacheKey);
      throw error;
    });

  passwordStatusInFlight.set(cacheKey, requestPromise);
  return requestPromise;
}

// ============================================================================
// 3. DIŞA AKTARILAN API FONKSİYONLARI
// ============================================================================

export function assertPasswordAccountStatus({ email, identifier, intent = 'sign-in' }) {
  return resolvePasswordAccountStatus({ email, identifier, intent });
}

export function assertSignUpEmailAvailable({ email }) {
  return resolvePasswordAccountStatus({ email, intent: 'sign-up' });
}

export async function requestVerificationCode({ email, initial, purpose, forceNew }) {
  return postAuthJson(
    '/api/auth/verification',
    { action: 'send', email, forceNew: forceNew === true, initial: initial === true, purpose },
    'Could not send verification code',
  );
}

export async function verifyCodeRequest({ code, email, purpose, rememberDevice }) {
  return postAuthJson(
    '/api/auth/verification',
    { action: 'verify', code, email, purpose, rememberDevice: rememberDevice === true },
    'Verification failed',
  );
}

export async function completeVerifiedSignUp({ email, password, signUpProof, username }) {
  return postAuthJson(
    '/api/auth/sign-up/complete',
    { email, password, signUpProof, username },
    'Sign-up could not be completed',
  );
}

export async function completePasswordReset({ email, newPassword, passwordResetProof, token }) {
  return postAuthJson(
    '/api/auth/password-reset/complete',
    { email, newPassword, token: token || passwordResetProof },
    'Password reset failed',
  );
}
