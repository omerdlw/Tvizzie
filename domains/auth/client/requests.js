import { completeSignUpServer } from '../api/sign-up.server';
import { completePasswordResetServer } from '../api/password-reset.server';
import { requestVerificationCodeServer, verifyCodeServer } from '../api/verification.server';
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

function resolvePasswordAccountStatus({ email, identifier, intent, userId }) {
  const cacheKey = createPasswordStatusCacheKey({ email, identifier, intent });
  const cachedValue = readPasswordStatusCache(cacheKey);

  if (cachedValue) {
    return Promise.resolve(cachedValue);
  }

  if (passwordStatusInFlight.has(cacheKey)) {
    return passwordStatusInFlight.get(cacheKey);
  }

  const requestPromise = getPasswordStatusServer({ email, identifier, intent, userId })
    .then((payload) => {
      if (!payload.success) {
        throw new Error(payload.error || 'Account status could not be resolved');
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

export function assertPasswordAccountStatus({ email, identifier, intent = 'sign-in', userId }) {
  return resolvePasswordAccountStatus({ email, identifier, intent, userId });
}

export function assertSignUpEmailAvailable({ email }) {
  return resolvePasswordAccountStatus({ email, intent: 'sign-up' });
}

export async function requestVerificationCode({ email, purpose, forceNew }) {
  const result = await requestVerificationCodeServer({ email, purpose, forceNew });
  if (!result.success) throw new Error(result.error || 'Could not send verification code');
  return result;
}

export async function verifyCodeRequest({ code, email, purpose, rememberDevice }) {
  const result = await verifyCodeServer({ code, email, purpose, rememberDevice });
  if (!result.success) throw new Error(result.error || 'Verification failed');
  return result;
}

export async function completeVerifiedSignUp({ email, password, username }) {
  const result = await completeSignUpServer({ email, password, username });
  if (!result.success) throw new Error(result.error || 'Sign-up could not be completed');
  return result;
}

export async function completePasswordReset({ email, newPassword, passwordResetProof, token }) {
  const result = await completePasswordResetServer({ token: token || passwordResetProof, newPassword });
  if (!result.success) throw new Error(result.error || 'Password reset failed');
  return result;
}

